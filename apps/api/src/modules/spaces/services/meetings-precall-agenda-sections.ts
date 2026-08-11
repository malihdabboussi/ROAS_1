export type PrecallAgendaEventLike = {
  id: string
  title: string
  start: string
  end: string
  all_day: boolean
  video_url: string | null
  operator_notes?: string | null
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
    'You are the senior account strategist preparing a live client meeting workspace for a performance marketing agency.',
    'The Google Doc will be screen-shared with the client and used to run the call. It must be specific, evidence-based, decision-oriented, and polished.',
    'CRITICAL RULE: Always draft replies and emails. Never send Slack messages, emails, or DMs.',
    'CLIENT SAFETY: Use only facts tied to the mapped client or supplied source pack. Never mention another client. Exclude confidential personnel, sales, or agency-only matters unless they directly affect this client and are safe to screen-share.',
    'EVIDENCE: Never invent metrics. Give the reporting range and freshness for performance data. If a source is unavailable, say exactly which source is unavailable and replace the missing metric with a useful diagnostic question—not a generic dashboard placeholder.',
    '',
    `Meeting: ${input.event.title}`,
    `When: ${input.event.start} → ${input.event.end}`,
    `Attendees: ${attendees || 'Unknown'}`,
    input.event.video_url ? `Join link: ${input.event.video_url}` : '',
    input.pageGraderClientName ? `Mapped ROAS Portal client: ${input.pageGraderClientName}` : '',
    input.event.operator_notes?.trim()
      ? `Operator instructions for this meeting:\n${input.event.operator_notes.trim()}`
      : '',
    '',
    'Document sections (use these exact markdown headings):',
    '## Agenda',
    'A timed or ordered run-of-show. Every item must say why it matters and the decision or outcome needed.',
    '## Performance',
    'Actual available Meta/CRM metrics, comparison period, interpretation, and the 1–3 implications that should drive discussion.',
    '## Wins',
    'Only evidenced progress since the last meeting; connect each win to business impact.',
    '## Campaign notes',
    'For every active campaign in the source pack, include its state, dated evidence, what changed or was learned, and a specific recommended next move. Never collapse this to a generic summary.',
    '## Other updates',
    'Decisions needed, strategic questions, client inputs, and material delivery updates.',
    '## Needs / blockers',
    'Concrete commitments and blockers with an owner and date wherever the source supports them.',
    '',
    'These exact sections feed the client Google Doc. Do not include placeholders such as “review performance”, “discuss blockers”, “none captured”, or “see dashboard”.',
    '',
    input.relatedContext?.trim()
      ? `Related context from Meetings space:\n${input.relatedContext.trim()}`
      : 'No prior Meeting notes were attached. Use calendar details and general operating judgment.',
    '',
    input.pageGraderContext?.trim()
      ? `ROAS Portal / Page Grader context pack:\n${input.pageGraderContext.trim()}`
      : '',
    '',
    'Keep it concise enough to guide a 30–60 minute call. Prioritize decisions and next actions over background exposition.',
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
  const text = normalizePrepDocumentText(String(body ?? ''))
  const get = (...titles: string[]) => extractMarkdownSection(text, titles)
  const talking = get('Talking points', 'Talking Points')
  const approach = get('Suggested approach', 'Suggested Approach')
  const snapshot = get('Snapshot')
  const accomplished = get('What we accomplished', 'What We Accomplished')
  const openQuestions = get('Open questions', 'Open Questions')
  const agenda =
    get('Agenda', 'Discussion agenda', 'Meeting agenda') ||
    [talking, approach].filter(Boolean).join('\n\n')
  const wins = get('Wins', 'Progress / wins', 'Progress and wins') || accomplished
  const campaignNotes = get(
    'Campaign notes',
    'Campaign Notes',
    'Campaign analysis',
    'Campaign notes / recommendations',
  )
  const otherUpdates =
    get('Other updates', 'Other Updates', 'Decisions needed') ||
    [snapshot, openQuestions].filter(Boolean).join('\n\n')
  const needs = get(
    'Needs / blockers',
    'Needs/Blockers',
    'Needs / Blockers',
    'Commitments / next steps',
  )
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

export type MeetingReadyAgendaSections = ReturnType<typeof parsePrepDocToAgendaSections>

const LAZY_PLACEHOLDER_PATTERNS = [
  /review weekly performance/i,
  /discuss blockers/i,
  /align next steps/i,
  /none captured/i,
  /see (?:the )?(?:portal )?(?:meta|crm|performance).*(?:dashboard|latest)/i,
]

export function validateMeetingReadyAgendaSections(sections: MeetingReadyAgendaSections): string[] {
  const fields: Array<[string, string | undefined]> = [
    ['Agenda', sections.agenda],
    ['Performance', sections.performance],
    ['Wins', sections.wins],
    ['Campaign notes', sections.campaign_notes],
    ['Other updates', sections.other_updates],
    ['Needs / blockers', sections.needs_blockers],
  ]
  const problems: string[] = []
  for (const [label, value] of fields) {
    const text = value?.trim() ?? ''
    if (text.length < 12) {
      problems.push(`${label} is missing or too thin`)
      continue
    }
    if (LAZY_PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(text))) {
      problems.push(`${label} contains placeholder language`)
    }
  }
  return problems
}

export function buildGoogleDocTabLink(docLink: string, tabId: string): string {
  try {
    const url = new URL(docLink)
    url.hash = ''
    url.searchParams.set('tab', tabId)
    return url.toString()
  } catch {
    return docLink
  }
}

/** save_document persists rich text as HTML, while older agents returned markdown. */
export function normalizePrepDocumentText(value: string): string {
  const text = value.trim()
  if (!text) return ''
  if (!/<\/?[a-z][\s\S]*>/i.test(text)) return text
  return text
    .replace(
      /<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi,
      (_match, title) => `\n## ${stripHtml(String(title))}\n`,
    )
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_match, item) => `\n- ${stripHtml(String(item))}`)
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/p\s*>/gi, '\n')
    .replace(/<\/div\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .trim()
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
