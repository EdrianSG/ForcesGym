import { singleFlightWrite } from '@/lib/singleFlightWrite'
import { requireText, validateMoney, validatePositiveInteger, writeError } from '@/utils/validation'
import { invalidateData } from '@/lib/cacheRegistry'
import { supabase } from '@/lib/supabase'
import type { MembershipPlan } from '@/types'

export async function getPlans(): Promise<MembershipPlan[]> {
  const { data, error } = await supabase
    .from('membership_plans')
    .select('*')
    .order('price', { ascending: true })
    .abortSignal(AbortSignal.timeout(8000))

  if (error) throw writeError(error, 'plan')

  return (data ?? []) as MembershipPlan[]
}

export const togglePlanActive = singleFlightWrite(async function (
  id: string,
  active: boolean,
): Promise<void> {
  const { error } = await supabase
    .from('membership_plans')
    .update({ active })
    .eq('id', id)

  if (error) {
    console.error('Error al cambiar estado del plan:', error)
    throw writeError(error, 'plan')
  }
  invalidateData('membership_plans')
})

export const updatePlan = singleFlightWrite(async function (
  id: string,
  data: {
    name?: string
    price?: number
    duration_days?: number
    active?: boolean
  },
): Promise<void> {
  data = { ...data }
  if (data.name !== undefined) data.name = requireText(data.name, 'el nombre del plan')
  if (data.price !== undefined) validateMoney(data.price)
  if (data.duration_days !== undefined) validatePositiveInteger(data.duration_days, 'La duración')
  const { error } = await supabase
    .from('membership_plans')
    .update(data)
    .eq('id', id)

  if (error) {
    console.error('Error al actualizar el plan:', error)
    throw writeError(error, 'plan')
  }
  invalidateData('membership_plans')
})

export const createPlan = singleFlightWrite(async function (data: {
  name: string
  price: number
  duration_days: number
  active?: boolean
}): Promise<MembershipPlan> {
  data = { ...data, name: requireText(data.name, 'el nombre del plan') }
  validateMoney(data.price)
  validatePositiveInteger(data.duration_days, 'La duración')
  const { data: inserted, error } = await supabase
    .from('membership_plans')
    .insert([
      {
        name: data.name,
        price: data.price,
        duration_days: data.duration_days,
        active: data.active ?? true,
      },
    ])
    .select()
    .single()

  if (error || !inserted) {
    console.error('Error al crear el plan en Supabase:', error)
    throw writeError(error ?? { message: 'No se pudo crear el plan.' }, 'plan')
  }

  invalidateData('membership_plans')
  return inserted as MembershipPlan
})
