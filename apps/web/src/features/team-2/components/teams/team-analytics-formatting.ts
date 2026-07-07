export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 2) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function fmtNumber(n: number | null): string {
  if (n == null) return '—'
  return Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(n)
}

export function fmtUsd(amount: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatLongDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function deltaPercent(curr: number, prev: number): {
  text: string
  tone: 'up' | 'down' | 'flat'
} {
  if (prev === 0 && curr === 0) return { text: '—', tone: 'flat' }
  if (prev === 0) return { text: 'new', tone: 'up' }
  const diff = curr - prev
  if (diff === 0) return { text: '0%', tone: 'flat' }
  const ratio = Math.round((diff / prev) * 100)
  const sign = diff > 0 ? '+' : ''
  return { text: `${sign}${ratio}%`, tone: diff > 0 ? 'up' : 'down' }
}
