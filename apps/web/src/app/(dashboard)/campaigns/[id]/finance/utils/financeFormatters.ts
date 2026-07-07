import type { StripePrice } from '@/features/studio/services/analytics.service'

export function fmt(value: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(value)
}

export function fmtPrice(price: StripePrice) {
  if (!price.unit_amount) return 'Free'
  const base = fmt(price.unit_amount / 100, price.currency)
  if (price.recurring) return `${base} / ${price.recurring.interval}`
  return base
}
