import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export type SupabaseSetupStatus =
  | { state: 'checking' }
  | { state: 'ok' }
  | { state: 'error'; message: string }

export function useSupabaseStatus(): SupabaseSetupStatus {
  const [status, setStatus] = useState<SupabaseSetupStatus>({
    state: 'checking',
  })

  useEffect(() => {
    let cancelled = false

    void supabase.auth.getSession().then(({ error }) => {
      if (!cancelled) {
        if (error) {
          setStatus({ state: 'error', message: error.message })
        } else {
          setStatus({ state: 'ok' })
        }
      }
    })

    return () => {
      cancelled = true
    }
  }, [])

  return status
}
