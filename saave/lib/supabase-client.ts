import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// Client that reads/writes session via cookies (works with middleware)
export const supabase = createClientComponentClient({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
})

// Backwards-compatible getter (no longer needed but kept for imports)
export function getSupabaseClient() {
  return supabase
}