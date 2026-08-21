import { describe, expect, it } from 'vitest'
import {
  extraCampaignIdsFromConnections,
  unionConversationConnections,
} from './conversation-connections.union'

describe('unionConversationConnections', () => {
  it('surfaces column-backed campaign and space when the table is empty', () => {
    expect(
      unionConversationConnections({
        conversationId: 'conv-1',
        orgId: 'org-1',
        campaignId: 'campaign-1',
        metadata: { space_id: 'space-1' },
        rows: [],
      }),
    ).toEqual([
      {
        id: null,
        conversation_id: 'conv-1',
        org_id: 'org-1',
        entity_type: 'campaign',
        entity_id: 'campaign-1',
        is_primary: true,
        created_at: '',
        source: 'column',
      },
      {
        id: null,
        conversation_id: 'conv-1',
        org_id: 'org-1',
        entity_type: 'space',
        entity_id: 'space-1',
        is_primary: false,
        created_at: '',
        source: 'column',
      },
    ])
  })

  it('dedupes table rows that already match campaign_id', () => {
    const connections = unionConversationConnections({
      conversationId: 'conv-1',
      campaignId: 'campaign-1',
      metadata: {},
      rows: [
        {
          id: 'row-1',
          conversation_id: 'conv-1',
          org_id: 'org-1',
          entity_type: 'campaign',
          entity_id: 'campaign-1',
          is_primary: true,
          created_at: '2026-08-20T00:00:00.000Z',
        },
        {
          id: 'row-2',
          conversation_id: 'conv-1',
          org_id: 'org-1',
          entity_type: 'campaign',
          entity_id: 'campaign-2',
          is_primary: false,
          created_at: '2026-08-20T00:01:00.000Z',
        },
      ],
    })
    expect(connections.map((row) => row.entity_id)).toEqual(['campaign-1', 'campaign-2'])
    expect(connections[0]?.source).toBe('table')
    expect(extraCampaignIdsFromConnections(connections, 'campaign-1')).toEqual(['campaign-2'])
  })
})
