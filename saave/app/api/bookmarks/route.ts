import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const started = Date.now()
  const { searchParams } = new URL(request.url)
  const explicitUserId = searchParams.get('user_id') || undefined

  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const { data: { user } } = await supabase.auth.getUser()

    const userId = explicitUserId || user?.id
    if (!userId) {
      console.log('GET /api/bookmarks: no user, returning empty list')
      return NextResponse.json([], { status: 200 })
    }

    const { data, error } = await supabase
      .from('bookmarks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('GET /api/bookmarks error:', error)
      return NextResponse.json([], { status: 200 })
    }

    console.log('GET /api/bookmarks ok in', Date.now() - started, 'ms, count:', data?.length || 0)
    return NextResponse.json(data || [], { status: 200 })
  } catch (e: any) {
    console.error('GET /api/bookmarks unexpected error:', e)
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

    const cookieStore = cookies()
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

    if (error) {
      console.error('POST /api/bookmarks error:', error)
      return NextResponse.json({ error: 'db_error' }, { status: 500 })
    }

    console.log('POST /api/bookmarks ok in', Date.now() - started, 'ms id:', data?.id)
    return NextResponse.json(data, { status: 200 })
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

    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('id', id)
      .eq('user_id', user_id)

    if (error) {
      console.error('DELETE /api/bookmarks error:', error)
      return NextResponse.json({ ok: false }, { status: 500 })
    }
    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (e: any) {
    console.error('DELETE /api/bookmarks unexpected:', e)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}


