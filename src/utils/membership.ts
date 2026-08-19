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
  const startDate = parseISODate(startDateIso)
  return toISODate(addDays(startDate, durationDays * months))
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

  return '9999'
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

