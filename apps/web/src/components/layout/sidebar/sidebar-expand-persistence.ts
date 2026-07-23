const PROGRAMS_KEY = 'roas.sidebar.expandedProgramIds'
const CAMPAIGNS_KEY = 'roas.sidebar.expandedSpaceCampaignIds'

function readIdSet(key: string): Set<string> | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(key)
    if (raw == null) return null
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return null
    return new Set(parsed.filter((id): id is string => typeof id === 'string'))
  } catch {
    return null
  }
}

function writeIdSet(key: string, ids: Set<string>): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify([...ids]))
  } catch {
    /* ignore quota */
  }
}

/** `null` = never persisted (first visit). */
export function readExpandedProgramIds(): Set<string> | null {
  return readIdSet(PROGRAMS_KEY)
}

export function writeExpandedProgramIds(ids: Set<string>): void {
  writeIdSet(PROGRAMS_KEY, ids)
}

export function readExpandedSpaceCampaignIds(): Set<string> | null {
  return readIdSet(CAMPAIGNS_KEY)
}

export function writeExpandedSpaceCampaignIds(ids: Set<string>): void {
  writeIdSet(CAMPAIGNS_KEY, ids)
}

export function toggleIdInSet(prev: Set<string>, id: string): Set<string> {
  const next = new Set(prev)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  return next
}
