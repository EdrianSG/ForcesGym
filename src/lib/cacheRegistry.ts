import { supabase } from '@/lib/supabase'

export type DataTable = 'members' | 'subscriptions' | 'membership_plans' | 'invoices'
type Cache = { invalidate: () => void; clear: () => void }
const entries = new Map<Cache, readonly DataTable[]>()

export function registerCache(cache: Cache, tables: readonly DataTable[]) {
  entries.set(cache, tables)
  return () => { entries.delete(cache) }
}

export function invalidateData(...tables: DataTable[]) {
  for (const [cache, dependencies] of entries) {
    if (tables.some((table) => dependencies.includes(table))) cache.invalidate()
  }
}

let userId: string | undefined
supabase.auth.onAuthStateChange((_event, session) => {
  const nextUserId = session?.user.id
  if (nextUserId !== userId) {
    userId = nextUserId
    // Do not start database requests inside Supabase's auth callback.
    queueMicrotask(() => { for (const cache of entries.keys()) cache.clear() })
  }
})
