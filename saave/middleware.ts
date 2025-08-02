import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  
  console.log('Middleware hit for:', req.nextUrl.pathname)
  
  try {
    // Créer le client Supabase avec les mêmes configurations que dans l'app
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "https://bfnkusldtzdpoezqawuu.supabase.co",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmbmt1c2xkdHpkcG9lenFhd3V1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxNjI4ODgsImV4cCI6MjA2NzczODg4OH0.D9yJ6KnuiqryKh6dIE3eVN5F1v72ehFEumhCV8eRQAg",
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        }
      }
    )

    // Récupérer tous les cookies Supabase pour debug
    const cookies = req.cookies
    const cookieNames = Array.from(cookies.keys())
    const supabaseCookies = cookieNames.filter(name => name.startsWith('sb-'))
    console.log('Supabase cookies found:', supabaseCookies)

    // Chercher le cookie d'auth automatiquement
    const authCookieName = cookieNames.find(name => name.includes('auth-token') && !name.includes('code-verifier'))
    const token = authCookieName ? cookies.get(authCookieName)?.value : null

    let session = null
    
    if (token) {
      try {
        // Parser le token JWT pour vérifier s'il est valide
        const tokenData = JSON.parse(token)
        console.log('Token data keys:', Object.keys(tokenData))
        
        if (tokenData.access_token) {
          // Définir la session manuellement
          await supabase.auth.setSession({
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token
          })
          
          const { data } = await supabase.auth.getSession()
          session = data.session
        }
      } catch (e) {
        console.log('Could not parse token:', e)
      }
    }

    console.log('Session in middleware:', !!session)

    // Pages qui nécessitent une authentification
    const protectedPaths = ['/app', '/account', '/billing']
    const isProtectedPath = protectedPaths.some(path => req.nextUrl.pathname.startsWith(path))

    // Pages d'authentification
    const authPaths = ['/auth', '/auth/callback']
    const isAuthPath = authPaths.some(path => req.nextUrl.pathname.startsWith(path))

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
    '/((?!api|_next/static|_next/image|favicon.ico|logo.png|.*\\.svg$).*)',
  ],
}