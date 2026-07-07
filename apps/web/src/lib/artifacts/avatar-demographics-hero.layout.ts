/** Shared demographics partitioning for Avatar preview hero + PDF export (keep in sync with card layout). */

export const DEMO_TOP_KEYS = new Set([
  'name',
  'full_name',
  'first_name',
  'display_name',
  'age',
  'gender',
  'sex',
  'income',
  'annual_income',
  'salary',
  'household_income',
  'location',
  'city',
  'state',
  'country',
  'geographic_location',
  'residence',
  'education',
  'degree',
  'school',
  'university',
])

export const DEMO_BOTTOM_KEYS = new Set([
  'lifestyle',
  'daily_life',
  'routine',
  'daily_routine',
  'occupation',
  'career',
  'job',
  'job_title',
  'profession',
  'frustration',
  'frustrations',
  'key_frustrations',
  'family_status',
  'family',
  'marital_status',
  'spouse',
  'children',
])

export const DEMO_TOP_SORT: string[] = [
  'name',
  'full_name',
  'first_name',
  'display_name',
  'age',
  'gender',
  'sex',
  'income',
  'annual_income',
  'salary',
  'household_income',
  'location',
  'city',
  'state',
  'country',
  'geographic_location',
  'residence',
  'education',
  'degree',
  'school',
  'university',
]

export const DEMO_BOTTOM_SORT: string[] = [
  'lifestyle',
  'daily_life',
  'routine',
  'daily_routine',
  'occupation',
  'career',
  'job',
  'job_title',
  'profession',
  'frustration',
  'frustrations',
  'key_frustrations',
  'family_status',
  'family',
  'marital_status',
  'spouse',
  'children',
]

export function normalizeDemoKey(key: string): string {
  return key
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, '_')
}

export function formatDemoKey(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function isSimpleDemoValue(v: unknown): boolean {
  return typeof v === 'string' || typeof v === 'number'
}

export function sortDemoEntries(
  entries: [string, unknown][],
  order: string[],
): [string, unknown][] {
  const rank = (key: string) => {
    const n = normalizeDemoKey(key)
    const i = order.indexOf(n)
    return i === -1 ? 1000 : i
  }
  return [...entries].sort((a, b) => {
    const d = rank(a[0]) - rank(b[0])
    return d !== 0 ? d : a[0].localeCompare(b[0])
  })
}

export function partitionDemographics(obj: Record<string, unknown>): {
  top: [string, unknown][]
  bottom: [string, unknown][]
  other: [string, unknown][]
} {
  const top: [string, unknown][] = []
  const bottom: [string, unknown][] = []
  const other: [string, unknown][] = []
  for (const [k, v] of Object.entries(obj)) {
    if (v == null || v === '' || (typeof v === 'string' && v.trim() === '')) continue
    const n = normalizeDemoKey(k)
    if (DEMO_TOP_KEYS.has(n)) top.push([k, v])
    else if (DEMO_BOTTOM_KEYS.has(n)) bottom.push([k, v])
    else other.push([k, v])
  }
  return { top, bottom, other }
}
