import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { getJsonFromR2, putJsonToR2 } from '@/lib/r2'
import { removeProcessingItem as removeProcessingItemMem } from '@/lib/processing-store'
import { getProcessingList } from '@/lib/processing-store'

export const runtime = 'nodejs'

function canonicalizeUrl(raw: string | undefined | null): string {
  if (!raw) return ''
  try {
    const u = new URL(raw)
    const protocol = (u.protocol || 'https:').toLowerCase()
    const hostname = (u.hostname || '').toLowerCase()
    // Drop default ports
    const port = (u.port && !['80','443'].includes(u.port)) ? `:${u.port}` : ''
    // Clean path: remove single trailing slash
    let pathname = u.pathname || '/'
    if (pathname !== '/' && pathname.endsWith('/')) pathname = pathname.slice(0, -1)
    // Remove tracking params and sort
    const params = new URLSearchParams(u.search)
    const drop = ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','gclid','fbclid','ref']
    drop.forEach(k => params.delete(k))
    const sorted = new URLSearchParams()
    Array.from(params.keys()).sort().forEach(k => { const v = params.getAll(k); v.forEach(val => sorted.append(k, val)) })
    const qs = sorted.toString()
    return `${protocol}//${hostname}${port}${pathname}${qs ? `?${qs}` : ''}`
  } catch {
    return (raw || '').trim()
  }
}

export async function GET(request: Request) {
  const started = Date.now()
  const { searchParams } = new URL(request.url)
  const explicitUserId = searchParams.get('user_id') || undefined

  try {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const { data: userData, error: userErr } = await supabase.auth.getUser()
    const user = userData?.user

    const userId = explicitUserId || user?.id
    if (!userId) {
      return NextResponse.json([], { status: 200 })
    }

    const { data, error } = await supabase
      .from('bookmarks')
      .select('id,url,title,description,favicon,thumbnail,tags,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    let results: any[] = Array.isArray(data) ? data : []
    if (error) {
      const r2 = await getJsonFromR2<any[]>(`bookmarks/${userId}.json`)
      results = Array.isArray(r2) ? r2 : []
    }

    // Merge in-progress items from R2 processing store
    try {
      const inProgressList = await getProcessingList(userId)
      console.log('📊 [GET /api/bookmarks] In-progress items:', inProgressList.length, inProgressList.map(i => ({ url: i.url, step: i.processingStep })))
      // Merge by canonical URL; if both loading and saved exist, combine into one
      type Item = any
      const byUrl: Record<string, { loading?: Item; saved?: Item }> = {}
      const add = (it: Item, isLoading: boolean) => {
        const key = canonicalizeUrl(it?.url)
        if (!byUrl[key]) byUrl[key] = {}
        if (isLoading) byUrl[key].loading = it
        else byUrl[key].saved = it
      }
      // Don't merge cancelled processing items into the UI list (cancellation should remove the carcass)
      inProgressList.filter(it => !it?.cancelled && it?.status !== 'cancelled').forEach(it => add(it, true))
      results.forEach(it => add(it, false))

      let merged: Item[] = []
      for (const key of Object.keys(byUrl)) {
        const pair = byUrl[key]
        const loading = pair.loading
        const saved = pair.saved
        if (loading && !saved) {
          merged.push(loading)
        } else if (!loading && saved) {
          merged.push(saved)
        } else if (loading && saved) {
          // Compose one card: keep saved data but overlay loading state and step until finished
          const step = loading.processingStep
          if (step && step !== 'finished') {
            const composed = {
              ...saved,
              // ensure UI shows progress
              status: 'loading',
              processingStep: step,
              processingId: loading.id,
              // prefer richer fields when available
              title: loading.title || saved.title,
              description: loading.description ?? saved.description,
              favicon: loading.favicon ?? saved.favicon,
              thumbnail: loading.thumbnail ?? saved.thumbnail,
            }
            merged.push(composed)
          } else {
            merged.push(saved)
          }
        }
      }
      // Sort: in-progress first, then by created_at desc
      merged = merged.sort((a: any, b: any) => {
        const aLoading = a?.status === 'loading' ? 1 : 0
        const bLoading = b?.status === 'loading' ? 1 : 0
        if (aLoading !== bLoading) return bLoading - aLoading
        const aTime = new Date(a?.created_at || a?.createdAt || 0).getTime()
        const bTime = new Date(b?.created_at || b?.createdAt || 0).getTime()
        return bTime - aTime
      })
      return NextResponse.json(merged, { status: 200 })
    } catch {
      return NextResponse.json(results, { status: 200 })
    }
  } catch (e: any) {
    return NextResponse.json([], { status: 200 })
  }
}

export async function POST(request: Request) {
  const started = Date.now()
  try {
    const body = await request.json()
    const { url, title, description, favicon, thumbnail, tags, user_id } = body || {}

    if (!url || !user_id) {
      return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    const insertRow = {
      url,
      title: title || url,
      description: description || '',
      favicon: favicon || null,
      thumbnail: thumbnail || null,
      tags: Array.isArray(tags) ? tags : [],
      user_id,
    }

    const { data, error } = await supabase
      .from('bookmarks')
      .insert(insertRow)
      .select('*')
      .single()

    if (!error && data) {
      // Sync to R2 cache (best-effort)
      try {
        const r2Key = `bookmarks/${user_id}.json`
        const list = (await getJsonFromR2<any[]>(r2Key)) || []
        const merged = [data, ...list.filter(b => b.id !== data.id)]
        await putJsonToR2(r2Key, merged)
      } catch {}
      return NextResponse.json(data, { status: 200 })
    }
    // R2 JSON fallback persistence
    const r2Key = `bookmarks/${user_id}.json`
    const list = (await getJsonFromR2<any[]>(r2Key)) || []
    const saved = {
      id: Date.now().toString(),
      url,
      title: insertRow.title,
      description: insertRow.description,
      favicon: insertRow.favicon,
      thumbnail: insertRow.thumbnail,
      tags: insertRow.tags,
      user_id,
      created_at: new Date().toISOString(),
    }
    list.unshift(saved)
    await putJsonToR2(r2Key, list)
    return NextResponse.json(saved, { status: 200 })
  } catch (e: any) {
    console.error('POST /api/bookmarks unexpected:', e)
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id') || ''
    const user_id = searchParams.get('user_id') || ''
    if (!id || !user_id) return NextResponse.json({ ok: false }, { status: 400 })

    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('id', id)
      .eq('user_id', user_id)

    if (!error) {
      // Also remove any lingering processing item with same id (e.g., failed/cancelled)
      try { await removeProcessingItemMem(user_id, id) } catch {}
      return NextResponse.json({ ok: true }, { status: 200 })
    }
    console.warn('DELETE /api/bookmarks supabase error, falling back to R2:', error?.message)
    const r2Key = `bookmarks/${user_id}.json`
    const list = (await getJsonFromR2<any[]>(r2Key)) || []
    const next = list.filter((b: any) => b.id !== id)
    await putJsonToR2(r2Key, next)
    // Also try remove from processing store
    try { await removeProcessingItemMem(user_id, id) } catch {}
    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (e: any) {
    console.error('DELETE /api/bookmarks unexpected:', e)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}


