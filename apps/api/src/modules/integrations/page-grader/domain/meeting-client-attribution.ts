export type MeetingAttributionClient = {
  id: string
  name: string
  websiteUrl?: string | null
  campaignName?: string | null
}

export type MeetingAttributionSignal = {
  kind: 'invitee_domain' | 'title_alias' | 'context_alias' | 'attendee_alias'
  value: string
  weight: number
}

export type MeetingClientAttribution = {
  status: 'matched' | 'suggested' | 'ambiguous' | 'unresolved'
  confidence: number
  matches: Array<{ id: string; name: string; matched_by: string }>
  candidates: Array<{
    id: string
    name: string
    confidence: number
    signals: MeetingAttributionSignal[]
  }>
}

export function attributeMeetingClient(input: {
  title: string
  contextText: string
  narrativeText?: string
  attendees: Array<Record<string, unknown>>
  clients: MeetingAttributionClient[]
}): MeetingClientAttribution {
  const title = normalize(input.title)
  const context = normalize(input.contextText)
  const narrative = normalize(input.narrativeText)
  const attendeeEvidence = input.attendees
    .flatMap((attendee) => [text(attendee.name), text(attendee.email)])
    .filter(Boolean)
    .join(' ')
  const normalizedAttendees = normalize(attendeeEvidence)
  const inviteeDomains = input.attendees
    .map((attendee) => domain(text(attendee.email)))
    .filter((value): value is string => Boolean(value) && !INTERNAL_DOMAINS.has(value!))

  const candidates = input.clients
    .map((client) => {
      const aliases = unique([normalize(client.name), normalize(client.campaignName)]).filter(
        (alias) => alias.length >= 4,
      )
      const signals: MeetingAttributionSignal[] = []
      const websiteDomain = domain(client.websiteUrl ?? '')
      if (
        websiteDomain &&
        inviteeDomains.some(
          (invitee) =>
            invitee === websiteDomain ||
            invitee.endsWith(`.${websiteDomain}`) ||
            websiteDomain.endsWith(`.${invitee}`),
        )
      ) {
        signals.push({ kind: 'invitee_domain', value: websiteDomain, weight: 100 })
      }
      const attendeeAlias = aliases.find((alias) =>
        compact(normalizedAttendees).includes(compact(alias)),
      )
      if (attendeeAlias) {
        signals.push({ kind: 'attendee_alias', value: attendeeAlias, weight: 96 })
      }
      const titleAlias = aliases.find((alias) => containsPhrase(title, alias))
      if (titleAlias) signals.push({ kind: 'title_alias', value: titleAlias, weight: 92 })
      const contextAlias = aliases.find((alias) => containsPhrase(context, alias))
      if (contextAlias) signals.push({ kind: 'context_alias', value: contextAlias, weight: 90 })
      const narrativeAlias = aliases.find((alias) => containsPhrase(narrative, alias))
      if (narrativeAlias) {
        signals.push({ kind: 'context_alias', value: narrativeAlias, weight: 84 })
      }
      return {
        id: client.id,
        name: client.name,
        confidence: signals.reduce((max, signal) => Math.max(max, signal.weight), 0),
        signals,
      }
    })
    .filter((candidate) => candidate.confidence > 0)
    .sort((left, right) => right.confidence - left.confidence)

  const best = candidates[0]
  if (!best) return { status: 'unresolved', confidence: 0, matches: [], candidates: [] }
  const tied = candidates.filter((candidate) => candidate.confidence === best.confidence)
  if (tied.length > 1) {
    return { status: 'ambiguous', confidence: best.confidence, matches: [], candidates }
  }
  if (best.confidence < 90) {
    return { status: 'suggested', confidence: best.confidence, matches: [], candidates }
  }
  return {
    status: 'matched',
    confidence: best.confidence,
    matches: [{ id: best.id, name: best.name, matched_by: best.signals[0]!.kind }],
    candidates,
  }
}

const INTERNAL_DOMAINS = new Set([
  'roas.co',
  'roas.io',
  'dylanvanas.com',
  'gmail.com',
  'googlemail.com',
  'outlook.com',
  'hotmail.com',
  'yahoo.com',
  'icloud.com',
])

function containsPhrase(haystack: string, needle: string): boolean {
  return (
    haystack === needle ||
    haystack.startsWith(`${needle} `) ||
    haystack.includes(` ${needle} `) ||
    haystack.endsWith(` ${needle}`)
  )
}

function compact(value: string): string {
  return value.replace(/\s+/g, '')
}

function normalize(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function domain(value: string): string | null {
  const emailAt = value.lastIndexOf('@')
  if (emailAt >= 0)
    return (
      value
        .slice(emailAt + 1)
        .toLowerCase()
        .replace(/^www\./, '') || null
    )
  try {
    return new URL(value.includes('://') ? value : `https://${value}`).hostname
      .toLowerCase()
      .replace(/^www\./, '')
  } catch {
    return null
  }
}

function unique(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))]
}
