/** Pure Slack message builders for meeting follow-up confirm DMs. */

export function formatFollowUpLine(item: Record<string, unknown>, index: number): string {
  const title = String(item.title ?? 'Untitled').trim() || 'Untitled'
  const owner = resolveFollowUpOwner(item)
  return owner
    ? `${index + 1}. ${title} — _owner: ${owner}_`
    : `${index + 1}. ${title} — _owner: unassigned_`
}

export function resolveFollowUpOwner(item: Record<string, unknown>): string | null {
  const customData =
    item.custom_data && typeof item.custom_data === 'object'
      ? (item.custom_data as Record<string, unknown>)
      : {}
  const suggestedName = String(customData.suggested_assignee_name ?? '').trim()
  if (suggestedName) return suggestedName
  const suggestedEmail = String(customData.suggested_assignee_email ?? '').trim()
  if (suggestedEmail) return suggestedEmail

  const assignees = Array.isArray(item.assignees) ? item.assignees : []
  for (const raw of assignees) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue
    const row = raw as Record<string, unknown>
    const label = String(row.name ?? row.email ?? row.id ?? '').trim()
    if (label) return label
  }

  if (item.assignee_type === 'human' && typeof item.assignee_id === 'string') {
    return item.assignee_id
  }
  return null
}

/**
 * Shareable Slack brief: Purpose + Key Takeaways only (skips long Topics dumps
 * that hit Slack's ~4k char limit mid-word). Converts markdown timestamp links
 * to Slack mrkdwn so Fathom jump-links actually work.
 */
