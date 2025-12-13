import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { upsertProcessingItem, updateProcessingItem } from '@/lib/processing-store'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const { id } = await request.json()
    if (!id) return NextResponse.json({ ok: false, error: 'missing_id' }, { status: 400 })

    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const { data: userData } = await supabase.auth.getUser()
    const user = userData?.user
    if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

    // Mark as cancelled (sticky). Use UPSERT so cancellation is recorded even if the item isn't found (race / R2 read).
    const cancelled_at = new Date().toISOString()
    await upsertProcessingItem(user.id, { id, cancelled: true, status: 'cancelled', processingStep: 'cancelled', cancelled_at })
    await updateProcessingItem(user.id, id, { cancelled: true, status: 'cancelled', processingStep: 'cancelled', cancelled_at })
    
    console.log('🚫 [CANCEL] Bookmark processing cancelled:', id)
    return NextResponse.json({ ok: true, cancelled: true }, { status: 200 })
  } catch (e: any) {
    console.error('❌ [CANCEL] Error:', e)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}


