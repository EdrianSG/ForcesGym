import { useEffect, useState } from 'react'
import {
  checkSupabaseConnection,
  type SupabaseSetupStatus,
} from '@/lib/supabase'

export function useSupabaseStatus(): SupabaseSetupStatus {
  const [status, setStatus] = useState<SupabaseSetupStatus>({
    state: 'checking',
  })

  useEffect(() => {
    let cancelled = false

    void checkSupabaseConnection().then((result) => {
      if (!cancelled) {
        setStatus(result)
      }
    })

    return () => {
      cancelled = true
    }
  }, [])

  return status
}
