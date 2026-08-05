export type MeetingWorkspaceLinkTarget = {
  id: string
  label: string
  href: string
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

export function resolveMeetingWorkspaceLinks(input: {
  spaceId: string
  contextLinks?: ReadonlyArray<Record<string, unknown>> | null
  spaces: ReadonlyArray<{ id: string; title: string; campaign_id: string | null }>
}): {
  space: MeetingWorkspaceLinkTarget
  campaign: MeetingWorkspaceLinkTarget | null
  linkedSpaces: MeetingWorkspaceLinkTarget[]
} {
  const spaceId = input.spaceId.trim()
  const spaceRow = input.spaces.find((space) => space.id === spaceId) ?? null
  const campaignFromSpace = spaceRow?.campaign_id?.trim() || null
  const campaignFromLinks =
    input.contextLinks
      ?.map((link) => {
        if (text(link.entity_type) !== 'campaign') return null
        return text(link.entity_id)
      })
      .find((id): id is string => Boolean(id)) ?? null
  const campaignId = campaignFromSpace || campaignFromLinks

  const linkedSpaces: MeetingWorkspaceLinkTarget[] = []
  const seenSpaceIds = new Set<string>([spaceId])
  for (const link of input.contextLinks ?? []) {
    if (text(link.entity_type) !== 'space') continue
    const id = text(link.entity_id)
    if (!id || seenSpaceIds.has(id)) continue
    seenSpaceIds.add(id)
    const row = input.spaces.find((space) => space.id === id) ?? null
    linkedSpaces.push({
      id,
      label: row?.title?.trim() || text(link.label) || 'Space',
      href: `/spaces?space=${encodeURIComponent(id)}`,
    })
  }

  return {
    space: {
      id: spaceId,
      label: spaceRow?.title?.trim() || 'Space',
      href: `/spaces?space=${encodeURIComponent(spaceId)}`,
    },
    campaign: campaignId
      ? {
          id: campaignId,
          label: 'Campaign',
          href: `/campaigns/${encodeURIComponent(campaignId)}`,
        }
      : null,
    linkedSpaces,
  }
}
