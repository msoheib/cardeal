export const ARABIC_LATIN_GREGORY_LOCALE = 'ar-SA-u-ca-gregory-nu-latn'

export function formatNumber(value: number) {
  return new Intl.NumberFormat(ARABIC_LATIN_GREGORY_LOCALE).format(value)
}

export function formatCurrencySar(value: number) {
  return new Intl.NumberFormat(ARABIC_LATIN_GREGORY_LOCALE, {
    style: 'currency',
    currency: 'SAR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

export function formatGregorianDate(value: string | number | Date) {
  return new Intl.DateTimeFormat(ARABIC_LATIN_GREGORY_LOCALE, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  }).format(new Date(value))
}

export function formatGregorianTime(value: string | number | Date) {
  return new Intl.DateTimeFormat(ARABIC_LATIN_GREGORY_LOCALE, {
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value))
}
