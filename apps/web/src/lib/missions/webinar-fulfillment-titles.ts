/**
 * Display titles for Webinar Fulfillment subtasks.
 * Mirrors mission-worker `WEBINAR_FLOW_TASKS` / gates — keep in sync when playbook renames.
 */
const WEBINAR_TASK_DISPLAY: Array<{ match: RegExp; title: string }> = [
  { match: /^Task\s*1\b/i, title: 'Task 1 — Pre-call strategy map' },
  { match: /^Pre-call strategy map/i, title: 'Task 1 — Pre-call strategy map' },
  { match: /^Task\s*2\b/i, title: 'Task 2 — Strategy v2 after call' },
  { match: /^Strategy v2 after call/i, title: 'Task 2 — Strategy v2 after call' },
  { match: /^Task\s*3\b/i, title: 'Task 3 — THE PLAN launch brief' },
  { match: /^THE PLAN launch brief/i, title: 'Task 3 — THE PLAN launch brief' },
  { match: /^Task\s*4\b/i, title: 'Task 4 — Market research' },
  { match: /^Market research/i, title: 'Task 4 — Market research' },
  { match: /^Task\s*5\b/i, title: 'Task 5 — Copy Package' },
  { match: /^Copy Package/i, title: 'Task 5 — Copy Package' },
  { match: /^Task\s*6\b/i, title: 'Task 6 — Static ads' },
  { match: /^Static ads/i, title: 'Task 6 — Static ads' },
  { match: /^Task\s*7\b/i, title: 'Task 7 — Image briefs' },
  { match: /^Image briefs/i, title: 'Task 7 — Image briefs' },
  { match: /^Task\s*8\b/i, title: 'Task 8 — Funnel design' },
  { match: /^Funnel design/i, title: 'Task 8 — Funnel design' },
  { match: /^Task\s*9\b/i, title: 'Task 9 — Deck Outline v1' },
  { match: /^Deck Outline v1/i, title: 'Task 9 — Deck Outline v1' },
  { match: /^Task\s*10\b/i, title: 'Task 10 — Webinar Deck v1' },
  { match: /^Webinar Deck v1/i, title: 'Task 10 — Webinar Deck v1' },
]

/**
 * Normalize webinar playbook subtask titles for UI: Task N / Gate N, no skill slugs.
 * Non-matching titles pass through unchanged.
 */
export function formatWebinarSubtaskTitle(title: string): string {
  const trimmed = title.trim()
  if (!trimmed) return title
  if (/^Gate\s*\d+/i.test(trimmed)) {
    return trimmed.replace(/\s*\([^)]*\)\s*$/, '').trim()
  }
  for (const row of WEBINAR_TASK_DISPLAY) {
    if (row.match.test(trimmed)) return row.title
  }
  return trimmed.replace(/\s*\([^)]*\)\s*$/, '').trim()
}
