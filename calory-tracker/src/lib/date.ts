import { format, parseISO } from 'date-fns'

/** Local YYYY-MM-DD key for a Date (avoids UTC off-by-one from toISOString). */
export function toKey(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

export const todayKey = (): string => toKey(new Date())

export function fromKey(key: string): Date {
  return parseISO(key)
}

export function prettyDate(key: string): string {
  return format(fromKey(key), 'EEE, MMM d')
}

export function shortDate(key: string): string {
  return format(fromKey(key), 'MMM d')
}

export function isToday(key: string): boolean {
  return key === todayKey()
}

export function addDaysKey(key: string, days: number): string {
  const d = fromKey(key)
  d.setDate(d.getDate() + days)
  return toKey(d)
}
