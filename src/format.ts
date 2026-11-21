import type { Address, ClinicSettings } from './types'

export function localIsoDate(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function nowIso(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${localIsoDate(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

export function parseLocalDate(isoDate: string) {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function addDays(isoDate: string, days: number) {
  const date = parseLocalDate(isoDate)
  date.setDate(date.getDate() + days)
  return localIsoDate(date)
}

export function startOfWeek(isoDate: string, weekStartsOn: 0 | 1 | 6) {
  const date = parseLocalDate(isoDate)
  const diff = (date.getDay() - weekStartsOn + 7) % 7
  date.setDate(date.getDate() - diff)
  return localIsoDate(date)
}

/** ISO-8601 week number for a local calendar date. */
export function isoWeekNumber(isoDate: string) {
  const date = parseLocalDate(isoDate)
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = utc.getUTCDay() || 7
  utc.setUTCDate(utc.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1))
  return Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

export function startOfMonth(isoDate: string) {
  const date = parseLocalDate(isoDate)
  return localIsoDate(new Date(date.getFullYear(), date.getMonth(), 1))
}

export function addMonths(isoDate: string, months: number) {
  const date = parseLocalDate(isoDate)
  date.setMonth(date.getMonth() + months)
  return localIsoDate(date)
}

export function formatMonthYear(isoDate: string, intlLocale: string) {
  return new Intl.DateTimeFormat(intlLocale, {
    month: 'long',
    year: 'numeric',
  }).format(parseLocalDate(isoDate))
}

export function formatDate(isoDate: string, intlLocale: string) {
  return new Intl.DateTimeFormat(intlLocale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(parseLocalDate(isoDate))
}

export function formatLongDate(isoDate: string, intlLocale: string) {
  return new Intl.DateTimeFormat(intlLocale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parseLocalDate(isoDate))
}

export function formatWeekday(isoDate: string, intlLocale: string) {
  return new Intl.DateTimeFormat(intlLocale, { weekday: 'short' }).format(parseLocalDate(isoDate))
}

export function formatTime(time: string, intlLocale: string) {
  const [hours, minutes] = time.split(':').map(Number)
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return new Intl.DateTimeFormat(intlLocale, { hour: 'numeric', minute: '2-digit' }).format(date)
}

export function formatDateTime(iso: string, intlLocale: string) {
  return new Intl.DateTimeFormat(intlLocale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}

export function formatMoney(amount: number, currency: string, intlLocale: string) {
  return new Intl.NumberFormat(intlLocale, { style: 'currency', currency }).format(amount)
}

export function ageInYears(isoDate: string, today = new Date()) {
  const birth = parseLocalDate(isoDate)
  let age = today.getFullYear() - birth.getFullYear()
  const month = today.getMonth() - birth.getMonth()
  if (month < 0 || (month === 0 && today.getDate() < birth.getDate())) age -= 1
  return age
}

export function formatPersonName(
  person: { givenName: string; familyName: string },
  order: ClinicSettings['nameOrder'],
) {
  return order === 'family-given'
    ? `${person.familyName} ${person.givenName}`
    : `${person.givenName} ${person.familyName}`
}

export function formatPhone(digits: string, preset: ClinicSettings['phonePreset']) {
  const country = '972'
  if (!digits.startsWith(country) || digits.length !== country.length + 9) {
    return `+${digits}`
  }
  const national = digits.slice(country.length)
  if (preset === 'il-mobile') return `0${national}`
  return `+${country}${national}`
}

export function formatAddress(address: Address, preset: ClinicSettings['addressPreset']) {
  const cityLine = `${address.city} ${address.postalCode}`
  if (preset === 'city-street') return [cityLine, address.street, address.country]
  return [address.street, cityLine, address.country]
}

export function formatTooth(code: string, notation: ClinicSettings['toothNotation']) {
  if (notation === 'fdi') return code
  return code
}
