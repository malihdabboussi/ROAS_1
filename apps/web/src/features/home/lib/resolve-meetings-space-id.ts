import { fetchSpaces, type SpaceSummary } from '@/lib/spaces/spaces-api'

const CACHE_TTL_MS = 60_000

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

function isMeetingsOrPersonalDashboardSpace(space: MeetingsSpaceCandidate): boolean {
  const schema = space.schema
  const hasEntryType = schema?.fields?.some((f) => f.id === 'entry_type')
  const title = String(space.title ?? '').toLowerCase()
  const kind = space.space_kind
  const isDashboard =
    kind === 'personal_dashboard' ||
    schema?.personal_dashboard === true ||
    title === 'personal dashboard'
  return Boolean(hasEntryType && (isDashboard || schema?.icon === 'video' || title === 'meetings'))
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

  const spaces = await fetchSpaces<MeetingsSpaceCandidate>({ limit: 100 }, { orgId: null })
  const meetings = spaces.find(isMeetingsOrPersonalDashboardSpace) ?? null
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
