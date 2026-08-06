export type SlackTeamSignalMessageKind =
  | 'unanswered_question'
  | 'workflow_discovery'
  | 'client_risk'
  | 'brain_memory'
  | 'team_win'
  | 'important_update'
  | 'decision'
  | 'strategic_opportunity'
  | string

export type SlackTeamSignalMessageItem = {
  subjectName: string
  channelName: string
  kind: SlackTeamSignalMessageKind
  finding: string
}

export type SlackTeamSignalComposeOptions = {
  recipientName?: string
  now?: Date
}

const LEGACY_DISCLAIMER =
  'Review the source and coordinate the response internally. Pixel will not message the external person.'

export const SLACK_TEAM_DIGEST_THREAD_HOURS = 12

export function humanizeSignalKind(kind: SlackTeamSignalMessageKind): string {
  return String(kind || 'signal').replaceAll('_', ' ')
}

export function firstNameFromDisplay(displayName: string): string {
  const trimmed = displayName.trim()
  if (!trimmed) return 'there'
  return trimmed.split(/\s+/)[0] || 'there'
}

export function channelLabel(channelName: string): string {
  const bare = channelName.replace(/^#/, '').trim() || 'unknown'
  return `#${bare}`
}

export function suggestedActionFor(kind: SlackTeamSignalMessageKind): string {
  switch (kind) {
    case 'unanswered_question':
      return 'Want a reply drafted for you?'
    case 'workflow_discovery':
      return 'Want me to turn that into a short automation proposal for the team?'
    case 'client_risk':
      return 'Want me to draft an internal status note or client reply?'
    case 'team_win':
      return 'Worth sharing with the team or turning into a quick win recap?'
    case 'decision':
      return 'Want me to turn that into a clear owner and next-step note?'
    case 'important_update':
      return 'Want me to help move the next step forward?'
    case 'strategic_opportunity':
      return 'Want me to take the first pass on it?'
    default:
      return 'Want me to draft a next step for you?'
  }
}

function signalLabel(kind: SlackTeamSignalMessageKind): string {
  switch (kind) {
    case 'unanswered_question':
      return 'Asked'
    case 'workflow_discovery':
      return 'Flagged'
    case 'client_risk':
      return 'Needs eyes'
    case 'team_win':
      return 'Win 🎉'
    case 'important_update':
      return 'Update'
    case 'decision':
      return 'Decision'
    case 'strategic_opportunity':
      return 'Opportunity'
    default:
      return 'Noted'
  }
}

export function extractSignalFinding(proposedContent: string): string {
  const trimmed = proposedContent.trim()
  if (!trimmed) return ''
  const withoutDisclaimer = trimmed.includes(LEGACY_DISCLAIMER)
    ? trimmed.replace(LEGACY_DISCLAIMER, '').trim()
    : trimmed
  const parts = withoutDisclaimer
    .split(/\n\n+/)
    .map((part) => part.trim())
    .filter(Boolean)
  if (parts.length >= 2 && /raised a .+ in #/.test(parts[0] ?? '')) {
    return parts.slice(1).join('\n\n').trim()
  }
  // Drop personalized greeting / closing if a framed message was stored as proposed_content.
  const bodyParts = parts.filter(
    (part) =>
      !/^Hey\b/i.test(part) &&
      !/^Morning\b/i.test(part) &&
      !/^Quick flag\b/i.test(part) &&
      !/^One more\b/i.test(part) &&
      !/^A couple more\b/i.test(part) &&
      !/^Say the word\b/i.test(part) &&
      !/^Want (a|me)\b/i.test(part),
  )
  if (bodyParts.length === 0) return withoutDisclaimer
  if (bodyParts.length === 1) return bodyParts[0]!
  // Prefer the concrete finding sentence over the narrative wrapper when both exist.
  const narrative = bodyParts.find((part) =>
    /(flagged|had a question|posted asking|raised a risk|came up in)/i.test(part),
  )
  if (narrative && bodyParts.length >= 2) {
    const findingPart = bodyParts.find((part) => part !== narrative)
    if (findingPart && findingPart.length < narrative.length) return findingPart
  }
  return bodyParts.join('\n\n').trim()
}

export function composeGreeting(recipientName: string | undefined, now = new Date()): string {
  const first = firstNameFromDisplay(recipientName || 'there')
  const weekday = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    timeZone: 'America/Los_Angeles',
  }).format(now)
  const hour = Number(
    new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      hourCycle: 'h23',
      timeZone: 'America/Los_Angeles',
    }).format(now),
  )
  const variants = [
    weekday === 'Friday'
      ? `Happy Friday ${first} 🎉 Here is what stood out today.`
      : `Hey ${first} 👋 Here is what stood out today.`,
    `Hey ${first} 👋 A few useful things surfaced today.`,
    hour < 12
      ? `Morning ${first} 👋 Here is the latest team pulse.`
      : hour < 17
        ? `Hey ${first} 👋 Here is the latest team pulse.`
        : `Hey ${first} 👋 Here is what mattered most on ${weekday}.`,
    `Hey ${first} 👋 I pulled together the most useful updates from today.`,
  ]
  const index = (now.getUTCDate() + now.getUTCHours()) % variants.length
  return variants[index]!
}

