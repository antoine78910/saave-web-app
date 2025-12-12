import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { putJsonToR2 } from '@/lib/r2'
import { getProcessingList, removeProcessingItem } from '@/lib/processing-store'
import { createClient } from '@supabase/supabase-js'

export async function POST() {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: userData, error: userErr } = await supabase.auth.getUser()
    const user = userData?.user
    if (userErr || !user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const userId = user.id

    try {
      await supabase.from('bookmarks').delete().eq('user_id', userId)
    } catch {}

    try {
      await supabase.from('profiles').delete().eq('id', userId)
    } catch {}

    try {
      const list = await getProcessingList(userId)
      if (Array.isArray(list)) {
        await Promise.all(
          list.map((item: any) => removeProcessingItem(userId, item.id))
        )
      }
    } catch {}

    try {
      await putJsonToR2(`bookmarks/${userId}.json`, [])
    } catch {}

    try {
      await putJsonToR2(`processing/${userId}.json`, [])
    } catch {}

    try {
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      if (serviceKey && supabaseUrl) {
        const admin = createClient(supabaseUrl, serviceKey)
        await admin.auth.admin.deleteUser(userId)
      }
    } catch {}

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}


