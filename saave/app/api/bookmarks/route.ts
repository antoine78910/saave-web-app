import { NextResponse } from 'next/server'

type Bookmark = {
  id: string
  url: string
  title: string
  description?: string
  favicon?: string
  thumbnail?: string
  tags?: string[]
  user_id: string
  created_at?: string
}

// In-memory store for demo/prototype. Replace with DB later.
const store = new Map<string, Bookmark[]>()

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const user_id = searchParams.get('user_id') || ''
  if (!user_id) return NextResponse.json([], { status: 200 })
  return NextResponse.json(store.get(user_id) || [], { status: 200 })
}

export async function POST(request: Request) {
  try {
    const data = (await request.json()) as Bookmark
    if (!data?.user_id || !data?.url) {
      return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
    }
    const list = store.get(data.user_id) || []
    const id = Date.now().toString()
    const saved: Bookmark = {
      id,
      url: data.url,
      title: data.title || data.url,
      description: data.description || '',
      favicon: data.favicon || '',
      thumbnail: data.thumbnail || '',
      tags: Array.isArray(data.tags) ? data.tags : [],
      user_id: data.user_id,
      created_at: new Date().toISOString(),
    }
    list.unshift(saved)
    store.set(data.user_id, list)
    return NextResponse.json(saved, { status: 200 })
  } catch (e) {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const user_id = searchParams.get('user_id') || ''
  const id = searchParams.get('id') || ''
  if (!user_id || !id) return NextResponse.json({ ok: false }, { status: 400 })
  const list = store.get(user_id) || []
  const next = list.filter(b => b.id !== id)
  store.set(user_id, next)
  return NextResponse.json({ ok: true }, { status: 200 })
}


