import { fetchSpaces, type SpaceSummary } from '@/lib/spaces/spaces-api'

const CACHE_TTL_MS = 60_000
const PERSONAL_SPACES_LIMIT = 200

type MeetingsSpaceCache = {
  id: string | null
  campaignId: string | null
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
 * Rank personal-account meeting surfaces. Prefer the legacy Fathom "Meetings"
 * space (video icon) over a newer empty Personal Dashboard clone.
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

function pickPersonalMeetingsSpace(
  spaces: MeetingsSpaceCandidate[],
): MeetingsSpaceCandidate | null {
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

/** Invalidate the personal Meetings space cache (tests / after ensure). */
export function invalidatePersonalMeetingsSpaceCache(): void {
  cache = null
}

/**
 * Resolve Meetings / Personal Dashboard from the personal account only.
 * Home always uses this space — never the active org's Personal Dashboard.
 */
export async function resolveMeetingsSpaceId(): Promise<string | null> {
  const now = Date.now()
  if (cache && now - cache.at < CACHE_TTL_MS) return cache.id

  const spaces = await fetchSpaces<MeetingsSpaceCandidate>(
    { limit: PERSONAL_SPACES_LIMIT },
    { orgId: null },
  )
  const meetings = pickPersonalMeetingsSpace(spaces)
  cache = {
    id: meetings?.id ?? null,
    campaignId: meetings?.campaign_id ?? null,
    at: now,
  }
  return cache.id
}

/** Last resolved personal Meetings campaign id (from cache), if any. */
export function peekPersonalMeetingsCampaignId(): string | null {
  return cache?.campaignId ?? null
}
