const PLACEHOLDER_URL = 'https://tu-proyecto.supabase.co'
const PLACEHOLDER_ANON_KEY = 'tu-anon-key-publica'

export interface PublicEnv {
  supabaseUrl: string
  supabaseAnonKey: string
}

export function getPublicEnv(): PublicEnv {
  const rawUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? ''
  let sanitizedUrl = rawUrl

  if (rawUrl) {
    try {
      const parsed = new URL(rawUrl)
      sanitizedUrl = parsed.origin
    } catch {
      sanitizedUrl = rawUrl
    }
  }

  return {
    supabaseUrl: sanitizedUrl,
    supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '',
  }
}

function isValidSupabaseUrl(url: string): boolean {
  if (!url || url === PLACEHOLDER_URL) {
    return false
  }

  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export function isSupabaseConfigured(): boolean {
  const { supabaseUrl, supabaseAnonKey } = getPublicEnv()

  return (
    isValidSupabaseUrl(supabaseUrl) &&
    supabaseAnonKey.length > 20 &&
    supabaseAnonKey !== PLACEHOLDER_ANON_KEY
  )
}
