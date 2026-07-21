/** Match follow-up text against existing campaigns, Page Grader clients, and Slack People. */

export type NameKnowledgeSource =
  | 'campaign'
  | 'page_grader_client'
  | 'page_grader_scope'
  | 'slack_person'

export type NameKnowledgeEntry = {
  canonical: string
  source: NameKnowledgeSource
}

export function normalizeKnowledgeLabel(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

/** Same matching rules as page-grader client scope tags (exact / substring / first token). */
export function knowledgeNamesMatch(left: string, right: string): boolean {
  const a = normalizeKnowledgeLabel(left)
  const b = normalizeKnowledgeLabel(right)
  if (!a || !b) return false
  if (a === b) return true
  if (a.includes(b) || b.includes(a)) return true
  const aFirst = a.split(' ')[0] ?? ''
  const bFirst = b.split(' ')[0] ?? ''
  return Boolean(aFirst && bFirst && aFirst === bFirst)
}

export function dedupeNameKnowledge(entries: NameKnowledgeEntry[]): NameKnowledgeEntry[] {
  const seen = new Set<string>()
  const out: NameKnowledgeEntry[] = []
  for (const entry of entries) {
    const canonical = entry.canonical.trim()
    if (!canonical) continue
    const key = `${entry.source}:${normalizeKnowledgeLabel(canonical)}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ canonical, source: entry.source })
  }
  return out
}

export function findCanonicalName(
  raw: string,
  catalog: NameKnowledgeEntry[],
): NameKnowledgeEntry | null {
  const needle = raw.trim()
  if (!needle || catalog.length === 0) return null
  for (const entry of catalog) {
    if (knowledgeNamesMatch(needle, entry.canonical)) return entry
  }
  return null
}

/**
 * Deterministic rewrite: replace catalog phrases when the text contains a matching token/phrase.
 * Longer canonicals win first so "Asura Group" beats "Asura".
 */
export function applyCanonicalNameRewrites(text: string, catalog: NameKnowledgeEntry[]): string {
  if (!text || catalog.length === 0) return text
  const sorted = [...catalog].sort((a, b) => b.canonical.length - a.canonical.length)
  let next = text
  for (const entry of sorted) {
    const escaped = entry.canonical.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(`\\b${escaped}\\b`, 'gi')
    next = next.replace(re, entry.canonical)
  }
  return next
}

export function rewriteFollowUpTitlesWithKnowledge(
  items: Array<Record<string, unknown>>,
  catalog: NameKnowledgeEntry[],
): Array<Record<string, unknown>> {
  if (catalog.length === 0) return items
  return items.map((item) => {
    const title = String(item.title ?? '')
    if (!title.trim()) return item
    const rewritten = applyCanonicalNameRewrites(title, catalog)
    if (rewritten === title) return item
    return { ...item, title: rewritten }
  })
}

export function buildNameKnowledgePayload(catalog: NameKnowledgeEntry[]): {
  campaigns: string[]
  page_grader_clients: string[]
  slack_people: string[]
} {
  const campaigns: string[] = []
  const page_grader_clients: string[] = []
  const slack_people: string[] = []
  for (const entry of catalog) {
    if (entry.source === 'campaign') campaigns.push(entry.canonical)
    else if (entry.source === 'page_grader_client' || entry.source === 'page_grader_scope') {
      page_grader_clients.push(entry.canonical)
    } else if (entry.source === 'slack_person') slack_people.push(entry.canonical)
  }
  return {
    campaigns: [...new Set(campaigns)].sort((a, b) => a.localeCompare(b)),
    page_grader_clients: [...new Set(page_grader_clients)].sort((a, b) => a.localeCompare(b)),
    slack_people: [...new Set(slack_people)].sort((a, b) => a.localeCompare(b)),
  }
}

/** Keep Slack-agent prefixes useful without dumping a full transcript. */
export const ASSIGNEE_REMINDER_CALL_BRIEF_MAX_CHARS = 2500

export function boundAssigneeReminderCallBrief(
  brief: string,
  maxChars = ASSIGNEE_REMINDER_CALL_BRIEF_MAX_CHARS,
): string {
  const cleaned = brief.trim()
  if (!cleaned) return ''
  if (cleaned.length <= maxChars) return cleaned
  return `${cleaned.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`
}

export function buildAssigneeReminderThreadContext(input: {
  assigneeName?: string | null
  callTitle?: string | null
  /** Purpose + takeaways (no raw transcript). */
  callBrief?: string | null
  items: Array<Record<string, unknown>>
}): string {
  const bullets = input.items
    .map((item) => {
      const task = String(item.title ?? '').trim()
      return task ? `- ${task}` : null
    })
    .filter((line): line is string => !!line)
  const who = String(input.assigneeName ?? '').trim() || 'this teammate'
  const call = String(input.callTitle ?? '').trim() || 'the recent team call'
  const brief = boundAssigneeReminderCallBrief(String(input.callBrief ?? ''))
  return [
    '[Meeting assignee-reminder context — answer from the call brief and these action items when relevant]',
    `Assignee: ${who}`,
    `Call: ${call}`,
    ...(brief ? [`Call brief:\n${brief}`] : []),
    bullets.length > 0
      ? `Action items for ${who}:\n${bullets.join('\n')}`
      : 'Action items: (none titled)',
    '[End meeting assignee-reminder context]',
  ].join('\n')
}
