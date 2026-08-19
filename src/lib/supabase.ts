import { createClient } from '@supabase/supabase-js'

const rawUrl = (import.meta.env.VITE_SUPABASE_URL as string)?.trim() ?? ''
const rawKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string)?.trim() ?? ''

let sanitizedUrl = rawUrl
if (rawUrl) {
  try {
    sanitizedUrl = new URL(rawUrl).origin
  } catch {
    sanitizedUrl = rawUrl
  }
}

export const supabase = createClient(sanitizedUrl, rawKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'forcesgym-auth',
  },
})
