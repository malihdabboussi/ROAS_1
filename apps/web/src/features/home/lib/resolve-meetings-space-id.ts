import { fetchSpaces, type SpaceSummary } from '@/lib/spaces/spaces-api'
import { getActiveOrgIdFromStorage } from '@/lib/utils/org-storage'

const CACHE_TTL_MS = 60_000
const SPACES_LIMIT = 200

type MeetingsSpaceCache = {
  id: string | null
  campaignId: string | null
  orgKey: string
  at: number
}

let cache: MeetingsSpaceCache | null = null

type MeetingsSpaceCandidate = SpaceSummary & {
  space_kind?: string
  schema?: SpaceSummary['schema'] & {
    personal_dashboard?: boolean
    fields?: Array<{ id?: string }>
  }
}

/**
 * Rank meeting surfaces. Prefer the Fathom "Meetings" space (video icon)
 * over a newer empty Personal Dashboard clone.
 */
export function rankPersonalMeetingsSpace(space: MeetingsSpaceCandidate): number {
  const schema = space.schema
  const hasEntryType = schema?.fields?.some((f) => f.id === 'entry_type')
  if (!hasEntryType) return -1

  const title = String(space.title ?? '').toLowerCase()
  const kind = space.space_kind
  const isDashboard =
    kind === 'personal_dashboard' ||
    schema?.personal_dashboard === true ||
    title === 'personal dashboard'
  const isMeetingsSurface = schema?.icon === 'video' || title === 'meetings'
  if (!isDashboard && !isMeetingsSurface) return -1

  let rank = 0
  if (title === 'meetings') rank += 100
  if (schema?.icon === 'video') rank += 40
  if (isDashboard) rank += 10
  return rank
}

function pickMeetingsSpace(spaces: MeetingsSpaceCandidate[]): MeetingsSpaceCandidate | null {
  let best: MeetingsSpaceCandidate | null = null
  let bestRank = -1
  for (const space of spaces) {
    const rank = rankPersonalMeetingsSpace(space)
    if (rank > bestRank) {
      best = space
      bestRank = rank
    }
  }
  return bestRank >= 0 ? best : null
}

/** Invalidate the Meetings space cache (tests / after ensure). */
export function invalidatePersonalMeetingsSpaceCache(): void {
  cache = null
}

/**
 * Resolve Meetings / Personal Dashboard.
 * Prefer the active org Meetings space when present; fall back to personal-account.
 */
export async function resolveMeetingsSpaceId(): Promise<string | null> {
  const now = Date.now()
  const activeOrgId = getActiveOrgIdFromStorage()
  const orgKey = activeOrgId ?? 'personal'
  if (cache && cache.orgKey === orgKey && now - cache.at < CACHE_TTL_MS) return cache.id

  let meetings: MeetingsSpaceCandidate | null = null
  if (activeOrgId) {
    const orgSpaces = await fetchSpaces<MeetingsSpaceCandidate>(
      { limit: SPACES_LIMIT },
      { orgId: activeOrgId },
    )
    meetings = pickMeetingsSpace(orgSpaces)
  }
  if (!meetings) {
    const personalSpaces = await fetchSpaces<MeetingsSpaceCandidate>(
      { limit: SPACES_LIMIT },
      { orgId: null },
    )
    meetings = pickMeetingsSpace(personalSpaces)
  }

  cache = {
    id: meetings?.id ?? null,
    campaignId: meetings?.campaign_id ?? null,
    orgKey,
    at: now,
  }
  return cache.id
}

/** Last resolved Meetings campaign id (from cache), if any. */
export function peekPersonalMeetingsCampaignId(): string | null {
  return cache?.campaignId ?? null
}
