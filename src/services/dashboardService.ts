import { registerCache } from '@/lib/cacheRegistry'
import { supabase } from '@/lib/supabase'
import { createValidatedCache } from '@/lib/validatedCache'
import type { SubscriptionWithDetails } from '@/services/subscriptionsService'

export interface DashboardMember {
  id: string
  full_name: string
  membership_number: string
  current_end_date: string | null
}

async function fingerprint(): Promise<string> {
  const signal = AbortSignal.timeout(8000)
  const responses = await Promise.all([
    supabase.from('members').select('updated_at', { count: 'exact' })
      .order('updated_at', { ascending: false }).limit(1).abortSignal(signal),
    supabase.from('subscriptions').select('created_at', { count: 'exact' })
      .order('created_at', { ascending: false }).limit(1).abortSignal(signal),
    // Plans have no updated_at column, so compare their small catalog directly.
    supabase.from('membership_plans').select('id,name,price,duration_days,active').order('id').abortSignal(signal),
  ])
  for (const response of responses) {
    if (response.error) throw new Error(response.error.message)
  }
  return JSON.stringify(responses.map(({ data, count }) => ({ data, count })))
}

async function loadMembers(signal: AbortSignal): Promise<DashboardMember[]> {
  const members: DashboardMember[] = []
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.from('members')
      .select('id,full_name,membership_number,member_latest_subscriptions(end_date)')
      .order('id').range(offset, offset + 999).abortSignal(signal)
    if (error) throw new Error(error.message)
    for (const row of data ?? []) {
      const subscription = Array.isArray(row.member_latest_subscriptions)
        ? row.member_latest_subscriptions[0] : row.member_latest_subscriptions
      members.push({
        id: row.id, full_name: row.full_name, membership_number: row.membership_number,
        current_end_date: subscription?.end_date ?? null,
      })
    }
    if (!data || data.length < 1000) return members
  }
}

async function load() {
  const signal = AbortSignal.timeout(8000)
  const [members, response] = await Promise.all([
    loadMembers(signal),
    supabase.from('subscriptions')
      .select('*,members(full_name),membership_plans(name)')
      .order('created_at', { ascending: false }).order('id').limit(5).abortSignal(signal),
  ])
  if (response.error) throw new Error(response.error.message)
  const subscriptions: SubscriptionWithDetails[] = (response.data ?? []).map((row) => {
    const member = Array.isArray(row.members) ? row.members[0] : row.members
    const plan = Array.isArray(row.membership_plans) ? row.membership_plans[0] : row.membership_plans
    return { ...row, price_paid: Number(row.price_paid), member_name: member?.full_name ?? 'Cliente', plan_name: plan?.name ?? 'Plan' }
  })
  return { members, subscriptions }
}

export const dashboardCache = createValidatedCache({ fingerprint, load, maxAgeMs: 30_000 })

registerCache(dashboardCache, ['members', 'subscriptions', 'membership_plans'])
