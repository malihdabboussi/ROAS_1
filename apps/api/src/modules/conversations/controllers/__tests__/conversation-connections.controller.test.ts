import { describe, expect, it, vi } from 'vitest'
import { ConversationConnectionsController } from '../conversation-connections.controller'

describe('ConversationConnectionsController', () => {
  it('lists, adds, and removes through the connections service', async () => {
    const connectionsService = {
      list: vi.fn().mockResolvedValue({ connections: [] }),
      add: vi.fn().mockResolvedValue({
        connection: { entity_id: 'campaign-2' },
        promoted_primary: false,
        conversation: { id: 'conv-1' },
      }),
      remove: vi.fn().mockResolvedValue({ connections: [], conversation: { id: 'conv-1' } }),
    }
    const controller = new ConversationConnectionsController(connectionsService as never)
    const user = { id: 'user-1', email: 'a@b.co' }
    const supabase = {} as never
    const scope = { orgId: 'org-1', orgRole: 'editor' } as never

    await controller.list(user, supabase, scope, { id: 'conv-1' })
    expect(connectionsService.list).toHaveBeenCalledWith(
      supabase,
      'user-1',
      'conv-1',
      'org-1',
      'editor',
    )

    await controller.add(
      user,
      supabase,
      scope,
      { id: 'conv-1' },
      { entity_type: 'campaign', entity_id: 'campaign-2' },
    )
    expect(connectionsService.add).toHaveBeenCalledWith(
      supabase,
      'user-1',
      'conv-1',
      { entity_type: 'campaign', entity_id: 'campaign-2' },
      'org-1',
      'editor',
    )

    await controller.remove(user, supabase, scope, {
      id: 'conv-1',
      entityType: 'campaign',
      entityId: 'campaign-2',
    })
    expect(connectionsService.remove).toHaveBeenCalledWith(
      supabase,
      'user-1',
      'conv-1',
      'campaign',
      'campaign-2',
      'org-1',
      'editor',
    )
  })
})
