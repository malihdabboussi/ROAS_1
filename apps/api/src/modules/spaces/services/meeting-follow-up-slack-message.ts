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
export function briefMeetingSummary(callItem: Record<string, unknown> | null): string {
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
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  const purpose = extractSummarySection(
    cleaned,
    ['Meeting Purpose', 'Purpose'],
    ['Key Takeaways', 'Takeaways', 'Topics', 'Next Steps', 'Action Items'],
  )
  const takeaways = extractSummarySection(
    cleaned,
    ['Key Takeaways', 'Takeaways'],
    ['Topics', 'Next Steps', 'Action Items', 'Solutions'],
  )
  const nextSteps = extractSummarySection(
    cleaned,
    ['Next Steps', 'Action Items'],
    ['Topics', 'Solutions'],
  )

  const parts: string[] = []
  if (purpose) parts.push(`*Purpose*\n${purpose}`)
  if (takeaways) parts.push(`*Key takeaways*\n${takeaways}`)
  if (nextSteps) parts.push(`*From the call*\n${nextSteps}`)
  const brief = parts.length > 0 ? parts.join('\n\n') : cleaned
  return markdownLinksToSlack(brief)
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
    .replace(/^\s*[-*]\s+/gm, '• ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function markdownLinksToSlack(text: string): string {
  return text.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
    (_match, label: string, url: string) => {
      const clean = String(label).replace(/:\s*$/, '').trim()
      return `<${url}|${clean || 'link'}>`
    },
  )
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
    '',
    ...(brief ? [brief, ''] : []),
    `*Action items*`,
    ...lines,
    '',
    ...(fathomUrl ? [`<${fathomUrl}|Open Fathom recording>`, ''] : []),
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
  const brief = briefMeetingSummary(input.callItem)
  const fathomUrl = resolveFathomUrl(input.callItem)
  const lines = input.followUps.map((item, index) => formatFollowUpLine(item, index))

  return [
    `*Meeting follow-ups ready for review*`,
    `*${title}*`,
    '',
    ...(brief ? [brief, ''] : []),
    ...(fathomUrl ? [`<${fathomUrl}|Open Fathom recording>`, ''] : []),
    `*Proposed action items*`,
    ...lines,
    '',
    `React with :${input.confirmReaction}: to confirm — I'll post a shareable recap in this thread.`,
    `Reply in this thread if anything should change (feedback loop ships next).`,
    `<${input.meetingUrl}|Open in Meetings>`,
  ].join('\n')
}
