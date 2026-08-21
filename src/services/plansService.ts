import { supabase } from '@/lib/supabase'
import type { MembershipPlan } from '@/types'

export async function getPlans(): Promise<MembershipPlan[]> {
  const { data, error } = await supabase
    .from('membership_plans')
    .select('*')
    .order('price', { ascending: true })

  if (error || !data) {
    console.error('Error al obtener planes de Supabase:', error)
    return []
  }

  return data as MembershipPlan[]
}

export async function togglePlanActive(
  id: string,
  active: boolean,
): Promise<void> {
  const { error } = await supabase
    .from('membership_plans')
    .update({ active })
    .eq('id', id)

  if (error) {
    console.error('Error al cambiar estado del plan:', error)
    throw new Error(error.message)
  }
}

export async function updatePlan(
  id: string,
  data: {
    name?: string
    price?: number
    duration_days?: number
    active?: boolean
  },
): Promise<void> {
  const { error } = await supabase
    .from('membership_plans')
    .update(data)
    .eq('id', id)

  if (error) {
    console.error('Error al actualizar el plan:', error)
    throw new Error(error.message)
  }
}
