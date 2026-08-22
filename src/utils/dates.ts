const DATE_FORMATTER = new Intl.DateTimeFormat('es-PE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

const CURRENCY_FORMATTER = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
  maximumFractionDigits: 0,
})

export function parseISODate(isoDate: string): Date {
  if (!isoDate) return new Date()
  const cleanDate = isoDate.split('T')[0]
  const [year, month, day] = cleanDate.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function startOfToday(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export function toISODate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function todayISODate(): string {
  return toISODate(startOfToday())
}

export function formatDate(isoDate: string): string {
  if (!isoDate) return '—'
  try {
    if (isoDate.includes('T')) {
      const d = new Date(isoDate)
      if (!isNaN(d.getTime())) return DATE_FORMATTER.format(d)
    }
    const d = parseISODate(isoDate)
    if (!isNaN(d.getTime())) return DATE_FORMATTER.format(d)
    return String(isoDate)
  } catch {
    return String(isoDate)
  }
}

export function formatMoney(amount: number): string {
  if (typeof amount !== 'number' || isNaN(amount)) return 'S/. 0'
  return CURRENCY_FORMATTER.format(amount)
}
