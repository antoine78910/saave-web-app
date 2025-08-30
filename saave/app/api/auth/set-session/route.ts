import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const access_token: string | undefined = body?.access_token
    const refresh_token: string | undefined = body?.refresh_token

    if (!access_token || !refresh_token) {
      return NextResponse.json({ ok: false, error: 'missing_tokens' }, { status: 400 })
    }

    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    const { data, error } = await supabase.auth.setSession({ access_token, refresh_token } as any)

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true, hasSession: !!data?.session })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'unexpected_error' }, { status: 500 })
  }
}


