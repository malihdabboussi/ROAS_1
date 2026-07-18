/** Keep display labels aligned with mission-worker webinar playbook titles. */
const WEBINAR_TASK_DISPLAY: Array<{ match: RegExp; title: string }> = [
  {
    match: /^(Task\s*1\b|Atlas context preparation)/i,
    title: 'Task 1 — Atlas context preparation',
  },
  { match: /^(Task\s*2\b|Pre-call strategy map)/i, title: 'Task 2 — Pre-call strategy map' },
  {
    match: /^(Task\s*3\b|Atlas call and transcript intake)/i,
    title: 'Task 3 — Atlas call and transcript intake',
  },
  { match: /^(Task\s*4\b|Post-call strategy map)/i, title: 'Task 4 — Post-call strategy map' },
  { match: /^(Task\s*5\b|Market research)/i, title: 'Task 5 — Market research' },
  { match: /^(Task\s*6\b|THE PLAN launch brief)/i, title: 'Task 6 — THE PLAN launch brief' },
  {
    match: /^(Task\s*7\b|Build checklist reconciliation)/i,
    title: 'Task 7 — Build checklist reconciliation',
  },
  {
    match: /^(Task\s*8A\b|Complete webinar copy package|Copy Package)/i,
    title: 'Task 8A — Complete webinar copy package',
  },
  {
    match: /^(Task\s*8B\b|Landing Page Copy)/i,
    title: 'Task 8B — Landing page copy',
  },
  {
    match: /^(Task\s*9\b|Validate Messaging statics|Static Meta ads)/i,
    title: 'Task 9 — Validate Messaging statics',
  },
  { match: /^(Task\s*10\b|Image briefs)/i, title: 'Task 10 — Image briefs' },
  {
    match: /^(Task\s*11\b|Generated concept images)/i,
    title: 'Task 11 — Generated concept images',
  },
  { match: /^(Task\s*12\b|Native webinar funnel)/i, title: 'Task 12 — Native webinar funnel' },
  { match: /^(Task\s*13\b|Webinar Deck Bones)/i, title: 'Task 13 — Webinar Deck Bones' },
  {
    match: /^(Task\s*14\b|Compile approved Meta ads)/i,
    title: 'Task 14 — Compile approved Meta ads',
  },
  { match: /^(Task\s*15\b|Media plan)/i, title: 'Task 15 — Media plan' },
]

export function formatWebinarSubtaskTitle(title: string): string {
  const trimmed = title.trim()
  if (!trimmed) return title
  if (/^Gate\s*\d+/i.test(trimmed)) return trimmed.replace(/\s*\([^)]*\)\s*$/, '').trim()
  if (/^Task\s*\d+[A-Z]?\s*—/i.test(trimmed)) {
    return trimmed.replace(/\s*\([^)]*\)\s*$/, '').trim()
  }
  for (const row of WEBINAR_TASK_DISPLAY) {
    if (row.match.test(trimmed)) return row.title
  }
  return trimmed.replace(/\s*\([^)]*\)\s*$/, '').trim()
}
