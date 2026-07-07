import type { TimeRange } from './types'

export const TIME_LABELS: Record<TimeRange, string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  all: 'All time',
}

export const INPUT_CLASS =
  'h-spacing-10 px-spacing-3 body-2 rounded-spacing-2 input-glass placeholder:text-muted-foreground text-foreground w-full'
export const LABEL_CLASS = 'body-2 mb-spacing-2 block'
export const NEW_BTN_CLASS =
  'chip-glass-neutral flex items-center gap-1.5 rounded-lg px-3 py-1.5 body-4 text-muted-foreground hover:text-foreground'

export const CURRENCY_OPTIONS = [
  { value: 'usd', label: 'USD' },
  { value: 'eur', label: 'EUR' },
  { value: 'gbp', label: 'GBP' },
  { value: 'aud', label: 'AUD' },
  { value: 'cad', label: 'CAD' },
]
