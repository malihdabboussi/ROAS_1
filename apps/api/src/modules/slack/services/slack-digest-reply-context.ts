export type DigestReplyEvidenceItem = {
  channelName: string
  kind: string
  finding: string
  sourceText: string
}

export function formatTeamIntelligenceDigestEvidence(items: DigestReplyEvidenceItem[]): string {
  if (items.length === 0) return ''
  const lines = items.map((item, index) => {
    const finding = item.finding.trim() || 'No stored finding.'
    const source = item.sourceText.trim() || 'Source text unavailable.'
    return [
      `${index + 1}. #${item.channelName.replace(/^#/, '')} (${item.kind || 'signal'})`,
      `Finding: ${finding}`,
      `Source: ${source.slice(0, 1200)}`,
    ].join('\n')
  })
  return [
    '[Team Intelligence source evidence]',
    'Use this source evidence to answer follow-up questions about the digest. Prefer concrete dates, owners, and amounts from Source over the digest summary alone.',
    ...lines,
  ].join('\n\n')
}

export function digestEvidenceItemsFromActions(
  actions: Array<{
    proposed_content?: string | null
    metadata?: Record<string, unknown> | null
  }>,
): DigestReplyEvidenceItem[] {
  const items: DigestReplyEvidenceItem[] = []
  const seen = new Set<string>()
  for (const action of actions) {
    const metadata =
      action.metadata && typeof action.metadata === 'object'
        ? action.metadata
        : ({} as Record<string, unknown>)
    const channelName =
      typeof metadata.source_channel_name === 'string' && metadata.source_channel_name.trim()
        ? metadata.source_channel_name.trim()
        : 'unknown'
    const kind =
      typeof metadata.signal_kind === 'string' && metadata.signal_kind.trim()
        ? metadata.signal_kind.trim()
        : 'signal'
    const finding =
      typeof metadata.signal_finding === 'string' && metadata.signal_finding.trim()
        ? metadata.signal_finding.trim()
        : String(action.proposed_content ?? '').trim()
    const evidenceMessages = Array.isArray(metadata.personal_moment_evidence)
      ? metadata.personal_moment_evidence
      : []
    const personalMomentSources = evidenceMessages
      .map((entry) => {
        if (!entry || typeof entry !== 'object') return ''
        const row = entry as { text?: unknown; channel_name?: unknown }
        return typeof row.text === 'string' ? row.text.trim() : ''
      })
      .filter(Boolean)
    const sourceText =
      personalMomentSources.length > 0
        ? personalMomentSources.join(' | ')
        : typeof metadata.source_message_text === 'string'
          ? metadata.source_message_text.trim()
          : ''
    const key = `${channelName}:${kind}:${finding.slice(0, 80)}:${sourceText.slice(0, 80)}`
    if (seen.has(key)) continue
    seen.add(key)
    items.push({ channelName, kind, finding, sourceText })
  }
  return items
}
