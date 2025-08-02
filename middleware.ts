import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Pages qui nécessitent une authentification
  const protectedPaths = ['/app', '/account', '/billing']
  const isProtectedPath = protectedPaths.some(path => req.nextUrl.pathname.startsWith(path))

  // Pages d'authentification
  const authPaths = ['/auth', '/auth/callback']
  const isAuthPath = authPaths.some(path => req.nextUrl.pathname.startsWith(path))

  // Si l'utilisateur n'est pas connecté et essaie d'accéder à une page protégée
  if (!session && isProtectedPath) {
    return NextResponse.redirect(new URL('/auth', req.url))
  }

  // Si l'utilisateur est connecté et essaie d'accéder à la page d'auth
  if (session && isAuthPath && req.nextUrl.pathname !== '/auth/callback') {
    return NextResponse.redirect(new URL('/app', req.url))
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
    '/((?!api|_next/static|_next/image|favicon.ico|logo.png|.*\\.svg$).*)',
  ],
}