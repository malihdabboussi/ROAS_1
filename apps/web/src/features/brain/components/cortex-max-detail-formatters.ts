import type { CortexItem } from './cortex-max-view-model'

export const SECTION_LABELS: Record<CortexItem['section'], string> = {
  collective: 'Collective',
  avatars: 'Avatars',
  customers: 'Customers / Accounts',
  unlinkedSignals: 'Unlinked Signals',
  timelines: 'Timelines',
  identity: 'Identity',
  perspectives: 'Perspectives',
  beliefs: 'Beliefs',
  tensions: 'Tensions',
  patterns: 'Patterns',
  topic: 'Topics',
  entity: 'People & Places',
}

export function formatPercent(value: number | null | undefined): string {
  if (typeof value !== 'number') return '0%'
  return `${Math.round(value * 100)}%`
}

const ENUMERATION_TOKENS = [
  'First',
  'Second',
  'Third',
  'Fourth',
  'Fifth',
  'Sixth',
  'Seventh',
  'Eighth',
  'Ninth',
  'Tenth',
]

function formatExtraNotes(raw: string): string {
  let text = raw.replace(/\r\n?/g, '\n').trim()
  text = text.replace(/\s*\bUPDATED\b/g, '\n\nUPDATED')
  const enumerationPattern = new RegExp(`(?:^|\\s)(${ENUMERATION_TOKENS.join('|')}):`, 'g')
  text = text.replace(enumerationPattern, (_match, token: string) => `\n\n${token}:`)
  text = text.replace(/\n{3,}/g, '\n\n')
  return text.trim()
}

function formatBeliefParagraphs(raw: string): string {
  let text = raw.replace(/\r\n?/g, '\n').trim()
  text = text.replace(/\./g, '.\n\n')
  text = text.replace(/\n{3,}/g, '\n\n')
  return text.trim()
}

export function formatBeliefNotes(raw: string): string {
  return formatExtraNotes(formatBeliefParagraphs(raw))
}

export function formatDateLabel(value: string | null | undefined): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString()
}

export function timelineEventLabel(input: {
  occurred_at?: string | null
  occurred_until?: string | null
  valid_from?: string | null
  valid_until?: string | null
}): string {
  const happened = formatDateLabel(input.occurred_at)
  const happenedUntil = formatDateLabel(input.occurred_until)
  if (happened && happenedUntil && happened !== happenedUntil) {
    return `${happened} - ${happenedUntil}`
  }
  if (happened) return happened
  const validFrom = formatDateLabel(input.valid_from)
  const validUntil = formatDateLabel(input.valid_until)
  if (validFrom || validUntil) return `${validFrom ?? 'Unknown'} - ${validUntil ?? 'Open'}`
  return 'Unknown'
}

export function titleCaseLabel(value: string | null | undefined): string {
  if (!value) return 'Unknown'
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

export function shortId(value: string | null | undefined): string {
  if (!value) return 'Unknown'
  return `${value.slice(0, 8)}...`
}

export function statusBadgeClass(status: string | null | undefined): string {
  if (status === 'active' || status === 'linked_contact' || status === 'linked_entity') {
    return 'badge-glass-green'
  }
  if (status === 'unlinked_source' || status === 'unresolved') return 'badge-glass-orange'
  if (status === 'archived' || status === 'merged') return 'badge-glass-muted'
  return 'badge-glass-muted'
}
