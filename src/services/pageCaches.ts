import { supabase } from '@/lib/supabase'
import { createValidatedCache } from '@/lib/validatedCache'
import { registerCache, type DataTable } from '@/lib/cacheRegistry'
import { getMembers, getMemberById, getMembershipNumbers, searchMembers } from '@/services/membersService'
import { getPlans } from '@/services/plansService'
import { getAllInvoices, getInvoicesByMemberId } from '@/services/invoicesService'
import { getSubscriptionsByMemberId } from '@/services/subscriptionsService'

const maxAgeMs = 30_000
async function fingerprint(tables: readonly DataTable[], memberId?: string) {
  const signal = AbortSignal.timeout(8000)
  const results = await Promise.all(tables.map(async (table) => {
    if (table === 'membership_plans') {
      const response = await supabase.from(table).select('*').order('id').abortSignal(signal)
      if (response.error) throw new Error(response.error.message)
      return response.data
    }
    const column = table === 'members' ? 'updated_at' : 'created_at'
    let request = supabase.from(table).select(`id,${column}`, { count: 'exact' })
      .order(column, { ascending: false }).order('id').limit(1)
    if (memberId) request = request.eq(table === 'members' ? 'id' : 'member_id', memberId)
    const response = await request.abortSignal(signal)
    if (response.error) throw new Error(response.error.message)
    return { data: response.data, count: response.count }
  }))
  return JSON.stringify(results)
}

function resource<T>(tables: readonly DataTable[], load: () => Promise<T>, memberId?: string) {
  const cache = createValidatedCache({ fingerprint: () => fingerprint(tables, memberId), load, maxAgeMs })
  const unregister = registerCache(cache, tables)
  return { cache, unregister }
}

export const membersCache = resource(['members', 'subscriptions', 'membership_plans'], () => getMembers()).cache
export const plansCache = resource(['membership_plans'], getPlans).cache
export const invoicesCache = resource(['invoices'], getAllInvoices).cache
export const numbersCache = resource(['members'], () => getMembershipNumbers()).cache

// Bound keyed caches while keeping active resources registered for invalidation.
function keyedResources<K, T>(factory: (key: K) => ReturnType<typeof resource<T>>) {
  const items = new Map<K, ReturnType<typeof factory>>()
  return (key: K) => {
    let item = items.get(key)
    if (!item) {
      item = factory(key)
      items.set(key, item)
      if (items.size > 50) {
        const oldestKey = items.keys().next().value as K
        const oldest = items.get(oldestKey)!
        oldest.unregister()
        items.delete(oldestKey)
      }
    }
    return item.cache
  }
}

export const getSearchCache = keyedResources((query: string) => resource(
  ['members', 'subscriptions', 'membership_plans'],
  () => searchMembers(query, AbortSignal.timeout(8000)),
))

export const getMemberCache = keyedResources((id: string) => resource(
  ['members', 'subscriptions', 'membership_plans', 'invoices'],
  async () => {
    const [member, history, plans, invoices] = await Promise.all([
      getMemberById(id), getSubscriptionsByMemberId(id), plansCache.get(), getInvoicesByMemberId(id),
    ])
    return { member, history, plans, invoices }
  }, id,
))