export function embedFindingClause(finding: string): string {
  const cleaned = extractSignalFinding(finding)
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.?!]+$/g, '')
  if (!cleaned) return 'this'
  return cleaned.charAt(0).toLowerCase() + cleaned.slice(1)
}

export function composeNarrativeItem(item: SlackTeamSignalMessageItem): string {
  const channel = channelLabel(item.channelName)
  const findingClause = embedFindingClause(item.finding)
  const subject = item.subjectName.trim() || 'Someone'
  return `*${subject} in ${channel}*\n${signalLabel(item.kind)}: ${findingClause}.`
}

export function composeInternalEscalation(
  input: SlackTeamSignalMessageItem,
  options: SlackTeamSignalComposeOptions = {},
): string {
  return [
    composeGreeting(options.recipientName, options.now),
    composeNarrativeItem(input),
    suggestedActionFor(input.kind),
  ].join('\n\n')
}

export function composeDigestMessage(
  items: SlackTeamSignalMessageItem[],
  options: SlackTeamSignalComposeOptions = {},
): string {
  if (items.length === 0) return ''
  if (items.length === 1) return composeInternalEscalation(items[0]!, options)
  const body = items
    .map((item, index) => `${index + 1}. ${composeNarrativeItem(item)}`)
    .join('\n\n')
  return [
    composeGreeting(options.recipientName, options.now),
    body,
    'Want me to take the first pass on any of these?',
  ].join('\n\n')
}

export function composeThreadFollowUp(
  items: SlackTeamSignalMessageItem[],
  options: SlackTeamSignalComposeOptions = {},
): string {
  if (items.length === 0) return ''
  const first = firstNameFromDisplay(options.recipientName || 'there')
  if (items.length === 1) {
    return [
      `One more for you, ${first} 👋 This is still open:`,
      composeNarrativeItem(items[0]!),
      suggestedActionFor(items[0]!.kind),
    ].join('\n\n')
  }
  return [
    `A couple more for you, ${first}:`,
    items.map((item, index) => `${index + 1}. ${composeNarrativeItem(item)}`).join('\n\n'),
    'Want me to draft replies or next steps on any of these?',
  ].join('\n\n')
}

export function signalMessageItemFromAction(input: {
  proposedContent: string
  metadata: Record<string, unknown>
}): SlackTeamSignalMessageItem {
  const subjectName =
    typeof input.metadata.subject_display_name === 'string' &&
    input.metadata.subject_display_name.trim()
      ? input.metadata.subject_display_name.trim()
      : typeof input.metadata.source_sender_display_name === 'string' &&
          input.metadata.source_sender_display_name.trim()
        ? input.metadata.source_sender_display_name.trim()
        : 'Someone'
  const channelName =
    typeof input.metadata.source_channel_name === 'string' &&
    input.metadata.source_channel_name.trim()
      ? input.metadata.source_channel_name.trim()
      : 'unknown'
  const kind =
    typeof input.metadata.signal_kind === 'string' && input.metadata.signal_kind.trim()
      ? input.metadata.signal_kind.trim()
      : 'signal'
  const storedFinding =
    typeof input.metadata.signal_finding === 'string' && input.metadata.signal_finding.trim()
      ? input.metadata.signal_finding.trim()
      : null
  const sourceMessage =
    typeof input.metadata.source_message_text === 'string' &&
    input.metadata.source_message_text.trim()
      ? input.metadata.source_message_text.trim()
      : null
  return {
    subjectName,
    channelName,
    kind,
    finding:
      storedFinding ??
      (kind === 'unanswered_question' || kind === 'client_risk' ? sourceMessage : null) ??
      extractSignalFinding(input.proposedContent),
  }
}
