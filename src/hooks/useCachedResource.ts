import { useCallback, useEffect, useState } from 'react'
import type { createValidatedCache } from '@/lib/validatedCache'

type Cache<T> = ReturnType<typeof createValidatedCache<T>>

export function useCachedResource<T>(cache: Cache<T>, delayMs = 0) {
  const [state, setState] = useState(() => ({ cache, data: cache.peek(), error: false }))
  const [attempt, setAttempt] = useState(0)
  const retry = useCallback(() => setAttempt((value) => value + 1), [])
  const data = state.cache === cache ? state.data : cache.peek()
  const error = state.cache === cache && state.error

  useEffect(() => {
    let active = true
    let refreshTimer: ReturnType<typeof setTimeout> | undefined
    const refresh = (force = false) => {
      if (document.visibilityState === 'hidden') return
      void cache.get(force).then((result) => {
        if (!active) return
        const current = cache.peek()
        setState({ cache, data: current, error: false })
        if (current !== result) refreshTimer = setTimeout(() => refresh(), 0)
      }).catch(() => {
        if (active) setState({ cache, data: cache.peek(), error: true })
      })
    }
    const schedule = () => {
      clearTimeout(refreshTimer)
      refreshTimer = setTimeout(() => refresh(), 0)
    }
    const unsubscribe = cache.subscribe(() => {
      if (!active) return
      setState({ cache, data: cache.peek(), error: false })
      schedule()
    })
    refreshTimer = setTimeout(() => refresh(attempt > 0), delayMs)
    const interval = setInterval(schedule, 30_000)
    window.addEventListener('focus', schedule)
    document.addEventListener('visibilitychange', schedule)
    return () => {
      active = false
      unsubscribe()
      clearTimeout(refreshTimer)
      clearInterval(interval)
      window.removeEventListener('focus', schedule)
      document.removeEventListener('visibilitychange', schedule)
    }
  }, [cache, delayMs, attempt])

  return { data, error, loading: data === null && !error, retry }
}
