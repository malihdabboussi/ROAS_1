export type ConversationConnectionEntityType = 'campaign' | 'space'

export type ConversationConnectionSource = 'column' | 'table'

export type ConversationConnection = {
  id: string | null
  conversation_id: string
  org_id: string | null
  entity_type: ConversationConnectionEntityType
  entity_id: string
  is_primary: boolean
  created_at: string
  source: ConversationConnectionSource
}

export type ConversationConnectionRow = {
  id: string
  conversation_id: string
  org_id: string | null
  entity_type: ConversationConnectionEntityType
  entity_id: string
  is_primary: boolean
  created_at: string
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function spaceIdFromMetadata(metadata: unknown): string | null {
  const value = asRecord(metadata).space_id
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function keyFor(type: ConversationConnectionEntityType, id: string): string {
  return `${type}:${id}`
}

/** Union column-backed campaign_id / metadata.space_id with table rows. No backfill. */
export function unionConversationConnections(input: {
  conversationId: string
  orgId?: string | null
  campaignId?: string | null
  metadata?: unknown
  rows: ConversationConnectionRow[]
}): ConversationConnection[] {
  const seen = new Set<string>()
  const next: ConversationConnection[] = []
  const campaignId = input.campaignId?.trim() || null
  const spaceId = spaceIdFromMetadata(input.metadata)

  const push = (connection: ConversationConnection) => {
    const key = keyFor(connection.entity_type, connection.entity_id)
    if (seen.has(key)) return
    seen.add(key)
    next.push(connection)
  }

  if (campaignId) {
    const tableRow = input.rows.find(
      (row) => row.entity_type === 'campaign' && row.entity_id === campaignId,
    )
    push({
      id: tableRow?.id ?? null,
      conversation_id: input.conversationId,
      org_id: tableRow?.org_id ?? input.orgId ?? null,
      entity_type: 'campaign',
      entity_id: campaignId,
      is_primary: true,
      created_at: tableRow?.created_at ?? '',
      source: tableRow ? 'table' : 'column',
    })
  }

  if (spaceId) {
    const tableRow = input.rows.find(
      (row) => row.entity_type === 'space' && row.entity_id === spaceId,
    )
    push({
      id: tableRow?.id ?? null,
      conversation_id: input.conversationId,
      org_id: tableRow?.org_id ?? input.orgId ?? null,
      entity_type: 'space',
      entity_id: spaceId,
      is_primary: false,
      created_at: tableRow?.created_at ?? '',
      source: tableRow ? 'table' : 'column',
    })
  }

  for (const row of input.rows) {
    push({
      ...row,
      is_primary: campaignId
        ? row.entity_type === 'campaign' && row.entity_id === campaignId
        : row.is_primary,
      source: 'table',
    })
  }

  return next
}

export function extraCampaignIdsFromConnections(
  connections: ConversationConnection[],
  primaryCampaignId?: string | null,
  limit = 2,
): string[] {
  const primary = primaryCampaignId?.trim() || null
  return connections
    .filter((row) => row.entity_type === 'campaign' && row.entity_id !== primary)
    .map((row) => row.entity_id)
    .slice(0, limit)
}
