import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  console.log('Middleware hit for:', req.nextUrl.pathname)

  try {
    // Utiliser le helper officiel pour gérer la session et les cookies côté middleware
    const supabase = createMiddlewareClient({ req, res })

    // Debug cookies sans utiliser .keys()
    const cookieNames = req.cookies.getAll().map(c => c.name)
    const supabaseCookies = cookieNames.filter(name => name.startsWith('sb-'))
    console.log('Supabase cookies found:', supabaseCookies)

    const { data: { session } } = await supabase.auth.getSession()
    console.log('Session in middleware:', !!session)

    // Pages qui nécessitent une authentification
    const protectedPaths = ['/app', '/account', '/billing']
    const isProtectedPath = protectedPaths.some(path => req.nextUrl.pathname.startsWith(path))

    // Pages d'authentification
    const authPaths = ['/auth', '/auth/callback']
    const isAuthPath = authPaths.some(path => req.nextUrl.pathname.startsWith(path))

    // Rediriger la home "/" vers /app si déjà connecté
    if (session && req.nextUrl.pathname === '/') {
      return NextResponse.redirect(new URL('/app', req.url))
    }

    // Si l'utilisateur n'est pas connecté et essaie d'accéder à une page protégée
    if (!session && isProtectedPath) {
      console.log('Redirecting to /auth - no session for protected path')
      return NextResponse.redirect(new URL('/auth', req.url))
    }

    // Si l'utilisateur est connecté et essaie d'accéder à la page d'auth
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
  ],
}