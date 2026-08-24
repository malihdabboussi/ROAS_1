import type { Space, SpaceItem } from '../../types'

export function buildPageGraderOverviewContext(
  space: Space,
  items: SpaceItem[],
  onOpenTask: (item: SpaceItem) => void,
) {
  const schema = space.schema as unknown as Record<string, unknown>
  const custom =
    schema.custom_data && typeof schema.custom_data === 'object'
      ? (schema.custom_data as Record<string, unknown>)
      : {}
  return {
    pageGraderClientId:
      typeof custom.page_grader_client_id === 'string' ? custom.page_grader_client_id : null,
    pageGraderCampaignId:
      typeof custom.page_grader_campaign_id === 'string' ? custom.page_grader_campaign_id : null,
    spaceItems: items,
    spaceId: space.id,
    onOpenTask,
  }
}
