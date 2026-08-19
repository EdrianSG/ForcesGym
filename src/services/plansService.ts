import { supabase } from '@/lib/supabase'
import { isSupabaseConfigured } from '@/lib/env'
import { MOCK_PLANS } from '@/data/mock'
import type { MembershipPlan } from '@/types'

let mockPlansState: MembershipPlan[] = [...MOCK_PLANS]

export async function getPlans(): Promise<MembershipPlan[]> {
  if (!isSupabaseConfigured() || !supabase) {
    return mockPlansState
  }

  const { data, error } = await supabase
    .from('membership_plans')
    .select('*')
    .order('created_at', { ascending: true })

  if (error || !data) {
    console.error('Error al obtener los planes:', error)
    return mockPlansState
  }

  return data as MembershipPlan[]
}

export async function createPlan(
  plan: Omit<MembershipPlan, 'id' | 'created_at'>,
): Promise<MembershipPlan> {
  if (!isSupabaseConfigured() || !supabase) {
    const newPlan: MembershipPlan = {
      ...plan,
      id: `plan-${Date.now()}`,
      created_at: new Date().toISOString(),
    }
    mockPlansState.push(newPlan)
    return newPlan
  }

  const { data, error } = await supabase
    .from('membership_plans')
    .insert([plan])
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data as MembershipPlan
}

export async function togglePlanActive(
  id: string,
  active: boolean,
): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) {
    mockPlansState = mockPlansState.map((p) =>
      p.id === id ? { ...p, active } : p,
    )
    return
  }

  const { error } = await supabase
    .from('membership_plans')
    .update({ active })
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }
}
