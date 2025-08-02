import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://bfnkusldtzdpoezqawuu.supabase.co"
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmbmt1c2xkdHpkcG9lenFhd3V1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxNjI4ODgsImV4cCI6MjA2NzczODg4OH0.D9yJ6KnuiqryKh6dIE3eVN5F1v72ehFEumhCV8eRQAg"

// Global singleton client
let globalSupabaseClient: SupabaseClient | null = null

// Custom storage adapter that never fails
const safeStorage = {
  getItem: (key: string) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key)
      }
    } catch (error) {
      console.warn('Storage getItem failed:', error)
    }
    return null
  },
  setItem: (key: string, value: string) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value)
      }
    } catch (error) {
      console.warn('Storage setItem failed:', error)
    }
  },
  removeItem: (key: string) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key)
      }
    } catch (error) {
      console.warn('Storage removeItem failed:', error)
    }
  }
}

export function getSupabaseClient() {
  if (globalSupabaseClient) {
    return globalSupabaseClient
  }

  console.log('🔧 Creating new Supabase client instance')
  
  globalSupabaseClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
      storage: typeof window !== 'undefined' ? safeStorage : undefined,
      persistSession: typeof window !== 'undefined',
      autoRefreshToken: typeof window !== 'undefined',
      detectSessionInUrl: typeof window !== 'undefined',
    }
  })

  return globalSupabaseClient
}

// Export the singleton instance
export const supabase = getSupabaseClient()