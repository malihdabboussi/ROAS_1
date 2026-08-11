export type PrecallAgendaEventLike = {
  id: string
  title: string
  start: string
  end: string
  all_day: boolean
  video_url: string | null
  attendees: Array<{ email?: string | null; name?: string | null }>
}

export type AgendaPrepLink = {
  status: 'pending' | 'ready' | 'failed'
  space_item_id: string
  space_id: string
  title: string | null
  agenda_doc_link?: string | null
  agenda_tab_id?: string | null
}

export function mapPrepItemToAgendaLink(row: {
  id: string
  space_id: string
  title?: string | null
  custom_data?: Record<string, unknown> | null
  task_execution_status?: string | null
}): AgendaPrepLink {
  const custom = row.custom_data ?? {}
  const raw = String(custom.prep_status ?? 'pending')
  let status: AgendaPrepLink['status'] =
    raw === 'ready' || raw === 'failed' || raw === 'pending' ? raw : 'pending'
  const exec = String(row.task_execution_status ?? '').toLowerCase()
  if (status === 'pending' && (exec === 'failed' || exec === 'cancelled')) {
    status = 'failed'
  }
  if (status === 'pending' && (exec === 'done' || exec === 'completed')) {
    status = 'ready'
  }
  return {
    status,
    space_item_id: row.id,
    space_id: row.space_id,
    title: row.title ?? null,
    agenda_doc_link: typeof custom.agenda_doc_link === 'string' ? custom.agenda_doc_link : null,
    agenda_tab_id: typeof custom.agenda_tab_id === 'string' ? custom.agenda_tab_id : null,
  }
}

export function buildPrecallPrompt(input: {
  event: PrecallAgendaEventLike
  relatedContext?: string
  pageGraderContext?: string
  pageGraderClientName?: string | null
}): string {
  const attendees = input.event.attendees
    .map((a) => a.name?.trim() || a.email?.trim() || 'Unknown')
    .join(', ')
  return [
    'You are preparing the human for an upcoming meeting. Write a concise pre-call prep document.',
    'CRITICAL RULE: Always draft replies and emails. Never send Slack messages, emails, or DMs.',
    '',
    `Meeting: ${input.event.title}`,
    `When: ${input.event.start} → ${input.event.end}`,
    `Attendees: ${attendees || 'Unknown'}`,
    input.event.video_url ? `Join link: ${input.event.video_url}` : '',
    input.pageGraderClientName ? `Mapped ROAS Portal client: ${input.pageGraderClientName}` : '',
    '',
    'Document sections (use these exact markdown headings):',
    '## Snapshot',
    '## What we accomplished',
    '## Suggested approach',
    '## Talking points',
    '## Open questions',
    '## Agenda',
    '## Wins',
    '## Campaign notes',
    '## Other updates',
    '## Needs / blockers',
    '',
    'The ## Agenda / ## Wins / ## Campaign notes / ## Other updates / ## Needs / blockers sections also feed the client Google Doc meeting agenda — keep them concrete and meeting-ready.',
    '',
    input.relatedContext?.trim()
      ? `Related context from Meetings space:\n${input.relatedContext.trim()}`
      : 'No prior Meeting notes were attached. Use calendar details and general operating judgment.',
    '',
    input.pageGraderContext?.trim()
      ? `ROAS Portal / Page Grader context pack:\n${input.pageGraderContext.trim()}`
      : '',
    '',
    'Keep it short and CEO-usable (1–2 screens).',
  ]
    .filter(Boolean)
    .join('\n')
}

/** Parse Vibey prep markdown into Google Doc agenda sections. */
export function parsePrepDocToAgendaSections(body: string): {
  agenda: string
  wins: string
  campaign_notes: string
  other_updates: string
  needs_blockers: string
  performance?: string
} {
  const text = String(body ?? '').trim()
  const get = (...titles: string[]) => extractMarkdownSection(text, titles)
  const talking = get('Talking points', 'Talking Points')
  const approach = get('Suggested approach', 'Suggested Approach')
  const snapshot = get('Snapshot')
  const accomplished = get('What we accomplished', 'What We Accomplished')
  const openQs = get('Open questions', 'Open Questions')
  const agenda =
    get('Agenda') ||
    [talking, approach].filter(Boolean).join('\n\n') ||
    '• Review weekly performance\n• Discuss blockers\n• Align next steps'
  const wins = get('Wins') || accomplished || '• (none captured)'
  const campaignNotes = get('Campaign notes', 'Campaign Notes') || '• (none captured)'
  const otherUpdates =
    get('Other updates', 'Other Updates') ||
    [snapshot, openQs].filter(Boolean).join('\n\n') ||
    '• (none captured)'
  const needs =
    get('Needs / blockers', 'Needs/Blockers', 'Needs / Blockers', 'Needs') || '- \n- \n- '
  const performance = get('RAW PERFORMANCE DATA', 'Performance', 'Performance data')
  return {
    agenda,
    wins,
    campaign_notes: campaignNotes,
    other_updates: otherUpdates,
    needs_blockers: needs,
    ...(performance ? { performance } : {}),
  }
}

function extractMarkdownSection(markdown: string, titles: string[]): string {
  if (!markdown.trim() || titles.length === 0) return ''
  const lines = markdown.split(/\r?\n/)
  const normalize = (s: string) =>
    s
      .replace(/^#+\s*/, '')
      .trim()
      .toLowerCase()
  const wanted = new Set(titles.map((t) => t.trim().toLowerCase()))
  let start = -1
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.trim()
    if (!/^#{1,3}\s+/.test(line) && !/^\*\*[^*]+\*\*$/.test(line)) continue
    const title = normalize(line.replace(/^\*\*|\*\*$/g, ''))
    if (wanted.has(title)) {
      start = i + 1
      break
    }
  }
  if (start < 0) return ''
  const out: string[] = []
  for (let i = start; i < lines.length; i++) {
    const line = lines[i]!
    const trimmed = line.trim()
    if (/^#{1,3}\s+/.test(trimmed) || /^\*\*[^*]+\*\*$/.test(trimmed)) break
    out.push(line)
  }
  return out.join('\n').trim()
}

export function matchUniqueClientByEventTitle(
  eventTitle: string,
  clients: Array<{ id: string; name: string }>,
): { id: string; name: string } | null {
  const haystack = normalizeLoose(eventTitle)
  if (!haystack) return null
  const hits = clients.filter((client) => {
    const name = normalizeLoose(client.name)
    return name.length >= 4 && haystack.includes(name)
  })
  return hits.length === 1 ? hits[0]! : null
}

function normalizeLoose(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
