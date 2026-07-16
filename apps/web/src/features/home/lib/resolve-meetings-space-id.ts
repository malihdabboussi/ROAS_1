import { cachedSpaces } from '@/features/spaces/hooks/use-cached-spaces'

/** Resolve the Meetings space from the client space cache (CEO template: video icon + entry_type). */
export function resolveMeetingsSpaceId(): string | null {
  const spaces = cachedSpaces.peek() ?? []
  const meetings = spaces.find((space) => {
    const schema = space.schema as { icon?: string; fields?: Array<{ id?: string }> } | null
    const hasEntryType = schema?.fields?.some((f) => f.id === 'entry_type')
    const title = String(space.title ?? '').toLowerCase()
    return hasEntryType && (schema?.icon === 'video' || title === 'meetings')
  })
  return meetings?.id ?? null
}