export function briefMeetingSummary(
  callItem: Record<string, unknown> | null,
  options?: { includeNextSteps?: boolean },
): string {
  if (!callItem) return ''
  const customData =
    callItem.custom_data && typeof callItem.custom_data === 'object'
      ? (callItem.custom_data as Record<string, unknown>)
      : {}
  const fromCustom = String(customData.summary ?? '').trim()
  const fromDescription = String(callItem.description ?? '').trim()
  const raw = fromCustom || fromDescription
  if (!raw) return ''

  const cleaned = raw
    .replace(/^#+\s*/gm, '')
    .replace(/\*\*/g, '')
    // Collapse mid-line whitespace only — keep leading indent for nested lists
    .replace(/(?<=\S)[ \t]+/g, ' ')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  const purpose = formatSectionBullets(
    extractSummarySection(
      cleaned,
      ['Meeting Purpose', 'Purpose'],
      ['Key Takeaways', 'Takeaways', 'Topics', 'Next Steps', 'Action Items'],
    ),
  )
  const takeaways = formatSectionBullets(
    extractSummarySection(
      cleaned,
      ['Key Takeaways', 'Takeaways'],
      ['Topics', 'Next Steps', 'Action Items', 'Solutions'],
    ),
  )
  const includeNextSteps = options?.includeNextSteps !== false
  const nextSteps = includeNextSteps
    ? formatOwnerGroupedNextSteps(
        extractSummarySection(cleaned, ['Next Steps', 'Action Items'], ['Topics', 'Solutions']),
      )
    : ''

  const parts: string[] = []
  if (purpose) parts.push(`*Purpose*\n${purpose}`)
  if (takeaways) parts.push(`*Key takeaways*\n${takeaways}`)
  if (nextSteps) parts.push(`*From the call*\n${nextSteps}`)
  const brief = parts.length > 0 ? parts.join('\n\n') : markdownLinksToSlack(cleaned)
  return brief
}

export function extractSummarySection(
  raw: string,
  startHeadings: string[],
  endHeadings: string[],
): string {
  const lower = raw.toLowerCase()
  let start = -1
  let headingLen = 0
  for (const heading of startHeadings) {
    const idx = lower.indexOf(heading.toLowerCase())
    if (idx < 0) continue
    if (start < 0 || idx < start) {
      start = idx
      headingLen = heading.length
    }
  }
  if (start < 0) return ''

  let bodyStart = start + headingLen
  while (bodyStart < raw.length && /[:\s]/.test(raw[bodyStart] ?? '')) bodyStart++

  let end = raw.length
  for (const heading of endHeadings) {
    const idx = lower.indexOf(heading.toLowerCase(), bodyStart)
    if (idx >= 0 && idx < end) end = idx
  }

  return raw
    .slice(bodyStart, end)
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** Fathom often stores owners as `[Nate:](timestamp-url)` bullets — plain headers, no links. */
export function formatOwnerGroupedNextSteps(raw: string): string {
  if (!raw.trim()) return ''
  const out: string[] = []
  for (const line of raw.split('\n')) {
    const ownerOnly = line.match(/^[ \t]*[-*][ \t]+\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)\s*$/)
    if (ownerOnly) {
      const name = String(ownerOnly[1]).replace(/:\s*$/, '').trim()
      if (!name) continue
      if (out.length > 0) out.push('')
      // Drop the Fathom timestamp URL — ownership already shows on action items.
      const possessive = name.toLowerCase().endsWith('s') ? `${name}'` : `${name}'s`
      out.push(`*${possessive} action items*`)
      continue
    }

    const task = line.match(/^[ \t]*[-*][ \t]+(.+)$/)
    if (task) {
      out.push(`• ${markdownLinksToSlack(task[1].trim())}`)
      continue
    }

    const trimmed = line.trim()
    if (trimmed) out.push(markdownLinksToSlack(trimmed))
  }
  return out.join('\n').trim()
}

export function formatSectionBullets(raw: string): string {
  if (!raw.trim()) return ''
  return markdownLinksToSlack(
    raw
      .replace(/^[ \t]*[-*][ \t]+/gm, '• ')
      .replace(/\n{3,}/g, '\n\n')
      .trim(),
  )
}

/** Format Fathom `timestamp=` seconds as M:SS or H:MM:SS for a visible jump cue. */
export function formatFathomTimestampLabel(seconds: number): string {
  const total = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

/**
 * Convert markdown links to Slack mrkdwn.
 * Fathom timestamp jump links become `<url|M:SS> label` so the clickable cue is first.
 */
export function markdownLinksToSlack(text: string): string {
  return text.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
    (_match, label: string, url: string) => {
      const clean = String(label).replace(/:\s*$/, '').trim()
      const tsMatch = String(url).match(/[?&]timestamp=(\d+(?:\.\d+)?)/i)
      if (tsMatch) {
        const stamp = formatFathomTimestampLabel(Number(tsMatch[1]))
        return clean ? `<${url}|${stamp}> ${clean}` : `<${url}|${stamp}>`
      }
      return `<${url}|${clean || 'link'}>`
    },
  )
}

/** Strip trailing “Open … recording” footers from agent drafts (recording lives at the top). */
export function stripTrailingRecordingFooter(text: string): string {
  return text
    .replace(
      /\n*(?:<[^|>]+\|\s*(?:Open (?:the )?call recording|Open Fathom recording)\s*>|(?:Open (?:the )?call recording|Open Fathom recording))\s*$/i,
      '',
    )
    .trim()
}

export function resolveFathomUrl(callItem: Record<string, unknown> | null): string | null {
  if (!callItem) return null
  const customData =
    callItem.custom_data && typeof callItem.custom_data === 'object'
      ? (callItem.custom_data as Record<string, unknown>)
      : {}
  for (const key of ['fathom_url', 'recording_url', 'meeting_url', 'url'] as const) {
    const value = String(customData[key] ?? '').trim()
    if (value.startsWith('http')) return value
  }
  const columnUrl = String(callItem.recording_url ?? '').trim()
  return columnUrl.startsWith('http') ? columnUrl : null
}

export function buildShareableConfirmReply(input: {
  callItem: Record<string, unknown> | null
  followUps: Array<Record<string, unknown>>
}): string {
  const title = String(input.callItem?.title ?? 'Meeting').trim() || 'Meeting'
  const brief = briefMeetingSummary(input.callItem)
  const fathomUrl = resolveFathomUrl(input.callItem)
  const lines = input.followUps.map((item, index) => formatFollowUpLine(item, index))

  return [
    `*Meeting recap: ${title}*`,
    ...(fathomUrl ? [`<${fathomUrl}|Call report>`, ''] : ['']),
    ...(brief ? [brief, ''] : []),
    `*Action items*`,
    ...lines,
    '',
    `_Copy/forward this recap to a channel or the other attendees. Confirmed in ROAS — not sent to Page Grader yet._`,
  ].join('\n')
}

export function buildConfirmMessage(input: {
  callTitle: string
  callItem: Record<string, unknown> | null
  followUps: Array<Record<string, unknown>>
  confirmReaction: string
  meetingUrl: string
}): string {
  const title = String(input.callTitle || 'Meeting').trim() || 'Meeting'
  // Keep the review DM under Slack's ~4k limit: purpose + takeaways + action items only.
  // The shareable recap is a separate threaded message (see buildProposedShareableRecapMessage).
  const brief = briefMeetingSummary(input.callItem, { includeNextSteps: false })
  const fathomUrl = resolveFathomUrl(input.callItem)
  const lines = input.followUps.map((item, index) => formatFollowUpLine(item, index))

  return [
    `*Meeting follow-ups ready for review*`,
    // Recording at top as a short call-report link (saves a bottom “Open Fathom” line).
    ...(fathomUrl ? [`<${fathomUrl}|Call report>`, `*${title}*`] : [`*${title}*`]),
    '',
    ...(brief ? [brief, ''] : []),
    `*Proposed action items*`,
    ...lines,
    '',
    `React with :${input.confirmReaction}: to confirm — I'll post a shareable recap in this thread.`,
    `Reply in this thread with any changes. I'll return an updated client-facing draft here.`,
    `<${input.meetingUrl}|Open in Meetings>`,
  ].join('\n')
}

/** Client-facing draft as its own Slack message (threaded under the review DM). */
export function buildProposedShareableRecapMessage(input: {
  shareableDraft: string
  fathomUrl?: string | null
}): string {
  const draft = stripTrailingRecordingFooter(markdownLinksToSlack(input.shareableDraft.trim()))
  if (!draft) return ''
  const fathomUrl = String(input.fathomUrl ?? '').trim()
  return [
    '*Proposed shareable recap*',
    '',
    ...(fathomUrl ? [`<${fathomUrl}|Call report>`, ''] : []),
    draft,
  ].join('\n')
}
