/**
 * Pure helpers to make Meetings follow-ups CEO-operable:
 * Due Date, Priority, and internal-only Assignee hints.
 */

export const INTERNAL_ASSIGNEE_EMAIL_DOMAINS = ['roas.co', 'dylanvanas.com'] as const

export type FollowUpPriority = 'low' | 'medium' | 'high' | 'urgent'

export type FathomActionItemLike = {
  description?: string | null
  title?: string | null
  text?: string | null
  deadline?: string | null
  due_date?: string | null
  completed?: boolean | null
  assignee?: { name?: string | null; email?: string | null } | null
}

export function isInternalAssigneeEmail(
  email: string,
  domains: readonly string[] = INTERNAL_ASSIGNEE_EMAIL_DOMAINS,
): boolean {
  const normalized = email.trim().toLowerCase()
  const at = normalized.lastIndexOf('@')
  if (at < 0) return false
  const domain = normalized.slice(at + 1)
  return domains.some((d) => domain === d || domain.endsWith(`.${d}`))
}

/** Normalize agent/Fathom due strings into ISO, or null if unknown. */
export function normalizeFollowUpDueDateIso(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  const d = new Date(trimmed)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

const MONTH_MAP: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
}

function resolveMonthIndex(token: string): number | null {
  const key = token.trim().toLowerCase()
  if (key in MONTH_MAP) return MONTH_MAP[key]
  const short = key.slice(0, 3)
  if (short in MONTH_MAP) return MONTH_MAP[short]
  if (key.startsWith('sept')) return MONTH_MAP.sept
  return null
}

/**
 * Best-effort pull of an explicit calendar date from action-item text
 * (Fathom often has no `deadline` field). Examples: "Jul 22", "July 22, 2026", "2026-07-22".
 */
export function extractDueDateFromText(text: string, now = new Date()): string | null {
  const raw = text.trim()
  if (!raw) return null

  const iso = raw.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/)
  if (iso) {
    const d = new Date(Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), 17, 0, 0))
    return Number.isNaN(d.getTime()) ? null : d.toISOString()
  }

  const named = raw.match(
    /\b(?:on|by|before|due)?\s*(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(20\d{2}))?\b/i,
  )
  if (!named) return null

  const monthIdx = resolveMonthIndex(named[1])
  if (monthIdx == null) return null
  const day = Number(named[2])
  if (!Number.isFinite(day) || day < 1 || day > 31) return null
  let year = named[3] ? Number(named[3]) : now.getUTCFullYear()
  let d = new Date(Date.UTC(year, monthIdx, day, 17, 0, 0))
  // If no explicit year and date is >60 days in the past, assume next year.
  if (!named[3] && d.getTime() < now.getTime() - 60 * 24 * 60 * 60 * 1000) {
    year += 1
    d = new Date(Date.UTC(year, monthIdx, day, 17, 0, 0))
  }
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

const URGENT_RE =
  /\b(asap|urgent|immediately|right away|eod|end of day|blocker|critical|today)\b/i
const HIGH_RE =
  /\b(this week|by friday|by monday|important|priority|follow[- ]?up (asap|soon)|needs? (to )?(go|ship|send) (today|tomorrow))\b/i
const LOW_RE = /\b(nice to have|when you can|someday|fyi|low priority|no rush)\b/i

export function inferFollowUpPriority(input: {
  title: string
  description?: string
  explicit?: string | null
  dueDateIso?: string | null
}): FollowUpPriority {
  const explicit = String(input.explicit ?? '')
    .trim()
    .toLowerCase()
  if (
    explicit === 'low' ||
    explicit === 'medium' ||
    explicit === 'high' ||
    explicit === 'urgent'
  ) {
    // Soft override: agent said medium but language is louder → raise.
    if (explicit === 'medium' || explicit === 'low') {
      const inferred = inferFromText(input)
      if (priorityRank(inferred) > priorityRank(explicit as FollowUpPriority)) return inferred
    }
    return explicit as FollowUpPriority
  }
  return inferFromText(input)
}

function inferFromText(input: {
  title: string
  description?: string
  dueDateIso?: string | null
}): FollowUpPriority {
  const text = `${input.title}\n${input.description ?? ''}`
  if (URGENT_RE.test(text)) return 'urgent'
  if (HIGH_RE.test(text)) return 'high'
  if (LOW_RE.test(text)) return 'low'
  if (input.dueDateIso) {
    const dueMs = new Date(input.dueDateIso).getTime()
    const days = (dueMs - Date.now()) / (1000 * 60 * 60 * 24)
    if (days <= 1) return 'urgent'
    if (days <= 3) return 'high'
  }
  return 'medium'
}

function priorityRank(p: FollowUpPriority): number {
  return { low: 1, medium: 2, high: 3, urgent: 4 }[p]
}

export function actionItemLabel(item: FathomActionItemLike): string {
  return String(item.description ?? item.title ?? item.text ?? '')
    .trim()
    .slice(0, 1000)
}

