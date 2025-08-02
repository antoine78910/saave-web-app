import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://bfnkusldtzdpoezqawuu.supabase.co"
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmbmt1c2xkdHpkcG9lenFhd3V1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxNjI4ODgsImV4cCI6MjA2NzczODg4OH0.D9yJ6KnuiqryKh6dIE3eVN5F1v72ehFEumhCV8eRQAg"

// Client-side only supabase instance
export function createBrowserClient() {
  if (typeof window === 'undefined') {
    throw new Error('createBrowserClient can only be called on the client side')
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      storage: window.localStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce'
    }
  })
}

// Safe client that works everywhere
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    persistSession: typeof window !== 'undefined',
    autoRefreshToken: typeof window !== 'undefined',
    detectSessionInUrl: typeof window !== 'undefined',
  }
})