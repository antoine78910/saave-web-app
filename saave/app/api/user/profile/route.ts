import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs'

// API route pour gérer les profils utilisateur
export async function GET(request: NextRequest) {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    const { data: userData } = await supabase.auth.getUser();
    const sessionUser = userData?.user || null;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id') || sessionUser?.id || '';

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Try profiles table first
    const { data, error } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', userId)
      .maybeSingle();

    if (!error && data) {
      return NextResponse.json({ id: userId, email: sessionUser?.email || '', display_name: data?.display_name || '' });
    }

    // Fallback to auth user metadata
    const display = sessionUser?.user_metadata?.full_name || sessionUser?.user_metadata?.name || '';
    return NextResponse.json({ id: sessionUser?.id || '', email: sessionUser?.email || '', display_name: display });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user_id, display_name } = await request.json();
    const targetId = user_id || user.id;

    if (!targetId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Try to persist in profiles table (preferred)
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: targetId, display_name });

    if (!error) {
      // Also sync auth metadata so the display name is available across the app without reload
      try { await supabase.auth.updateUser({ data: { full_name: display_name, name: display_name } as any }) } catch {}
      return NextResponse.json({ success: true });
    }

    // Fallback: update auth user metadata
    try {
      const upd = await supabase.auth.updateUser({ data: { full_name: display_name, name: display_name } as any });
      if (!upd.error) {
        return NextResponse.json({ success: true, fallback: 'auth_metadata' });
      }
    } catch {}

    // Fallback: use service role if available
    try {
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (serviceKey && url) {
        const admin = createClient(url, serviceKey);
        await admin.auth.admin.updateUserById(targetId, { user_metadata: { full_name: display_name, name: display_name } as any });
        return NextResponse.json({ success: true, fallback: 'admin_metadata' });
      }
    } catch {}

    return NextResponse.json({ error: error?.message || 'update_failed' }, { status: 500 });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}