/** Best-effort match of a suggested task title to a Fathom action item. */
export function matchFathomActionItem(
  title: string,
  actionItems: FathomActionItemLike[],
): FathomActionItemLike | null {
  const needle = title.trim().toLowerCase()
  if (!needle || actionItems.length === 0) return null
  let best: { item: FathomActionItemLike; score: number } | null = null
  for (const item of actionItems) {
    const label = actionItemLabel(item).toLowerCase()
    if (!label) continue
    let score = 0
    if (label === needle) score = 100
    else if (label.includes(needle) || needle.includes(label)) score = 80
    else {
      const a = new Set(needle.split(/[^a-z0-9]+/).filter((w) => w.length > 2))
      const b = new Set(label.split(/[^a-z0-9]+/).filter((w) => w.length > 2))
      if (a.size === 0 || b.size === 0) continue
      let overlap = 0
      for (const w of a) if (b.has(w)) overlap++
      score = Math.round((overlap / Math.max(a.size, b.size)) * 70)
    }
    if (!best || score > best.score) best = { item, score }
  }
  return best && best.score >= 40 ? best.item : null
}

export function enrichSuggestedFollowUp(input: {
  title: string
  description?: string
  due_date?: string | null
  priority?: string | null
  assignee_email?: string | null
  actionItems?: FathomActionItemLike[]
}): {
  due_date: string | null
  priority: FollowUpPriority
  assignee_email: string | null
  assignee_name: string | null
} {
  const matched = matchFathomActionItem(input.title, input.actionItems ?? [])
  const textForDate = [input.title, input.description, actionItemLabel(matched ?? {})]
    .filter(Boolean)
    .join('\n')
  const due_date =
    normalizeFollowUpDueDateIso(input.due_date) ||
    normalizeFollowUpDueDateIso(matched?.deadline) ||
    normalizeFollowUpDueDateIso(matched?.due_date) ||
    extractDueDateFromText(textForDate)
  const assignee_email = (
    input.assignee_email ||
    matched?.assignee?.email ||
    ''
  )
    .trim()
    .toLowerCase()
  const assignee_name = String(matched?.assignee?.name ?? '').trim() || null
  const priority = inferFollowUpPriority({
    title: input.title,
    description: input.description,
    explicit: input.priority,
    dueDateIso: due_date,
  })
  return {
    due_date,
    priority,
    assignee_email: assignee_email || null,
    assignee_name,
  }
}

export type AttendeeTagOption = { id: string; label: string }

/**
 * Map a Fathom / suggested owner onto an existing Attendees multi_select option.
 * Prefer exact label, then email local-part, then unique first-name.
 */
export function matchAttendeeTagOption(
  options: AttendeeTagOption[],
  hint: { name?: string | null; email?: string | null },
): string | null {
  if (!options.length) return null
  const name = String(hint.name ?? '')
    .trim()
    .toLowerCase()
  const email = String(hint.email ?? '')
    .trim()
    .toLowerCase()
  const local = email.includes('@') ? email.split('@')[0]!.replace(/[._+]/g, ' ').trim() : ''

  const byExact = (needle: string) =>
    options.find((opt) => String(opt.label).trim().toLowerCase() === needle)?.id ?? null

  if (name) {
    const exact = byExact(name)
    if (exact) return exact
  }
  if (local) {
    const exactLocal = byExact(local)
    if (exactLocal) return exactLocal
  }

  if (name) {
    const partial = options.filter((opt) => {
      const label = String(opt.label).trim().toLowerCase()
      return label.includes(name) || name.includes(label)
    })
    if (partial.length === 1) return partial[0].id
  }

  if (local && local.length >= 2) {
    const first = local.split(/\s+/)[0]!
    const firstHits = options.filter((opt) => {
      const label = String(opt.label).trim().toLowerCase()
      return label === first || label.startsWith(`${first} `)
    })
    if (firstHits.length === 1) return firstHits[0].id
  }

  if (name) {
    const first = name.split(/\s+/)[0]!
    if (first.length >= 2) {
      const firstHits = options.filter((opt) => {
        const label = String(opt.label).trim().toLowerCase()
        return label === first || label.startsWith(`${first} `)
      })
      if (firstHits.length === 1) return firstHits[0].id
    }
  }

  return null
}

/** Label to upsert into Attendees tags when no option matched yet. */
export function followUpOwnerTagLabel(hint: {
  name?: string | null
  email?: string | null
}): string | null {
  const name = String(hint.name ?? '').trim()
  if (name) return name.slice(0, 80)
  const email = String(hint.email ?? '')
    .trim()
    .toLowerCase()
  if (!email || !email.includes('@')) return null
  const local = email.split('@')[0]!.replace(/[._+]/g, ' ').trim()
  if (!local || /^(test|admin|info|hello|contact|support|user)$/i.test(local)) return null
  return local
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
    .slice(0, 80)
}
