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
    'The Google Doc will be screen-shared with the client and used to run the call. An account manager must be able to scan it in two minutes, understand the account, and lead the meeting confidently.',
    'CRITICAL RULE: Always draft replies and emails. Never send Slack messages, emails, or DMs.',
    'CLIENT SAFETY: Use only facts tied to the mapped client or supplied source pack. Never mention another client. Exclude confidential personnel, sales, or agency-only matters unless they directly affect this client and are safe to screen-share.',
    'CLIENT-FACING VOICE: Write in plain English. Be concise, confident, useful, and favorable to the work completed without exaggerating results. Never expose internal data plumbing, source availability, missing integrations, diagnostic questions, or uncertainty about how ROAS prepared the meeting.',
    'EVIDENCE: Never invent metrics or work completed. Use the reporting date range and only the facts supplied. If a metric or update is unavailable, omit it rather than writing a caveat or placeholder.',
    'Do not add timestamps, minute ranges, a timed run-of-show, speaker instructions, or mechanical labels such as State, Evidence, What changed / learned, Recommended next move, Confirm, Assign owner, or Diagnostic question.',
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
    "## What's on the agenda?",
    'Four to six short topic labels only. Use markdown bullets; Page Grader converts them to native Google Doc checkboxes. Do not explain the topics in this section.',
    '## What we worked on this week',
    'Three to five concrete client-safe updates from Meetings context, Slack, tasks, campaign activity, and supplied memories. Describe completed work in natural language, not internal workflow language.',
    "## What we're working on next week",
    'Three to five specific priorities already supported by the context. Frame each as the plan, not as a question or tentative suggestion.',
    '## Raw performance data',
    'Show the reporting range, account totals, then one concise line for every live campaign with spend, leads, and CPL where supplied. Keep this factual and easy to scan; do not add source caveats or analysis paragraphs.',
    '## Wins',
    'Two to four plain-English wins that a client will immediately understand. Explain the useful result without inflated strategic language.',
    '## Campaign notes / recommendations',
    'Two to five short, specific observations or recommendations. Name the campaign when relevant, but write like an experienced account manager—not a system report.',
    '## Needs / blockers',
    'Only genuine approvals, assets, feedback, or decisions needed from the client. Phrase each as a clean client request. If nothing is blocking progress, write “Nothing blocking progress this week.”',
    '',
    'These exact sections feed the client Google Doc. Do not include placeholders such as “review performance”, “discuss blockers”, “none captured”, “pending”, “data unavailable”, “not supplied”, or “see dashboard”.',
    'Do not mention Brain, Page Grader, MCP, Portal, Meta dashboard, CRM source, source pack, snapshot availability, data freshness, or internal preparation systems in the output.',
    '',
    input.relatedContext?.trim()
      ? `Related context from Meetings space:\n${input.relatedContext.trim()}`
      : 'No prior Meeting notes were attached. Use calendar details and general operating judgment.',
    '',
    input.pageGraderContext?.trim()
      ? `ROAS Portal / Page Grader context pack:\n${input.pageGraderContext.trim()}`
      : '',
    '',
    'Keep the full document concise enough to fit within two pages before ad previews. Prefer one clear sentence per bullet.',
  ]
    .filter(Boolean)
    .join('\n')
}

/** Parse Vibey prep markdown into Google Doc agenda sections. */
export function parsePrepDocToAgendaSections(body: string): {
  agenda: string
  this_week: string
  next_week: string
  wins: string
  campaign_notes: string
  needs_blockers: string
  performance?: string
} {
  const text = normalizePrepDocumentText(String(body ?? ''))
  const get = (...titles: string[]) => extractMarkdownSection(text, titles)
  const talking = get('Talking points', 'Talking Points')
  const approach = get('Suggested approach', 'Suggested Approach')
  const accomplished = get('What we accomplished', 'What We Accomplished')
  const agenda =
    get("What's on the agenda?", 'Agenda', 'Discussion agenda', 'Meeting agenda') ||
    [talking, approach].filter(Boolean).join('\n\n')
  const thisWeek =
    get('What we worked on this week', 'Work completed this week', 'This week') || accomplished
  const nextWeek = get(
    "What we're working on next week",
    'What we are working on next week',
    'Next week',
  )
  const wins = get('Wins', 'Progress / wins', 'Progress and wins') || accomplished
  const campaignNotes = get(
    'Campaign notes',
    'Campaign Notes',
    'Campaign analysis',
    'Campaign notes / recommendations',
  )
  const needs = get(
    'Needs / blockers',
    'Needs/Blockers',
    'Needs / Blockers',
    'Commitments / next steps',
  )
  const performance = get('RAW PERFORMANCE DATA', 'Performance', 'Performance data')
  return {
    agenda,
    this_week: thisWeek,
    next_week: nextWeek,
    wins,
    campaign_notes: campaignNotes,
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
  /\b(?:data|source|snapshot|crm)[^\n.]{0,50}(?:unavailable|not supplied|not connected|was not supplied)/i,
  /available (?:meta |crm |performance )?snapshot/i,
  /data freshness/i,
  /diagnostic question/i,
  /confirm the primary success measure/i,
  /lock commitments/i,
  /assign owners? and dates?/i,
  /reporting checkpoint/i,
  /\b\d{1,2}\s*[-–]\s*\d{1,2}\s*(?:minutes?|mins?)\b/i,
]

export function validateMeetingReadyAgendaSections(sections: MeetingReadyAgendaSections): string[] {
  const fields: Array<[string, string | undefined]> = [
    ['Agenda', sections.agenda],
    ['What we worked on this week', sections.this_week],
    ["What we're working on next week", sections.next_week],
    ['Performance', sections.performance],
    ['Wins', sections.wins],
    ['Campaign notes', sections.campaign_notes],
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
