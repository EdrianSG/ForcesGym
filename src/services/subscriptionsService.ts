import { supabase } from '@/lib/supabase'
import { createAndUploadInvoice } from '@/services/invoicesService'
import type { Subscription } from '@/types'

export type SubscriptionWithDetails = Subscription & {
  plan_name: string
  member_name: string
}

export async function getSubscriptions(): Promise<SubscriptionWithDetails[]> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*, members(full_name), membership_plans(name)')
    .order('created_at', { ascending: false })

  if (error || !data) {
    console.error('Error al obtener las suscripciones de Supabase:', error)
    return []
  }

  return data.map((sub: Record<string, unknown>) => {
    const memberObj = sub.members as { full_name?: string } | null
    const planObj = sub.membership_plans as { name?: string } | null

    return {
      id: String(sub.id),
      member_id: String(sub.member_id),
      plan_id: String(sub.plan_id),
      start_date: String(sub.start_date),
      end_date: String(sub.end_date),
      price_paid:
        typeof sub.price_paid === 'number'
          ? sub.price_paid
          : Number(sub.price_paid),
      created_at: String(sub.created_at),
      member_name: memberObj?.full_name ?? 'Cliente',
      plan_name: planObj?.name ?? 'Plan',
    }
  })
}

export async function getSubscriptionsByMemberId(
  memberId: string,
): Promise<SubscriptionWithDetails[]> {
  const all = await getSubscriptions()
  return all.filter((sub) => sub.member_id === memberId)
}

export async function renewSubscription(data: {
  member_id: string
  plan_id: string
  start_date: string
  end_date: string
  price_paid: number
  plan_name?: string
  member_name?: string
}): Promise<SubscriptionWithDetails> {
  const { data: inserted, error } = await supabase
    .from('subscriptions')
    .insert([
      {
        member_id: data.member_id,
        plan_id: data.plan_id,
        start_date: data.start_date,
        end_date: data.end_date,
        price_paid: data.price_paid,
      },
    ])
    .select('*, members(full_name, membership_number, dni), membership_plans(name)')
    .single()

  if (error || !inserted) {
    throw new Error(error?.message ?? 'Error al renovar la membresía.')
  }

  const memberObj = inserted.members as {
    full_name?: string
    membership_number?: string
    dni?: string
  } | null
  const planObj = inserted.membership_plans as { name?: string } | null

  // Emitir Boleta SUNAT en PDF y subir a Supabase Storage
  try {
    await createAndUploadInvoice({
      subscription_id: String(inserted.id),
      member_id: data.member_id,
      client_code: memberObj?.membership_number ?? '0000',
      client_name: memberObj?.full_name ?? data.member_name ?? 'Cliente',
      client_document: memberObj?.dni ?? '',
      plan_name: planObj?.name ?? data.plan_name ?? 'Renovación de Membresía',
      total: data.price_paid,
      voucher_type: 'boleta',
    })
  } catch (invErr) {
    console.warn('Aviso al emitir boleta de renovación:', invErr)
  }

  return {
    id: String(inserted.id),
    member_id: String(inserted.member_id),
    plan_id: String(inserted.plan_id),
    start_date: String(inserted.start_date),
    end_date: String(inserted.end_date),
    price_paid:
      typeof inserted.price_paid === 'number'
        ? inserted.price_paid
        : Number(inserted.price_paid),
    created_at: String(inserted.created_at),
    member_name: memberObj?.full_name ?? data.member_name ?? 'Cliente',
    plan_name: planObj?.name ?? data.plan_name ?? 'Plan',
  }
}

export async function updateSubscription(
  subscriptionId: string,
  data: {
    start_date?: string
    end_date?: string
    plan_id?: string
    price_paid?: number
  },
): Promise<void> {
  const { error } = await supabase
    .from('subscriptions')
    .update(data)
    .eq('id', subscriptionId)

  if (error) {
    throw new Error(error.message)
  }
}
