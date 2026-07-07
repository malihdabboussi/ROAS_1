export interface ChannelMessageScope {
  space_id: string | null
  campaign_id: string | null
  scope_kind: 'campaign' | 'shared_space'
}

export function readChannelScopeFromMessageMetadata(
  metadata: Record<string, unknown> | null | undefined,
): ChannelMessageScope | null {
  if (!metadata) return null
  const spaceId =
    typeof metadata.space_id === 'string' && metadata.space_id.length > 0
      ? (metadata.space_id as string)
      : null
  const campaignId =
    typeof metadata.campaign_id === 'string' && metadata.campaign_id.length > 0
      ? (metadata.campaign_id as string)
      : null
  if (!spaceId && !campaignId) return null
  const scopeKindRaw =
    typeof metadata.scope_kind === 'string' ? (metadata.scope_kind as string) : null
  const scopeKind: ChannelMessageScope['scope_kind'] =
    scopeKindRaw === 'campaign' || scopeKindRaw === 'shared_space'
      ? scopeKindRaw
      : campaignId
        ? 'campaign'
        : 'shared_space'
  return { space_id: spaceId, campaign_id: campaignId, scope_kind: scopeKind }
}
