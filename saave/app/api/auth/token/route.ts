import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

// Returns a short-lived access token for the currently logged-in user (cookie session).
// Used by the browser extension content-script to authenticate background API calls.
export async function GET() {
  try {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error || !session?.access_token) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
    }

    return NextResponse.json({
      ok: true,
      access_token: session.access_token,
      expires_at: session.expires_at ?? null,
      user_id: session.user?.id ?? null,
      email: session.user?.email ?? null,
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'unexpected_error' }, { status: 500 })
  }
}


