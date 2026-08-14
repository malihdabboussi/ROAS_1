import { describe, expect, it, vi } from 'vitest'
import { ArtifactNotificationsService } from './artifact-notifications.service'
import { ArtifactStrategyService } from './artifact-strategy.service'

describe('small artifact action data access', () => {
  it('reads and writes the normalized campaign Canvas for Pixel', async () => {
    let boardRevision = 4
    const repository = {
      canAccessCanvasCampaign: vi.fn(async () => ({ data: true, error: null })),
      getOrCreateCanvas: vi.fn(async () => ({
        data: { id: 'board-1', revision: boardRevision },
        error: null,
      })),
      getCanvasItems: vi.fn(async () => ({ data: [{ id: 'item-1' }], error: null })),
      getCanvasConnectors: vi.fn(async () => ({ data: [], error: null })),
      applyCanvasOperations: vi.fn(async () => {
        boardRevision += 1
        return {
          data: { operation_id: `operation-${boardRevision}`, committed_revision: boardRevision },
          error: null,
        }
      }),
    }
    const target = {
      resolveUserId: vi.fn(() => 'user-1'),
      resolveCampaignId: vi.fn(() => 'campaign-1'),
      resolveAgentKey: vi.fn(() => 'pixel'),
      serviceClient: {},
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
      operation_id: 'operation-5',
      committed_revision: 5,
    })
    await expect(
      handlers.build_campaign_blueprint(
        {
          campaign_type: 'webinar',
          blueprint_id: 'client-webinar',
          assets: [
            {
              title: 'Registration page',
              stage_key: 'registration',
              url: 'https://example.com/register',
            },
          ],
          gaps: [
            {
              title: 'Reminder sequence',
              stage_key: 'reminder',
              asset_type: 'sequence',
              brief: 'Create reminders.',
            },
          ],
        },
        'session',
      ),
    ).resolves.toMatchObject({
      success: true,
      blueprint_id: 'client-webinar',
      campaign_type: 'webinar',
      item_count: 10,
      connector_count: 7,
      batch_count: 3,
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
    expect(repository.applyCanvasOperations).toHaveBeenLastCalledWith(
      {},
      expect.objectContaining({
        boardId: 'board-1',
        baseRevision: 7,
        idempotencyKey: 'campaign-blueprint:client-webinar:batch:3',
        operations: expect.arrayContaining([
          expect.objectContaining({ op: 'create_connector' }),
        ]),
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
      serviceClient: {},
    }
    const handlers = new ArtifactStrategyService(repository as never).getHandlers(target)

    await expect(handlers.get_canvas_board({}, 'session')).resolves.toEqual({
      success: false,
      error: 'You do not have access to this campaign Canvas.',
    })
    expect(repository.getOrCreateCanvas).not.toHaveBeenCalled()
  })

  it('replaces a placeholder in place with the created campaign resource', async () => {
    const placeholder = {
      id: 'placeholder-1',
      kind: 'card',
      position_x: 28,
      position_y: 76,
      width: 264,
      height: 150,
      rotation: 0,
      z_index: 2,
      parent_id: 'frame-1',
      content: {
        title: 'Reminder sequence',
        semantic_type: 'asset_placeholder',
        blueprint_id: 'webinar-proof',
        placeholder: { asset_type: 'sequence', brief: 'Create reminders.' },
      },
      style: { backgroundColor: '#fff' },
      locked: false,
    }
    const repository = {
      canAccessCanvasCampaign: vi.fn(async () => ({ data: true, error: null })),
      getOrCreateCanvas: vi.fn(async () => ({
        data: { id: 'board-1', revision: 8 },
        error: null,
      })),
      getCanvasItems: vi.fn(async () => ({ data: [placeholder], error: null })),
      applyCanvasOperations: vi.fn(async () => ({
        data: { operation_id: 'operation-9', committed_revision: 9 },
        error: null,
      })),
    }
    const target = {
      resolveUserId: vi.fn(() => 'user-1'),
      resolveCampaignId: vi.fn(() => 'campaign-1'),
      resolveAgentKey: vi.fn(() => 'pixel'),
      serviceClient: {},
    }
    const handlers = new ArtifactStrategyService(repository as never).getHandlers(target)

    await expect(
      handlers.complete_canvas_placeholder(
        {
          node_id: 'placeholder-1',
          title: 'Webinar reminder sequence',
          resource_type: 'sequence',
          resource_id: 'sequence-1',
        },
        'session',
      ),
    ).resolves.toMatchObject({
      success: true,
      node_id: 'placeholder-1',
      resource_type: 'sequence',
      resource_id: 'sequence-1',
      committed_revision: 9,
    })
    expect(repository.applyCanvasOperations).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        boardId: 'board-1',
        baseRevision: 8,
        actorAgentKey: 'pixel',
        operations: [
          { op: 'delete_item', item_id: 'placeholder-1' },
          expect.objectContaining({
            op: 'create_item',
            item: expect.objectContaining({
              id: 'placeholder-1',
              kind: 'resource_card',
              parent_id: 'frame-1',
              resource_type: 'sequence',
              resource_id: 'sequence-1',
              content: expect.objectContaining({
                semantic_type: 'existing_asset',
                status: 'ready',
                blueprint_id: 'webinar-proof',
              }),
            }),
          }),
        ],
      }),
    )
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
      serviceClient: supabase,
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
