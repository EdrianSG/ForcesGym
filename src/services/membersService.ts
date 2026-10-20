import { singleFlightWrite } from '@/lib/singleFlightWrite'
import { normalizeMember, validateSubscription, writeError } from '@/utils/validation'
import { RegistrationIncompleteError } from '@/lib/registrationError'
import { invalidateData } from '@/lib/cacheRegistry'
import { supabase } from '@/lib/supabase'
import { createAndUploadInvoice } from '@/services/invoicesService'
import type { MemberListItem } from '@/types'

function mapMembers(members: Record<string, unknown>[]): MemberListItem[] {
  return members.map((m: Record<string, unknown>) => {
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
}

// Search remotely so a missing number does not require downloading the roster.
export async function searchMembers(
  query: string,
  signal: AbortSignal,
): Promise<MemberListItem[]> {
  let request = supabase
    .from('members')
    .select('*, member_latest_subscriptions(*)')
    .order('created_at', { ascending: false })
    .limit(50)

  const term = query.trim()
  if (term) {
    // Quote PostgREST values and escape LIKE wildcards entered by the user.
    const escaped = term.replace(/[\\%_]/g, '\\$&')
    const pattern = JSON.stringify(`%${escaped}%`)
    request = request.or(
      ['membership_number', 'full_name', 'dni', 'phone']
        .map((field) => `${field}.ilike.${pattern}`)
        .join(','),
    )
  }

  const { data, error } = await request.abortSignal(signal)
  if (error) throw new Error(error.message)
  return mapMembers(data ?? [])
}

export async function getMembershipNumbers(excludeId?: string): Promise<string[]> {
  // Only transfer codes; paginate to avoid Supabase's default row limit.
  const signal = AbortSignal.timeout(8000)
  const numbers: string[] = []
  const pageSize = 1000
  for (let offset = 0; ; offset += pageSize) {
    let request = supabase.from('members').select('membership_number')
      .order('id').range(offset, offset + pageSize - 1)
    if (excludeId) request = request.neq('id', excludeId)
    const { data, error } = await request.abortSignal(signal)
    if (error) throw new Error(error.message)
    numbers.push(...(data ?? []).map((row) => String(row.membership_number)))
    if (!data || data.length < pageSize) return numbers
  }
}

export async function getMembers(query?: string): Promise<MemberListItem[]> {
  const { data: members, error } = await supabase
    .from('members')
    .select('*, member_latest_subscriptions(*)')
    .order('created_at', { ascending: false })
    .abortSignal(AbortSignal.timeout(8000))

  if (error) throw new Error(error.message)

  const result = mapMembers(members ?? [])

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
  const { data, error } = await supabase
    .from('members')
    .select('*, member_latest_subscriptions(*)')
    .eq('id', id)
    .abortSignal(AbortSignal.timeout(8000))
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data ? mapMembers([data])[0] : null
}

export const createMemberWithSubscription = singleFlightWrite(async function (data: {
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
  data = normalizeMember(data)
  validateSubscription(data)
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

  if (memberError || !member) {
    throw writeError(memberError ?? { message: 'No se pudo confirmar el registro del cliente. Revisa la lista antes de reintentar.' }, 'cliente')
  }

  invalidateData('members', 'subscriptions')

  const { data: subData, error: subError } = await Promise.resolve(supabase
    .from('subscriptions')
    .insert([
      {
        member_id: member.id,
        plan_id: data.plan_id,
        start_date: data.start_date,
        end_date: data.end_date,
        price_paid: data.price_paid,
      },
    ])
    .select()
    .single()).catch(() => { throw new RegistrationIncompleteError(member.id) })

  if (subError || !subData) {
    throw new RegistrationIncompleteError(member.id)
  }

  invalidateData('members', 'subscriptions')

  // Generar Boleta SUNAT en PDF y subir a Supabase Storage
  try {
    await createAndUploadInvoice({
      subscription_id: subData.id,
      member_id: member.id,
      client_code: member.membership_number,
      client_name: member.full_name,
      client_document: member.dni,
      plan_name: data.plan_name ?? 'Membresía Gimnasio',
      total: data.price_paid,
      voucher_type: 'boleta',
    })
  } catch (invErr) {
    console.warn('Aviso al emitir boleta de venta:', invErr)
  }

  // Avoid reporting a successful registration as failed if a follow-up read fails.
  return {
    ...member,
    current_plan_name: data.plan_name ?? null,
    current_start_date: subData.start_date,
    current_end_date: subData.end_date,
    current_price_paid: Number(subData.price_paid),
  } as MemberListItem
})

export const updateMember = singleFlightWrite(async function (
  id: string,
  data: {
    membership_number?: string
    full_name?: string
    dni?: string
    phone?: string
  },
): Promise<void> {
  data = normalizeMember(data)
  const { error } = await supabase
    .from('members')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    throw writeError(error, 'cliente')
  }
  invalidateData('members', 'subscriptions')

})
