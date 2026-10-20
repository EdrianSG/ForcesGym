import { validateDate, validatePositiveInteger } from '@/utils/validation'
import type { MembershipStatus } from '@/types'
import { addDays, parseISODate, startOfToday, toISODate } from '@/utils/dates'

export const EXPIRING_SOON_DAYS = 7

export function getMembershipStatus(
  endDateIso: string | null,
  today = startOfToday(),
): MembershipStatus | null {
  if (!endDateIso) {
    return null
  }

  const endDate = parseISODate(endDateIso)

  if (endDate < today) {
    return 'VENCIDO'
  }

  const soonLimit = addDays(today, EXPIRING_SOON_DAYS)

  if (endDate <= soonLimit) {
    return 'PRÓXIMO A VENCER'
  }

  return 'ACTIVO'
}

export function calculateEndDate(
  startDateIso: string,
  durationDays: number,
  months: number,
): string {
  validateDate(startDateIso)
  validatePositiveInteger(durationDays, 'La duración del plan')
  validatePositiveInteger(months, 'La cantidad de meses')
  if (months > 24) throw new Error('La cantidad de meses no puede superar 24.')
  const startDate = parseISODate(startDateIso)
  const endDate = addDays(startDate, durationDays * months)
  if (!Number.isFinite(endDate.getTime())) throw new Error('La duración excede el rango de fechas permitido.')
  return toISODate(endDate)
}

export function generateUniqueMembershipNumber(
  existingNumbers: string[] = [],
): string {
  const usedSet = new Set(existingNumbers.map((num) => num.trim()))

  for (let attempt = 0; attempt < 1000; attempt++) {
    const code = Math.floor(1000 + Math.random() * 9000).toString()
    if (!usedSet.has(code)) {
      return code
    }
  }

  for (let codeNum = 1000; codeNum <= 9999; codeNum++) {
    const code = codeNum.toString()
    if (!usedSet.has(code)) {
      return code
    }
  }

  return ''
}

export function isMembershipNumberTaken(
  number: string,
  existingNumbers: string[] = [],
): boolean {
  const trimmed = number.trim()
  if (!trimmed) {
    return false
  }

  return existingNumbers.some((num) => num.trim() === trimmed)
}

