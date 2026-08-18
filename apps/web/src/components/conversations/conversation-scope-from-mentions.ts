export type MentionLike = {
  kind?: string | null
  id?: string | null
}

export type ConnectionSpaceLike = {
  id: string
  title: string
  campaign_id?: string | null
}

/** Last @ campaign chip becomes the connection. People/docs stay sources. */
export function campaignIdFromMessageReferences(
  references: readonly MentionLike[] | null | undefined,
): string | null {
  if (!references?.length) return null
  for (let index = references.length - 1; index >= 0; index -= 1) {
    const row = references[index]
    const id = row?.id?.trim()
    if (row?.kind === 'campaign' && id) return id
  }
  return null
}

export function generalSpaceIdForCampaign(
  spaces: readonly ConnectionSpaceLike[],
  campaignId: string,
): string | null {
  const match = spaces.find(
    (space) => space.campaign_id === campaignId && space.title.trim().toLowerCase() === 'general',
  )
  return match?.id ?? null
}

/**
 * Choose Space / plus-menu add wins unless the send also @ mentioned a campaign.
 * Never invent a leftover Meetings/General org space.
 */
export function resolveConversationConnection(input: {
  mentionCampaignId: string | null
  chosenCampaignId: string | null
  chosenSpaceId: string | null
  spaces: readonly ConnectionSpaceLike[]
}): { campaignId: string | null; spaceId: string | null } {
  if (input.mentionCampaignId) {
    return {
      campaignId: input.mentionCampaignId,
      spaceId: generalSpaceIdForCampaign(input.spaces, input.mentionCampaignId),
    }
  }
  if (input.chosenSpaceId || input.chosenCampaignId) {
    const chosenSpace = input.chosenSpaceId
      ? (input.spaces.find((space) => space.id === input.chosenSpaceId) ?? null)
      : null
    return {
      campaignId: input.chosenCampaignId ?? chosenSpace?.campaign_id ?? null,
      spaceId: input.chosenSpaceId,
    }
  }
  return { campaignId: null, spaceId: null }
}

export function workContextFromConnection(connection: {
  campaignId: string | null
  spaceId: string | null
}):
  | { surface: 'general' }
  | { surface: 'spaces'; campaignId: string | null; spaceId: string | null } {
  if (!connection.campaignId && !connection.spaceId) return { surface: 'general' }
  return {
    surface: 'spaces',
    campaignId: connection.campaignId,
    spaceId: connection.spaceId,
  }
}
