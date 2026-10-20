export function requireText(value: string, label: string): string {
  const text = value.trim().replace(/\s+/g, ' ')
  if (!text) throw new Error(`Completa ${label}.`)
  return text
}

export function validateMoney(value: number): void {
  if (!Number.isFinite(value) || value < 0 || value > 99_999_999.99 || Math.abs(value * 100 - Math.round(value * 100)) > 0.00001) {
    throw new Error('Ingresa un monto válido, positivo o cero, con hasta dos decimales.')
  }
}

export function validatePositiveInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 1) throw new Error(`${label} debe ser un número entero mayor que cero.`)
}

export function validateDate(value: string): void {
  const date = new Date(`${value}T00:00:00Z`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error('Ingresa una fecha válida.')
  }
}

export function validateSubscription(data: { start_date: string; end_date: string; price_paid: number; plan_id: string }): void {
  requireText(data.plan_id, 'el plan')
  validateDate(data.start_date)
  validateDate(data.end_date)
  if (data.end_date < data.start_date) throw new Error('El vencimiento no puede ser anterior al inicio.')
  validateMoney(data.price_paid)
}

export function normalizeMember<T extends { membership_number?: string; full_name?: string; dni?: string; phone?: string }>(data: T): T {
  const normalized = { ...data }
  if (data.membership_number !== undefined) {
    normalized.membership_number = data.membership_number.trim()
    if (!/^\d{4}$/.test(normalized.membership_number)) throw new Error('El número de membresía debe tener 4 dígitos.')
  }
  if (data.full_name !== undefined) normalized.full_name = requireText(data.full_name, 'el nombre completo')
  if (data.dni !== undefined) {
    normalized.dni = data.dni.trim()
    if (!/^\d{8}$/.test(normalized.dni)) throw new Error('El DNI debe tener 8 dígitos.')
  }
  if (data.phone !== undefined) {
    normalized.phone = data.phone.trim().replace(/[\s()-]/g, '')
    if (normalized.phone && !/^\+?\d{7,15}$/.test(normalized.phone)) throw new Error('Ingresa un teléfono válido o deja el campo vacío.')
  }
  return normalized
}

export function writeError(error: { code?: string; message: string }, subject: 'cliente' | 'plan'): Error {
  if (error.code === '23505') {
    return new Error(subject === 'cliente'
      ? 'Ya existe un cliente con ese DNI o número de membresía. Revisa los datos antes de reintentar.'
      : 'Ya existe un plan con ese nombre. Usa otro nombre.')
  }
  return new Error(error.message)
}
