import { describe, expect, it, vi } from 'vitest'
import { ArtifactNotificationsService } from './artifact-notifications.service'
import { ArtifactStrategyService } from './artifact-strategy.service'

describe('small artifact action data access', () => {
  it('reads and writes the normalized campaign Canvas for Pixel', async () => {
    const repository = {
      canAccessCanvasCampaign: vi.fn(async () => ({ data: true, error: null })),
      getOrCreateCanvas: vi.fn(async () => ({
        data: { id: 'board-1', revision: 4 },
        error: null,
      })),
      getCanvasItems: vi.fn(async () => ({ data: [{ id: 'item-1' }], error: null })),
      getCanvasConnectors: vi.fn(async () => ({ data: [], error: null })),
      applyCanvasOperations: vi.fn(async () => ({
        data: { operation_id: 'operation-1', committed_revision: 5 },
        error: null,
      })),
    }
    const target = {
      resolveUserId: vi.fn(() => 'user-1'),
      resolveCampaignId: vi.fn(() => 'campaign-1'),
      resolveAgentKey: vi.fn(() => 'pixel'),
      getServiceSupabase: vi.fn(async () => ({})),
    }
    const handlers = new ArtifactStrategyService(repository as never).getHandlers(target)

    await expect(handlers.get_canvas_board({}, 'session')).resolves.toMatchObject({
      success: true,
      board: { id: 'board-1', revision: 4 },
      items: [{ id: 'item-1' }],
    })
    await expect(
      handlers.apply_canvas_operations(
        {
          base_revision: 4,
          operations: [{ op: 'create_item', item: { id: 'item-2' } }],
        },
        'session',
      ),
    ).resolves.toEqual({
      success: true,
      operation_id: 'operation-1',
      committed_revision: 5,
    })
    expect(repository.applyCanvasOperations).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        boardId: 'board-1',
        userId: 'user-1',
        baseRevision: 4,
        actorAgentKey: 'pixel',
      }),
    )
  })

  it('does not let the service-role Canvas handler bypass invoking-user access', async () => {
    const repository = {
      canAccessCanvasCampaign: vi.fn(async () => ({ data: false, error: null })),
      getOrCreateCanvas: vi.fn(),
    }
    const target = {
      resolveUserId: vi.fn(() => 'user-1'),
      resolveCampaignId: vi.fn(() => 'campaign-1'),
      getServiceSupabase: vi.fn(async () => ({})),
    }
    const handlers = new ArtifactStrategyService(repository as never).getHandlers(target)

    await expect(handlers.get_canvas_board({}, 'session')).resolves.toEqual({
      success: false,
      error: 'You do not have access to this campaign Canvas.',
    })
    expect(repository.getOrCreateCanvas).not.toHaveBeenCalled()
  })

  it('creates and lists strategy nodes', async () => {
    const insertMock = vi.fn()
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'campaign_strategy_nodes') {
          const chain: any = {
            insert: vi.fn((payload) => {
              insertMock(payload)
              return chain
            }),
            select: vi.fn(() => chain),
            single: vi.fn(async () => ({
              data: { id: 'node-1', text: 'Positioning idea' },
              error: null,
            })),
            eq: vi.fn(() => chain),
            order: vi.fn(async () => ({
              data: [{ id: 'node-1', text: 'Positioning idea' }],
              error: null,
            })),
          }
          return chain
        }
        return {}
      }),
    }
    const target = {
      resolveUserId: vi.fn(() => 'user-1'),
      resolveCampaignId: vi.fn(() => 'campaign-1'),
      getServiceSupabase: vi.fn(async () => supabase),
    }
    const handlers = new ArtifactStrategyService().getHandlers(target)

    await expect(
      handlers.create_strategy_node(
        {
          node_type: 'sticky_note',
          text: 'Positioning idea',
          color: 'yellow',
          artifact_hint: 'hero',
          position_x: 12,
          position_y: 20,
        },
        'session',
      ),
    ).resolves.toMatchObject({
      success: true,
      strategy_node: { id: 'node-1', text: 'Positioning idea' },
    })
    expect(insertMock).toHaveBeenCalledWith({
      user_id: 'user-1',
      campaign_id: 'campaign-1',
      node_type: 'sticky_note',
      text: 'Positioning idea',
      color: 'yellow',
      artifact_hint: 'hero',
      position_x: 12,
      position_y: 20,
    })

    await expect(handlers.list_strategy_nodes({}, 'session')).resolves.toEqual({
      success: true,
      strategy_nodes: [{ id: 'node-1', text: 'Positioning idea' }],
    })
  })

  it('saves in-app agent messages without requiring channel push config', async () => {
    const insertMock = vi.fn()
    const serviceClient = {
      from: vi.fn((table: string) => {
        if (table === 'user_notifications') {
          return {
            insert: vi.fn(async (payload) => {
              insertMock(payload)
              return { error: null }
            }),
          }
        }
        return {}
      }),
    }
    const target = {
      resolveUserId: vi.fn(() => 'user-1'),
      parseAgentIdFromSessionKey: vi.fn(() => 'designer'),
      resolveOrgId: vi.fn(() => 'org-1'),
      serviceClient,
      config: { get: vi.fn(() => undefined) },
    }
    const handlers = new ArtifactNotificationsService().getHandlers(target)

    await expect(handlers.send_user_message({ message: '  Hello user  ' }, 'session')).resolves.toEqual({
      success: true,
      channels: { in_app: true },
    })
    expect(insertMock).toHaveBeenCalledWith({
      user_id: 'user-1',
      org_id: 'org-1',
      type: 'agent_message',
      title: 'Message from designer',
      body: 'Hello user',
      metadata: { agent_key: 'designer', source: 'send_user_message' },
    })
  })
})
