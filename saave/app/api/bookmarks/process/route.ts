import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { getJsonFromR2, putJsonToR2 } from '@/lib/r2'
import { getProcessingList, upsertProcessingItem, removeProcessingItem, isProcessingCancelled } from '@/lib/processing-store'
import { inngest } from '@/lib/inngest'

export const runtime = 'nodejs'
export const maxDuration = 60

type ProcessStep = 'scraping' | 'metadata' | 'screenshot' | 'describe' | 'summary' | 'tags' | 'saving' | 'finished' | 'error'

function corsHeaders() {
	return {
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Methods': 'POST, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type, Authorization',
		'Access-Control-Max-Age': '86400',
	}
}

export async function OPTIONS() {
	return new NextResponse(null, { status: 204, headers: corsHeaders() as any })
}

async function append(userId: string, item: any) {
	await upsertProcessingItem(userId, item)
}

export async function POST(request: Request) {
	let url: string | undefined
	let canonicalUrl: string | undefined
	let userId = ''
	let id = ''
	const started = Date.now()
	
	try {
		const body = await request.json()
		url = body.url
		const userIdFromBody = body.user_id
		const source = body.source
		
		if (!url) {
			return NextResponse.json({ error: 'missing_url' }, { status: 400, headers: corsHeaders() as any })
		}

		const reqUrl = new URL(request.url)
		const authHeader = request.headers.get('authorization') || request.headers.get('Authorization') || ''
		const token = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : ''

		// Auth path A (extension / API clients): Authorization: Bearer <access_token>
		// This avoids cross-site cookie issues and removes the need to open a Saave tab.
		let supabase: any = null
		if (token) {
			const url = process.env.NEXT_PUBLIC_SUPABASE_URL
			const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
			if (!url || !anon) {
				return NextResponse.json({ error: 'supabase_not_configured' }, { status: 500, headers: corsHeaders() as any })
			}
			supabase = createClient(url, anon, {
				auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
				global: { headers: { Authorization: `Bearer ${token}` } },
			})
			const { data: u, error: uErr } = await supabase.auth.getUser()
			userId = u?.user?.id || ''
			if (uErr || !userId) {
				return NextResponse.json({ error: 'unauthorized' }, { status: 401, headers: corsHeaders() as any })
			}
		} else {
			// Auth path B (webapp): cookie-based session
			const cookieStore = await cookies()
			supabase = createRouteHandlerClient({ cookies: () => cookieStore })
			const { data: { session } } = await supabase.auth.getSession()
			userId = session?.user?.id ?? ''
		}

		const isLocalhost = reqUrl.hostname === 'localhost' || /\.localhost$/i.test(reqUrl.hostname)
		// Legacy dev fallback only (never trust user_id in production)
		if (!userId && userIdFromBody && (process.env.NODE_ENV !== 'production' || isLocalhost)) {
			userId = String(userIdFromBody)
		}
		if (!userId) {
			return NextResponse.json({ error: 'unauthorized' }, { status: 401, headers: corsHeaders() as any })
		}

		// Canonicalize URL
		const canonicalize = (raw: string) => {
			try {
				const u = new URL(raw)
				const protocol = (u.protocol || 'https:').toLowerCase()
				const hostname = (u.hostname || '').toLowerCase().replace(/^www\./, '')
				const port = (u.port && !['80', '443'].includes(u.port)) ? `:${u.port}` : ''
				let pathname = u.pathname || '/'
				if (pathname !== '/' && pathname.endsWith('/')) pathname = pathname.slice(0, -1)
				const params = new URLSearchParams(u.search)
				;['utm_source','utm_medium','utm_campaign','utm_term','utm_content','gclid','fbclid','ref'].forEach(k => params.delete(k))
				const qs = params.toString()
				return `${protocol}//${hostname}${port}${pathname}${qs ? `?${qs}` : ''}`
			} catch {
				return raw
			}
		}
		canonicalUrl = canonicalize(url)
		const domain = new URL(canonicalUrl).hostname.replace('www.', '')

		// Variant list for duplicate checks
		const generateUrlVariants = (normalizedUrl: string): string[] => {
			try {
				const u = new URL(normalizedUrl)
				const host = (u.hostname || '').toLowerCase()
				const canWww = /\./.test(host) && host !== 'localhost' && !/^\d+(\.\d+){3}$/.test(host)
				const hostNoWww = host.replace(/^www\./, '')
				const hostWithWww = canWww ? (hostNoWww.startsWith('www.') ? hostNoWww : `www.${hostNoWww}`) : host
				const variants = new Set<string>()
				const build = (protocol: string, hostname: string) => {
					const port = (u.port && !['80','443'].includes(u.port)) ? `:${u.port}` : ''
					let pathname = u.pathname || '/'
					if (pathname !== '/' && pathname.endsWith('/')) pathname = pathname.slice(0, -1)
					const qs = u.search || ''
					return `${protocol}//${hostname}${port}${pathname}${qs}`
				}
				variants.add(build(u.protocol, hostNoWww))
				if (canWww) variants.add(build(u.protocol, hostWithWww))
				if (u.protocol === 'http:') variants.add(build('https:', hostNoWww))
				if (u.protocol === 'https:') variants.add(build('http:', hostNoWww))
				if (canWww) {
					if (u.protocol === 'http:') variants.add(build('https:', hostWithWww))
					if (u.protocol === 'https:') variants.add(build('http:', hostWithWww))
				}
				return Array.from(variants)
			} catch {
				return [normalizedUrl]
			}
		}
		const urlVariants = generateUrlVariants(canonicalUrl)

		// Duplicate checks (DB)
		try {
			const { data: dupRows, error: dupErr } = await supabase
				.from('bookmarks')
				.select('id,url')
				.eq('user_id', userId)
				.in('url', urlVariants)
				.limit(1)
			if (!dupErr && Array.isArray(dupRows) && dupRows.length > 0) {
				return NextResponse.json({ ok: false, duplicate: true }, { status: 409, headers: corsHeaders() as any })
			}
		} catch {}

		// Duplicate checks (R2 mirror)
		try {
			const r2 = (await getJsonFromR2<any[]>(`bookmarks/${userId}.json`)) || []
			if (Array.isArray(r2) && r2.some(b => urlVariants.includes(String(b?.url || '')))) {
				return NextResponse.json({ ok: false, duplicate: true }, { status: 409, headers: corsHeaders() as any })
			}
		} catch {}

		// Concurrent processing check
		try {
			const list = await getProcessingList(userId)
			if (Array.isArray(list) && list.some(p => urlVariants.includes(String(p?.url || '')))) {
				return NextResponse.json({ ok: true, already_processing: true }, { status: 202, headers: corsHeaders() as any })
			}
		} catch {}

		// Seed in‑progress card
		let title = 'Loading...'
		let description = ''
		let favicon: string | null = null
		let thumbnail: string | null = null
		let tags: string[] = []

		id = `${userId}:${Buffer.from(canonicalUrl).toString('base64').slice(0,24)}`
		const seed = {
			id,
			url: canonicalUrl,
			title,
			description,
			favicon,
			thumbnail,
			tags,
			user_id: userId,
			created_at: new Date().toISOString(),
			status: 'loading',
			processingStep: 'scraping' as ProcessStep,
		}
		await append(userId, seed)

		// Internal origin for API→API calls (force http://localhost in dev for *.localhost)
		let origin = `${reqUrl.protocol}//${reqUrl.host}`
		if (isLocalhost) {
			const portPart = reqUrl.port ? `:${reqUrl.port}` : ''
			origin = `http://localhost${portPart}`
		}

		// cancellable fetch with timeout and cancel polling
		const cancellableFetch = async (input: RequestInfo | URL, init: RequestInit, timeoutMs: number) => {
			const controller = new AbortController()
			const timer = setTimeout(() => controller.abort(), timeoutMs)
			const poll = setInterval(async () => {
				try { 
					if (await isProcessingCancelled(userId!, id)) {
						controller.abort()
					}
				} catch {}
			}, 100)
			try {
				return await fetch(input, { ...init, signal: controller.signal })
			} finally {
				clearTimeout(timer)
				clearInterval(poll)
			}
		}

		// 1) Scrape
		try {
			await append(userId, { ...seed, processingStep: 'scraping', status: 'loading' })
			console.log('🔎 [STEP 1/7] Scraping content...')
			if (await isProcessingCancelled(userId, id)) {
				throw new Error('cancelled')
			}
			let content = ''
			try {
				const endpoint = `${origin}/api/scrape`
				const res = await cancellableFetch(endpoint, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ url: canonicalUrl }),
				}, Number(process.env.SCRAPE_TIMEOUT_MS || 20000))
				const text = await res.text()
				if (res.ok) { try { const json = JSON.parse(text); content = json?.content || '' } catch {} }
			} catch (e: any) {
				// Silent fail, continue without content
			}

			// 2) Metadata
			console.log('🧩 [STEP 2/7] Extracting metadata...')
			await append(userId, { ...seed, processingStep: 'metadata', status: 'loading' })
			if (await isProcessingCancelled(userId, id)) {
				throw new Error('cancelled')
			}
			try {
				const controller = new AbortController()
				const to = setTimeout(() => controller.abort(), Number(process.env.METADATA_TIMEOUT_MS || 15000))
				const endpoint = `${origin}/api/extract-metadata`
				// Pass both URL and scraped content for better description extraction
				const res = await fetch(endpoint, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ url: canonicalUrl, content: content || '' }),
					signal: controller.signal,
				} as RequestInit)
				clearTimeout(to)
				if (res.ok) {
					const data = await res.json()
					title = data?.title || domain
					// Only use description if it's meaningful (at least 20 chars)
					description = (data?.description && data.description.trim().length >= 20) ? data.description.trim() : description || ''
					favicon = data?.favicon || null
					tags = Array.isArray(data?.tags) ? data.tags : []
					console.log('✅ Metadata extracted:', { title: title.substring(0, 50), descriptionLength: description.length, tagsCount: tags.length })
					await append(userId, { ...seed, processingStep: 'metadata', status: 'loading', title, description, favicon, tags })
				} else {
					console.warn('⚠️ Metadata extraction failed:', res.status)
					title = domain
					description = description || ''
					await append(userId, { ...seed, processingStep: 'metadata', status: 'loading', title, description, favicon, tags })
				}
			} catch (e: any) {
				console.warn('⚠️ Metadata extraction error:', e?.message)
				title = domain
				description = description || ''
				await append(userId, { ...seed, processingStep: 'metadata', status: 'loading', title, description, favicon, tags })
			}

			// 3) Screenshot
			console.log('📸 [STEP 3/7] Taking screenshot...')
			await append(userId, { ...seed, processingStep: 'screenshot', status: 'loading', title, description, favicon, tags })
			if (await isProcessingCancelled(userId, id)) {
				throw new Error('cancelled')
			}
			try {
				const endpoint = `${origin}/api/screenshot`
				const res = await cancellableFetch(endpoint, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ url: canonicalUrl }),
				}, Number(process.env.SCREENSHOT_TIMEOUT_MS || 45000))
				const text = await res.text()
				if (res.ok) {
					try {
						const data = JSON.parse(text)
						thumbnail = (data?.url as string) || (data?.screenshot as string) || null
						await append(userId, { ...seed, processingStep: 'screenshot', status: 'loading', title, description, favicon, tags, thumbnail })
					} catch (pe) {
						// Silent fail
					}
				}
			} catch (e: any) {
				// Silent fail, continue without thumbnail
			}

			// 4) Describe (placeholder)
			console.log('📝 [STEP 4/7] AI description...')
			await append(userId, { ...seed, processingStep: 'describe', status: 'loading', title, description, favicon, tags, thumbnail })
			if (await isProcessingCancelled(userId, id)) {
				throw new Error('cancelled')
			}

			// 5) Summary (placeholder)
			console.log('🧠 [STEP 5/7] Generating summary...')
			await append(userId, { ...seed, processingStep: 'summary', status: 'loading', title, description, favicon, tags, thumbnail })
			if (await isProcessingCancelled(userId, id)) {
				throw new Error('cancelled')
			}

			// 6) Tags (placeholder)
			console.log('🏷️  [STEP 6/7] Finding tags...')
			await append(userId, { ...seed, processingStep: 'tags', status: 'loading', title, description, favicon, tags, thumbnail })
			if (await isProcessingCancelled(userId, id)) {
				throw new Error('cancelled')
			}

			// 7) Save
			console.log('💾 [STEP 7/7] Saving to database...')
			await append(userId, { ...seed, processingStep: 'saving', status: 'loading', title, description, favicon, tags, thumbnail })
			if (await isProcessingCancelled(userId, id)) {
				throw new Error('cancelled')
			}
			let saved: any = null
			try {
				const { data, error } = await supabase
					.from('bookmarks')
					.insert({
						url: canonicalUrl,
						title: title || domain,
						description,
						favicon,
						thumbnail,
						tags,
						user_id: userId,
					} as any)
					.select('*')
					.single()
				if (error) throw error
				saved = data
				try {
					const key = `bookmarks/${userId}.json`
					const list = (await getJsonFromR2<any[]>(key)) || []
					const merged = [saved, ...list.filter((b: any) => b.id !== saved.id)]
					await putJsonToR2(key, merged)
				} catch {}
			} catch (saveErr: any) {
				console.warn('⚠️  [/process] DB save failed; fallback to R2:', saveErr?.message || saveErr)
				const key = `bookmarks/${userId}.json`
				const list = (await getJsonFromR2<any[]>(key)) || []
				saved = {
					id: `${Date.now()}`,
					url: canonicalUrl,
					title: title || 'Untitled',
					description,
					favicon,
					thumbnail,
					tags,
					user_id: userId,
					created_at: new Date().toISOString(),
				}
				await putJsonToR2(key, [saved, ...list.filter((b: any) => b.id !== saved.id)])
			}

			// 8) Done
			await append(userId, { ...seed, processingStep: 'finished', status: 'complete', title, description, favicon, tags, thumbnail })
			console.log('✅ BOOKMARK SAVED SUCCESSFULLY')

			// Send Inngest event for bookmark processing (only if key is configured)
			const canSendInngest = Boolean(process.env.INNGEST_EVENT_KEY);
			if (canSendInngest) {
				try {
					await inngest.send({
						name: 'bookmark/process',
						data: {
							bookmarkId: saved.id,
							url: canonicalUrl,
							title: title || domain,
							userId: userId,
							status: 'complete',
							durationMs: Date.now() - started,
						},
					})
					console.log('📤 Inngest event sent for bookmark:', saved.id)
				} catch (inngestError) {
					// Don't fail the request if Inngest fails
					console.warn('⚠️ Failed to send Inngest event:', inngestError)
				}
			} else {
				console.warn('ℹ️ Skipping Inngest send: INNGEST_EVENT_KEY not configured');
			}

			// cleanup in‑memory queue
			try { await removeProcessingItem(userId, id) } catch {}

			return NextResponse.json({ ok: true, id: saved.id, durationMs: Date.now() - started }, { headers: { ...corsHeaders() as any } })
		} catch (e: any) {
			const cancelled = e?.message === 'cancelled'
			if (cancelled) {
				console.log('🚫 PROCESS CANCELLED')
				try { await removeProcessingItem(userId, id) } catch {}
				return NextResponse.json({ ok: false, cancelled: true }, { status: 200, headers: { ...corsHeaders() as any } })
			}
			console.error('❌ ERROR:', e?.message || e)
			
			// Send Inngest event for failed bookmark processing
			const canSendInngest = Boolean(process.env.INNGEST_EVENT_KEY);
			if (canSendInngest) {
				try {
					await inngest.send({
						name: 'bookmark/process',
						data: {
							bookmarkId: id,
							url: canonicalUrl || url,
							userId: userId,
							status: 'error',
							error: e?.message || 'process_failed',
							durationMs: Date.now() - started,
						},
					})
				} catch (inngestError) {
					// Don't fail the request if Inngest fails
					console.warn('⚠️ Failed to send Inngest error event:', inngestError)
				}
			} else {
				console.warn('ℹ️ Skipping Inngest error send: INNGEST_EVENT_KEY not configured');
			}
			
			return NextResponse.json({ ok: false, error: e?.message || 'process_failed' }, { status: 500, headers: { ...corsHeaders() as any } })
		}
	} catch (e: any) {
		console.error('❌ [/process] invalid_json or top‑level error', e?.message || e)
		return NextResponse.json({ error: 'invalid_json' }, { status: 400, headers: { ...corsHeaders() as any } })
	}
}
