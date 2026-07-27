/**
 * Ground follow-up task title / assignee prefixes on portal People + roster names
 * so transcript typos ("Anis") become the canonical person ("Anees Ahmad Khan").
 */

export type PortalPerson = {
  label: string
  email?: string | null
  /** Extra aliases (email local-part, first name, attendee tags). */
  aliases?: string[]
}

const TITLE_OWNER_PREFIX_RE = /^([^:\n]{2,60})\s*:\s+(.+)$/

export function normalizePortalLabel(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

/** Levenshtein distance — used for short-name typos (Anis ↔ Anees). */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  const rows = a.length + 1
  const cols = b.length + 1
  const matrix: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0))
  for (let i = 0; i < rows; i++) matrix[i]![0] = i
  for (let j = 0; j < cols; j++) matrix[0]![j] = j
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      matrix[i]![j] = Math.min(
        matrix[i - 1]![j]! + 1,
        matrix[i]![j - 1]! + 1,
        matrix[i - 1]![j - 1]! + cost,
      )
    }
  }
  return matrix[a.length]![b.length]!
}

function personTokens(person: PortalPerson): string[] {
  const tokens = new Set<string>()
  const push = (raw: string | null | undefined) => {
    const n = normalizePortalLabel(String(raw ?? ''))
    if (!n || n.length < 2) return
    tokens.add(n)
    for (const part of n.split(/\s+/)) {
      if (part.length >= 2) tokens.add(part)
    }
  }
  push(person.label)
  for (const alias of person.aliases ?? []) push(alias)
  const email = String(person.email ?? '')
    .trim()
    .toLowerCase()
  if (email.includes('@')) {
    push(email.split('@')[0]!.replace(/[._+]/g, ' '))
  }
  return [...tokens]
}

function personFuzzyTokens(person: PortalPerson): string[] {
  const tokens = new Set<string>()
  const push = (raw: string | null | undefined) => {
    const n = normalizePortalLabel(String(raw ?? ''))
    if (!n || n.length < 2) return
    // Prefer first-name / alias tokens for fuzzy typo repair (avoid last-name collisions
    // like Anis ↔ Vanas).
    tokens.add(n.split(/\s+/)[0]!)
    if (!n.includes(' ')) tokens.add(n)
  }
  push(person.label)
  for (const alias of person.aliases ?? []) push(alias)
  const email = String(person.email ?? '')
    .trim()
    .toLowerCase()
  if (email.includes('@')) {
    push(email.split('@')[0]!.replace(/[._+]/g, ' ').split(/\s+/)[0])
  }
  return [...tokens].filter(Boolean)
}

/**
 * Score how well a free-text hint matches a portal person.
 * Higher is better; 0 = no match.
 */
export function scorePortalPersonMatch(hint: string, person: PortalPerson): number {
  const needle = normalizePortalLabel(hint)
  if (!needle) return 0
  const label = normalizePortalLabel(person.label)
  if (!label) return 0
  if (needle === label) return 100
  if (label.startsWith(`${needle} `) || needle.startsWith(`${label} `)) return 90
  if (label.includes(needle) || needle.includes(label)) return 80

  const exactTokens = personTokens(person)
  if (exactTokens.includes(needle)) return 75

  const needleFirst = needle.split(/\s+/)[0] ?? ''
  let best = 0
  for (const token of exactTokens) {
    if (token === needleFirst) best = Math.max(best, 70)
  }
  for (const token of personFuzzyTokens(person)) {
    if (needleFirst.length >= 3 && token.length >= 3) {
      const dist = editDistance(needleFirst, token)
      const maxAllowed = Math.min(2, Math.floor(Math.min(needleFirst.length, token.length) / 2))
      if (dist > 0 && dist <= maxAllowed) {
        best = Math.max(best, 65 - dist * 5)
      }
    }
  }
  return best
}

/** Unique best portal match, or null when ambiguous / weak. */
export function matchPortalPerson(hint: string, people: PortalPerson[]): PortalPerson | null {
  if (!hint.trim() || people.length === 0) return null
  let best: { person: PortalPerson; score: number } | null = null
  let second = 0
  for (const person of people) {
    const score = scorePortalPersonMatch(hint, person)
    if (!best || score > best.score) {
      second = best?.score ?? 0
      best = { person, score }
    } else if (score > second) {
      second = score
    }
  }
  if (!best || best.score < 55) return null
  // Ambiguous when two close fuzzy hits (e.g. two "An…" people).
  if (best.score < 70 && second >= best.score - 5) return null
  return best.person
}

