import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const rawUrl = (import.meta.env.VITE_SUPABASE_URL as string)?.trim() ?? ''
const rawKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string)?.trim() ?? ''

const PLACEHOLDER_URL = 'https://placeholder.supabase.co'
const PLACEHOLDER_KEY = 'placeholder-key-for-initialization'

let sanitizedUrl = rawUrl || PLACEHOLDER_URL
if (rawUrl) {
  try {
    sanitizedUrl = new URL(rawUrl).origin
  } catch {
    sanitizedUrl = rawUrl || PLACEHOLDER_URL
  }
}

const validKey = rawKey || PLACEHOLDER_KEY

export const supabase: SupabaseClient = createClient(sanitizedUrl, validKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'forcesgym-auth',
  },
})
