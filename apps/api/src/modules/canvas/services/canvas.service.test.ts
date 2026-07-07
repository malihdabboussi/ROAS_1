import { describe, expect, it, vi } from 'vitest'
import { CanvasRepository } from '../repositories/canvas.repository'
import { CanvasService } from './canvas.service'

function createQuery(result: { data?: unknown; error?: unknown }) {
  const query = {
    select: vi.fn(() => query),
    insert: vi.fn(() => query),
    update: vi.fn(() => query),
    eq: vi.fn(() => query),
    maybeSingle: vi.fn().mockResolvedValue(result),
    single: vi.fn().mockResolvedValue(result),
  }
  return query
}

describe('CanvasService promotion', () => {
  it('creates an ad row from a canvas node and marks the node ready', async () => {
    const node = {
      id: 'node-1',
      canvas_id: 'canvas-1',
      user_id: 'user-1',
      org_id: 'org-1',
      kind: 'copy',
      status: 'ready',
      parent_node_id: null,
      parent_image_node_id: null,
      ad_id: null,
      image_asset_id: 'image-1',
      payload: {
        headline: 'Launch',
        primary_text: 'Primary copy',
        description: 'Description',
        destination_url: 'https://example.com',
        placement: 'story',
      },
      position_x: 0,
      position_y: 0,
      created_at: '',
      updated_at: '',
    }
    const canvas = {
      id: 'canvas-1',
      ad_set_id: 'ad-set-1',
      user_id: 'user-1',
      org_id: 'org-1',
      default_model_id: 'model-1',
      graph: { nodes: [], edges: [] },
      viewport: { x: 0, y: 0, zoom: 1 },
      created_at: '',
      updated_at: '',
    }
    const ad = { id: 'ad-1', headline: 'Launch' }
    const firstNodeLookup = createQuery({ data: node, error: null })
    const canvasLookup = createQuery({ data: canvas, error: null })
    const adInsert = createQuery({ data: ad, error: null })
    const secondNodeLookup = createQuery({ data: node, error: null })
    const nodeUpdate = createQuery({ data: { ...node, ad_id: 'ad-1' }, error: null })
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'ad_creative_canvases') return canvasLookup
        if (table === 'ads') return adInsert
        if (table === 'ad_creative_nodes') {
          const nodeCallCount = supabase.from.mock.calls.filter(
            ([name]) => name === 'ad_creative_nodes',
          ).length
          if (nodeCallCount === 1) return firstNodeLookup
          if (nodeCallCount === 2) return secondNodeLookup
          return nodeUpdate
        }
        throw new Error(`Unexpected table: ${table}`)
      }),
    }
    const artifactsService = {
      getAdSet: vi.fn().mockResolvedValue({ id: 'ad-set-1', ad_campaign_id: 'ad-campaign-1' }),
      getAdCampaign: vi.fn().mockResolvedValue({ id: 'ad-campaign-1', campaign_id: 'campaign-1' }),
    }
    const service = new CanvasService(new CanvasRepository(), artifactsService as never)

    const result = await service.promoteNodeToAd(
      supabase as never,
      'node-1',
      'user-1',
      'org-1',
    )

    expect(adInsert.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        campaign_id: 'campaign-1',
        ad_set_id: 'ad-set-1',
        placement: 'story',
        headline: 'Launch',
        primary_text: 'Primary copy',
        image_asset_id: 'image-1',
        org_id: 'org-1',
      }),
    )
    expect(nodeUpdate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        ad_id: 'ad-1',
        status: 'ready',
      }),
    )
    expect(result).toEqual({ ad, created: true })
  })
})
