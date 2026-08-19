import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getPublicEnv, isSupabaseConfigured } from '@/lib/env'

export type SupabaseSetupStatus =
  | { state: 'checking' }
  | { state: 'unconfigured' }
  | { state: 'ok' }
  | { state: 'error'; message: string }

function createSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null
  }

  const { supabaseUrl, supabaseAnonKey } = getPublicEnv()

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'forcesgym-auth',
    },
  })
}

export const supabase = createSupabaseClient()

export function getSupabaseClient(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Supabase no está configurado. Copia .env.example a .env y completa VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.',
    )
  }

  return supabase
}

export async function checkSupabaseConnection(): Promise<SupabaseSetupStatus> {
  if (!supabase) {
    return { state: 'unconfigured' }
  }

  const { error } = await supabase.auth.getSession()

  if (error) {
    return { state: 'error', message: error.message }
  }

  return { state: 'ok' }
}
