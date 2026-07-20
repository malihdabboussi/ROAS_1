import { cachedSpaces } from '@/features/spaces/hooks/use-cached-spaces'

/** Resolve meeting workflows from the Personal Dashboard, with legacy Meetings fallback. */
export function resolveMeetingsSpaceId(): string | null {
  const spaces = cachedSpaces.peek() ?? []
  const meetings = spaces.find((space) => {
    const schema = space.schema as {
      icon?: string
      personal_dashboard?: boolean
      fields?: Array<{ id?: string }>
    } | null
    const hasEntryType = schema?.fields?.some((f) => f.id === 'entry_type')
    const title = String(space.title ?? '').toLowerCase()
    const kind = (space as typeof space & { space_kind?: string }).space_kind
    const isDashboard =
      kind === 'personal_dashboard' ||
      schema?.personal_dashboard === true ||
      title === 'personal dashboard'
    return hasEntryType && (isDashboard || schema?.icon === 'video' || title === 'meetings')
  })
  return meetings?.id ?? null
}