/**
 * Rewrite "Anis: rewrite About page" → "Anees Ahmad Khan: rewrite About page"
 * when the owner prefix matches a portal person.
 */
export function groundFollowUpTitleOnPortalPeople(
  title: string,
  people: PortalPerson[],
): { title: string; grounded: boolean; matched?: PortalPerson } {
  const raw = String(title ?? '').trim()
  if (!raw || people.length === 0) return { title: raw, grounded: false }
  const match = raw.match(TITLE_OWNER_PREFIX_RE)
  if (!match) {
    // Also rewrite bare first-name mentions that uniquely match.
    const person = matchPortalPerson(raw.split(/\s+/)[0] ?? '', people)
    if (!person) return { title: raw, grounded: false }
    const first = normalizePortalLabel(raw.split(/\s+/)[0] ?? '')
    const canonicalFirst = normalizePortalLabel(person.label.split(/\s+/)[0] ?? '')
    if (!first || first === canonicalFirst || !raw.toLowerCase().includes(first)) {
      return { title: raw, grounded: false }
    }
    // Only rewrite when the free-text first token looks like a typo of the portal first name.
    if (editDistance(first, canonicalFirst) === 0 || editDistance(first, canonicalFirst) > 2) {
      return { title: raw, grounded: false }
    }
    const re = new RegExp(`\\b${first.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
    const next = raw.replace(re, person.label.split(/\s+/)[0] ?? person.label)
    return next === raw
      ? { title: raw, grounded: false }
      : { title: next, grounded: true, matched: person }
  }

  const ownerHint = match[1]!.trim()
  const rest = match[2]!.trim()
  const person = matchPortalPerson(ownerHint, people)
  if (!person) return { title: raw, grounded: false }
  if (normalizePortalLabel(ownerHint) === normalizePortalLabel(person.label)) {
    return { title: raw, grounded: false }
  }
  return {
    title: `${person.label}: ${rest}`.slice(0, 1000),
    grounded: true,
    matched: person,
  }
}

export function groundAssigneeNameOnPortalPeople(
  name: string | null | undefined,
  people: PortalPerson[],
): string | null {
  const raw = String(name ?? '').trim()
  if (!raw) return null
  const person = matchPortalPerson(raw, people)
  return person ? person.label : raw
}

/** Build portal people from Meetings attendee tags + CRM contacts + roster profiles. */
export function buildPortalPeopleCatalog(input: {
  attendeeLabels?: string[]
  contacts?: Array<{ first_name?: string | null; last_name?: string | null; email?: string | null }>
  roster?: Array<{ display_name?: string | null; email?: string | null; full_name?: string | null }>
}): PortalPerson[] {
  const byKey = new Map<string, PortalPerson>()
  const upsert = (person: PortalPerson) => {
    const label = person.label.trim()
    if (!label) return
    const key = normalizePortalLabel(label)
    const existing = byKey.get(key)
    if (!existing) {
      byKey.set(key, {
        label,
        email: person.email ?? null,
        aliases: [...new Set((person.aliases ?? []).map((a) => a.trim()).filter(Boolean))],
      })
      return
    }
    const aliases = new Set([...(existing.aliases ?? []), ...(person.aliases ?? [])])
    byKey.set(key, {
      label: existing.label.length >= label.length ? existing.label : label,
      email: existing.email || person.email || null,
      aliases: [...aliases].filter(Boolean),
    })
  }

  for (const label of input.attendeeLabels ?? []) {
    upsert({ label, aliases: [label.split(/\s+/)[0] ?? ''] })
  }
  for (const contact of input.contacts ?? []) {
    const first = String(contact.first_name ?? '').trim()
    const last = String(contact.last_name ?? '').trim()
    const label = [first, last].filter(Boolean).join(' ')
    if (!label) continue
    upsert({
      label,
      email: contact.email,
      aliases: [first, last].filter(Boolean),
    })
  }
  for (const member of input.roster ?? []) {
    const label = String(member.display_name ?? member.full_name ?? '').trim()
    if (!label) continue
    upsert({
      label,
      email: member.email,
      aliases: [label.split(/\s+/)[0] ?? ''],
    })
  }
  return [...byKey.values()]
}
