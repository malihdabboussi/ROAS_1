export type SpaceCustomDataSource = {
  title?: string | null
  campaign_id?: string | null
  schema?: unknown
}

export function spaceSchemaCustomData(
  space: SpaceCustomDataSource | null | undefined,
): Record<string, unknown> {
  if (!space?.schema || typeof space.schema !== 'object' || Array.isArray(space.schema)) return {}
  const customData = (space.schema as { custom_data?: unknown }).custom_data
  if (!customData || typeof customData !== 'object' || Array.isArray(customData)) return {}
  return customData as Record<string, unknown>
}

function stringField(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function isGeneralTitle(value: string | null | undefined): boolean {
  return value?.trim().toLowerCase() === 'general'
}

/** Page Grader client id stamped on a campaign config. */
export function pageGraderClientIdFromCampaignConfig(config: unknown): string | null {
  if (!config || typeof config !== 'object' || Array.isArray(config)) return null
  const sources = (config as { external_sources?: unknown }).external_sources
  if (!sources || typeof sources !== 'object' || Array.isArray(sources)) return null
  const pageGrader = (sources as { page_grader?: unknown }).page_grader
  if (!pageGrader || typeof pageGrader !== 'object' || Array.isArray(pageGrader)) return null
  return stringField((pageGrader as { client_id?: unknown }).client_id)
}

/** Canonical Page Grader client General space — the hidden client overview. */
export function isPageGraderClientGeneralSpace(
  space: SpaceCustomDataSource | null | undefined,
): boolean {
  const data = spaceSchemaCustomData(space)
  if (data.source === 'page_grader' && data.space_role === 'general') return true
  return isGeneralTitle(space?.title) && Boolean(stringField(data.page_grader_client_id))
}

/** Hide from switchers and space flyouts. The campaign/client row is the overview. */
export function isHiddenClientGeneralSpace(
  space: SpaceCustomDataSource | null | undefined,
  campaign?: { config?: unknown } | null,
): boolean {
  if (isPageGraderClientGeneralSpace(space)) return true
  if (!isGeneralTitle(space?.title)) return false
  return Boolean(pageGraderClientIdFromCampaignConfig(campaign?.config))
}

export function clientOverviewHrefFromSpace(
  space: SpaceCustomDataSource | null | undefined,
  options?: { hasItem?: boolean },
): string | null {
  if (!isPageGraderClientGeneralSpace(space)) return null
  const campaignId = stringField(space?.campaign_id)
  if (!campaignId) return null
  const clientId = stringField(spaceSchemaCustomData(space).page_grader_client_id)
  const params = new URLSearchParams()
  if (clientId) params.set('client', clientId)
  if (options?.hasItem) params.set('view', 'list')
  const qs = params.toString()
  return `/campaigns/${encodeURIComponent(campaignId)}${qs ? `?${qs}` : ''}`
}
