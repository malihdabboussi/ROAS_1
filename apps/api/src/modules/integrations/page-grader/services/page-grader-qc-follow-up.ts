import { QC_FOLLOW_UP_MESSAGES } from './page-grader-qc-follow-up.messages'

export const QC_FOLLOW_UP_COOLDOWN_MS = 24 * 60 * 60_000
export const QC_SLACK_ANCHOR_LOOKBACK_MS = 14 * 24 * 60 * 60_000
export const QC_CASE_TYPES = [
  'quality_control',
  'proactive_launch',
  'campaign_quality_control',
] as const

export type QcDeliveryAnchor = {
  slack_channel: string
  slack_parent_ts: string
  slack_finding_fingerprint: string
  slack_last_follow_up_at: string | null
  snoozed_until: string | null
  first_seen_at?: string
}

export type QcSlackDeliveryDecision =
  | { mode: 'top_level' }
  | { mode: 'skip' }
  | { mode: 'thread'; text: string }

export function normalizeFindingSummary(summary: string): string {
  return summary.replace(/\s+/g, ' ').trim().toLowerCase()
}

export function uniqueFindingSummaries(findings: Array<{ summary: string }>): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const finding of findings) {
    const key = normalizeFindingSummary(finding.summary)
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(finding.summary.replace(/\s+/g, ' ').trim())
    if (out.length >= 5) break
  }
  return out
}

export function fingerprintFindings(findings: Array<{ type: string; summary: string }>): string {
  return [
    ...new Set(
      findings.map((finding) => `${finding.type}:${normalizeFindingSummary(finding.summary)}`),
    ),
  ]
    .sort()
    .join('|')
}

export function qcSlackAnchorFromCase(item: {
  snoozed_until?: string | null
  first_seen_at?: string
  metadata: Record<string, unknown>
}): QcDeliveryAnchor | null {
  const channel =
    typeof item.metadata.slack_channel === 'string' ? item.metadata.slack_channel.trim() : ''
  const parentTs =
    typeof item.metadata.slack_parent_ts === 'string' ? item.metadata.slack_parent_ts.trim() : ''
  if (!channel || !parentTs) return null
  return {
    slack_channel: channel,
    slack_parent_ts: parentTs,
    slack_finding_fingerprint:
      typeof item.metadata.slack_finding_fingerprint === 'string'
        ? item.metadata.slack_finding_fingerprint
        : '',
    slack_last_follow_up_at:
      typeof item.metadata.slack_last_follow_up_at === 'string'
        ? item.metadata.slack_last_follow_up_at
        : null,
    snoozed_until: item.snoozed_until ?? null,
    first_seen_at: item.first_seen_at,
  }
}

export function decideQcSlackDelivery(input: {
  now: Date
  fingerprint: string
  clientLabel: string | null
  summaries: string[]
  anchor: QcDeliveryAnchor | null
}): QcSlackDeliveryDecision {
  if (!input.anchor) return { mode: 'top_level' }
  if (input.anchor.snoozed_until && Date.parse(input.anchor.snoozed_until) > input.now.getTime()) {
    return { mode: 'skip' }
  }
  const lastFollowUp = Date.parse(
    input.anchor.slack_last_follow_up_at || input.anchor.first_seen_at || '',
  )
  const elapsed = Number.isFinite(lastFollowUp) ? input.now.getTime() - lastFollowUp : Infinity
  if (elapsed < QC_FOLLOW_UP_COOLDOWN_MS) return { mode: 'skip' }
  const unchanged = input.fingerprint === input.anchor.slack_finding_fingerprint
  return {
    mode: 'thread',
    text: unchanged
      ? QC_FOLLOW_UP_MESSAGES.unchanged(input.clientLabel)
      : QC_FOLLOW_UP_MESSAGES.changed(input.clientLabel, input.summaries),
  }
}
