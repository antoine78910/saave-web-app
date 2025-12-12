import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

export async function middleware(req: NextRequest) {
	const res = NextResponse.next()
	console.log('Middleware hit for:', req.nextUrl.pathname)

	try {
		// Redirection automatique : si on est sur app.localhost à la racine, rediriger vers /app
		const hostname = req.nextUrl.hostname
		const pathname = req.nextUrl.pathname
		
		// Si on est sur app.localhost et qu'on est à la racine, rediriger vers /app
		if ((hostname === 'app.localhost' || hostname.startsWith('app.')) && pathname === '/') {
			console.log('Redirecting app.localhost root to /app')
			return NextResponse.redirect(new URL('/app', req.url))
		}

		// Utiliser le helper officiel pour gérer la session et les cookies côté middleware
		const supabase = createMiddlewareClient({ req, res })

		// Debug cookies sans utiliser .keys()
		const cookieNames = req.cookies.getAll().map((c: any) => c.name)
		const supabaseCookies = cookieNames.filter((name: string) => name.startsWith('sb-'))
		console.log('Supabase cookies found:', supabaseCookies)

		const { data: { session } } = await supabase.auth.getSession()
		console.log('Session in middleware:', !!session)

		// Exclure les routes API de la protection (notamment /app/api/inngest pour Inngest)
		const isApiRoute = pathname.startsWith('/api/') || pathname.startsWith('/app/api/')

		// Garde simple basée sur le chemin (pas de redirection cross‑host)
		const protectedPaths = ['/app', '/account', '/billing']
		const isProtectedPath = protectedPaths.some(p => req.nextUrl.pathname.startsWith(p))
		const authPaths = ['/auth', '/auth/callback']
		const isAuthPath = authPaths.some(p => req.nextUrl.pathname.startsWith(p))

		// Si non connecté et accès à une page protégée → /auth (mais pas pour les routes API)
		if (!session && isProtectedPath && !isApiRoute) {
			console.log('Redirecting to /auth - no session for protected path')
			return NextResponse.redirect(new URL('/auth', req.url))
		}

		// Si connecté et tentative d'accès à /auth (hors callback) → /app
		if (session && isAuthPath && req.nextUrl.pathname !== '/auth/callback') {
			console.log('Redirecting to /app - user already logged in')
			return NextResponse.redirect(new URL('/app', req.url))
		}
	} catch (error) {
		console.error('Middleware error:', error)
		// En cas d'erreur dans le middleware, laisser passer la requête
	}

	return res
}

export const config = {
	matcher: [
		/*
		 * Match all request paths except for the ones starting with:
		 * - api (API routes)
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico (favicon file)
		 * - public folder files
		 */
		'/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|ico|svg|mp4|webm|ogg|mp3|wav|txt|json)$).*)',
		// Explicitly include root path
		'/',
	],
}