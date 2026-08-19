import { supabase } from '@/lib/supabase'
import type { MemberListItem } from '@/types'

export async function getMembers(query?: string): Promise<MemberListItem[]> {
  const { data: members, error } = await supabase
    .from('members')
    .select('*, member_latest_subscriptions(*)')
    .order('created_at', { ascending: false })

  if (error || !members) {
    console.error('Error al obtener los clientes de Supabase:', error)
    return []
  }

  const result: MemberListItem[] = members.map((m: Record<string, unknown>) => {
    const rawSub = m.member_latest_subscriptions
    const latest = Array.isArray(rawSub) ? rawSub[0] : rawSub

    return {
      id: String(m.id),
      membership_number: String(m.membership_number),
      full_name: String(m.full_name),
      dni: String(m.dni),
      phone: String(m.phone ?? ''),
      created_at: String(m.created_at),
      updated_at: String(m.updated_at),
      current_plan_name: (latest?.plan_name as string) ?? null,
      current_start_date: (latest?.start_date as string) ?? null,
      current_end_date: (latest?.end_date as string) ?? null,
      current_price_paid:
        typeof latest?.price_paid === 'number'
          ? latest.price_paid
          : latest?.price_paid
            ? Number(latest.price_paid)
            : null,
    }
  })

  if (query && query.trim()) {
    const q = query.trim().toLowerCase()
    return result.filter(
      (m) =>
        m.membership_number.toLowerCase().includes(q) ||
        m.full_name.toLowerCase().includes(q) ||
        m.dni.toLowerCase().includes(q) ||
        m.phone.toLowerCase().includes(q),
    )
  }

  return result
}

export async function getMemberById(id: string): Promise<MemberListItem | null> {
  const members = await getMembers()
  return members.find((m) => m.id === id) ?? null
}

export async function createMemberWithSubscription(data: {
  membership_number: string
  full_name: string
  dni: string
  phone: string
  plan_id: string
  start_date: string
  end_date: string
  price_paid: number
  plan_name?: string
}): Promise<MemberListItem> {
  const { data: member, error: memberError } = await supabase
    .from('members')
    .insert([
      {
        membership_number: data.membership_number,
        full_name: data.full_name,
        dni: data.dni,
        phone: data.phone,
      },
    ])
    .select()
    .single()

  if (memberError) {
    throw new Error(memberError.message)
  }

  const { error: subError } = await supabase.from('subscriptions').insert([
    {
      member_id: member.id,
      plan_id: data.plan_id,
      start_date: data.start_date,
      end_date: data.end_date,
      price_paid: data.price_paid,
    },
  ])

  if (subError) {
    throw new Error(subError.message)
  }

  const created = await getMemberById(member.id)
  if (!created) {
    throw new Error('No se pudo recuperar el cliente creado.')
  }

  return created
}

export async function updateMember(
  id: string,
  data: {
    membership_number?: string
    full_name?: string
    dni?: string
    phone?: string
  },
): Promise<MemberListItem | null> {
  const { error } = await supabase
    .from('members')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  return getMemberById(id)
}
