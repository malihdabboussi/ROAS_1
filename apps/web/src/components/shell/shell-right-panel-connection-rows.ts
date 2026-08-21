import type { ConversationConnection } from '@/lib/conversations'

export const VISIBLE_CONNECTION_ROW_CAP = 8

export function extraConversationConnections(
  connections: ConversationConnection[],
  primaryCampaignId: string | null,
  primarySpaceId: string | null,
): ConversationConnection[] {
  return connections.filter((connection) => {
    if (connection.entity_type === 'campaign' && connection.entity_id === primaryCampaignId) {
      return false
    }
    if (connection.entity_type === 'space' && connection.entity_id === primarySpaceId) {
      return false
    }
    return true
  })
}

export function capVisibleConnectionRows<T>(rows: T[], cap = VISIBLE_CONNECTION_ROW_CAP): T[] {
  return rows.slice(0, cap)
}

export function extraConnectionTitle(
  connection: ConversationConnection,
  campaigns: Array<{ id: string; name: string }>,
): string {
  if (connection.entity_type === 'campaign') {
    return campaigns.find((campaign) => campaign.id === connection.entity_id)?.name ?? 'Campaign'
  }
  return 'Space'
}
