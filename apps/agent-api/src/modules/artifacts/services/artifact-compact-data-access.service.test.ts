import { createHash } from 'crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ArtifactAnalyticsService } from './artifact-analytics.service'
import { ArtifactAvatarsService } from './artifact-avatars.service'
import { ArtifactBlogService } from './artifact-blog.service'
import { ArtifactCanvasService } from './artifact-canvas.service'
import { ArtifactCustomObjectsService } from './artifact-custom-objects.service'
import { ArtifactMcpService } from './artifact-mcp.service'
import { ArtifactNorthStarService } from './artifact-north-star.service'
import { ArtifactThemesService } from './artifact-themes.service'
import { ArtifactVisualDocService } from './artifact-visual-doc.service'

function query(result: Record<string, unknown>) {
  const chain: any = {
    contains: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    gte: vi.fn(() => chain),
    in: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    is: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    lte: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => result),
    not: vi.fn(() => chain),
    or: vi.fn(() => chain),
    order: vi.fn(() => chain),
    select: vi.fn(() => chain),
    single: vi.fn(async () => result),
    update: vi.fn(() => chain),
    then(
      onFulfilled: (value: Record<string, unknown>) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) {
      return Promise.resolve(result).then(onFulfilled, onRejected)
    },
  }
  return chain
}

describe('compact artifact data-access services', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('builds the daily report from campaign analytics RPCs and social counts', async () => {
    const counts = [4, 3, 2, 12]
    const supabase = {
      rpc: vi.fn(async (name: string, params: Record<string, unknown>) => ({
        data: { name, campaign: params.p_campaign_id },
        error: null,
      })),
      from: vi.fn(() => query({ data: null, count: counts.shift(), error: null })),
    }
    const target = {
      actionRegistry: {
        get_meta_ads_insights: vi.fn(async () => ({ spend: 42 })),
      },
      getUserClient: vi.fn(async () => supabase),
      logger: { error: vi.fn(), warn: vi.fn() },
      resolveCampaignId: vi.fn(async () => 'campaign-1'),
      resolveUserId: vi.fn(() => 'user-1'),
    }
    const handlers = new ArtifactAnalyticsService().getHandlers(target)

    const result = (await handlers.get_daily_report_data({ hours: 12 }, 'session')) as any

    expect(result.campaign_id).toBe('campaign-1')
    expect(result.period.hours).toBe(12)
    expect(result.funnels).toMatchObject({ name: 'get_campaign_analytics' })
    expect(result.meta_insights).toEqual({ spend: 42 })
    expect(result.social).toEqual({
      created_24h: 4,
      published_24h: 3,
      scheduled_24h: 2,
      total: 12,
    })
    expect(supabase.rpc).toHaveBeenCalledTimes(3)
  })

  it('creates a blog post with campaign and space scope', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true })))
    let insertedBlog: Record<string, unknown> | null = null
    let updatedSpace: Record<string, unknown> | null = null
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'blog_posts') {
          const chain = query({ data: null, error: null })
          chain.insert = vi.fn((payload: Record<string, unknown>) => {
            insertedBlog = payload
            return chain
          })
          chain.single = vi.fn(async () => ({
            data: {
              id: 'blog-1',
              cover_image: null,
              status: insertedBlog?.status,
              title: insertedBlog?.title,
            },
            error: null,
          }))
          return chain
        }
        if (table === 'spaces') {
          const chain = query({ data: { id: 'space-1', schema: { views: [] } }, error: null })
          chain.update = vi.fn((payload: Record<string, unknown>) => {
            updatedSpace = payload
            return chain
          })
          return chain
        }
        return query({ data: null, error: null })
      }),
    }
    const target = {
      getUserClient: vi.fn(async () => supabase),
      isMissionSessionKey: vi.fn(() => false),
      logger: { warn: vi.fn() },
      resolveCampaignId: vi.fn(async () => 'campaign-1'),
      resolveOrgId: vi.fn(() => 'org-1'),
      resolveUserId: vi.fn(() => 'user-1'),
    }
    const handlers = new ArtifactBlogService().getHandlers(target)

    const result = (await handlers.create_blog_post(
      {
        content: [{ type: 'paragraph', text: 'Body' }],
        funnel_id: 'funnel-1',
        slug: 'launch',
        space_id: 'space-1',
        title: 'Launch',
      },
      'session',
    )) as any

    expect(result.id).toBe('blog-1')
    expect(insertedBlog).toMatchObject({
      campaign_id: 'campaign-1',
      funnel_id: 'funnel-1',
      org_id: 'org-1',
      slug: 'launch',
      space_id: 'space-1',
      title: 'Launch',
      user_id: 'user-1',
    })
    expect(updatedSpace?.schema).toMatchObject({
      views: [expect.objectContaining({ type: 'websites' })],
    })
  })

  it('generates and persists visual doc html for a space doc', async () => {
    vi.stubEnv('OPENROUTER_API_KEY', 'test-key')
    const generatedHtml = `<!doctype html><html><body>${'Generated visual doc '.repeat(8)}</body></html>`
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        json: async () => ({ choices: [{ message: { content: generatedHtml } }] }),
        ok: true,
      })),
    )
    let updatePayload: Record<string, any> | null = null
    const supabase = {
      from: vi.fn(() => {
        const chain = query({
          data: {
            id: 'item-1',
            custom_data: { _view_type: 'doc' },
            doc_body: '<h1>Source</h1>',
            space_id: 'space-1',
            title: 'Source Doc',
          },
          error: null,
        })
        chain.update = vi.fn((payload: Record<string, any>) => {
          updatePayload = payload
          return chain
        })
        chain.single = vi.fn(async () => ({
          data: {
            id: 'item-1',
            custom_data: updatePayload?.custom_data,
            doc_body: '<h1>Source</h1>',
            space_id: 'space-1',
            title: 'Source Doc',
          },
          error: null,
        }))
        return chain
      }),
    }
    const target = {
      getUserClient: vi.fn(async () => supabase),
      parseConversationId: vi.fn(() => null),
      requestContext: new Map(),
      resolveUserId: vi.fn(() => 'user-1'),
    }
    const handlers = new ArtifactVisualDocService().getHandlers(target)

    const result = (await handlers.generate_visual_html(
      { item_id: 'item-1', prompt: 'Make it visual' },
      'session',
    )) as any

    expect(result.success).toBe(true)
    expect(result.html).toContain('Generated visual doc')
    expect(updatePayload?.custom_data).toMatchObject({
      _doc_visual_html: expect.stringContaining('Generated visual doc'),
      _doc_visual_last_error: null,
      _doc_visual_source_hash: createHash('sha256').update('<h1>Source</h1>').digest('hex'),
      _doc_visual_status: 'ready',
    })
  })

  it('creates and lists custom object records through user-scoped handlers', async () => {
    let insertedRecord: Record<string, unknown> | null = null
    const recordRows = [{ id: 'object-1', data: { name: 'Acme' } }]
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'user_object_types') {
          return query({ data: { id: 'type-1' }, error: null })
        }
        if (table === 'user_object_records') {
          const chain = query({ data: recordRows, error: null })
          chain.insert = vi.fn((payload: Record<string, unknown>) => {
            insertedRecord = payload
            return chain
          })
          chain.single = vi.fn(async () => ({
            data: { id: 'object-1', ...insertedRecord },
            error: null,
          }))
          return chain
        }
        return query({ data: null, error: null })
      }),
    }
    const target = {
      getUserClient: vi.fn(async () => supabase),
      parseAgentIdFromSessionKey: vi.fn(() => 'agent-1'),
      resolveUserId: vi.fn(() => 'user-1'),
    }
    const handlers = new ArtifactCustomObjectsService().getHandlers(target)

    const created = (await handlers.create_object(
      { data: { name: 'Acme' }, object_type_id: 'type-1' },
      'session',
    )) as any
    const listed = (await handlers.list_objects({ object_type: 'account' }, 'session')) as any

    expect(created).toMatchObject({ success: true, object: { id: 'object-1' } })
    expect(insertedRecord).toMatchObject({
      created_by_agent: 'agent-1',
      data: { name: 'Acme' },
      object_type_id: 'type-1',
      user_id: 'user-1',
    })
    expect(listed).toEqual({ success: true, objects: recordRows })
  })

  it('lists canvas nodes and patches generated image metadata onto a node', async () => {
    let updatedNode: Record<string, unknown> | null = null
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'ad_creative_canvases') {
          return query({ data: { id: 'canvas-1' }, error: null })
        }
        if (table === 'ad_creative_nodes') {
          const chain = query({
            data: [{ id: 'node-1', kind: 'image', payload: {} }],
            error: null,
          })
          chain.maybeSingle = vi.fn(async () => ({ data: { payload: { prior: true } }, error: null }))
          chain.update = vi.fn((payload: Record<string, unknown>) => {
            updatedNode = payload
            return chain
          })
          return chain
        }
        return query({ data: null, error: null })
      }),
    }
    const target = {
      getUserClient: vi.fn(async () => supabase),
      resolveUserId: vi.fn(() => 'user-1'),
    }
    const service = new ArtifactCanvasService()
    const handlers = service.getHandlers(target)

    const listed = (await handlers.list_canvas_nodes({ ad_set_id: 'ad-set-1' }, 'session')) as any
    await service.patchCanvasNodeFromImage(
      supabase,
      'user-1',
      'node-1',
      { image_asset_id: 'asset-1', url: 'https://example.com/image.png' },
      'Prompt',
      'model-1',
    )

    expect(listed).toEqual({
      success: true,
      canvas_id: 'canvas-1',
      nodes: [{ id: 'node-1', kind: 'image', payload: {} }],
    })
    expect(updatedNode).toMatchObject({
      image_asset_id: 'asset-1',
      payload: {
        crafted_prompt: 'Prompt',
        image_asset_id: 'asset-1',
        image_url: 'https://example.com/image.png',
        model: 'model-1',
        prior: true,
      },
      status: 'ready',
    })
  })

  it('lists avatars using resolved user and campaign scope', async () => {
    const avatarRows = [{ id: 'avatar-1', name: 'Founder Persona' }]
    const supabase = {
      from: vi.fn((table: string) => {
        expect(table).toBe('avatars')
        return query({ data: avatarRows, error: null })
      }),
    }
    const target = {
      getUserClient: vi.fn(async () => supabase),
      resolveCampaignId: vi.fn(async () => 'campaign-1'),
      resolveUserId: vi.fn(() => 'user-1'),
    }
    const handlers = new ArtifactAvatarsService().getHandlers(target)

    const result = await handlers.list_avatars({}, 'session')

    expect(result).toEqual(avatarRows)
    expect(target.resolveCampaignId).toHaveBeenCalledWith(supabase, {}, 'user-1', 'session')
  })

  it('marks the active branding theme from campaign agent settings', async () => {
    const themeRows = [
      { id: 'theme-1', name: 'One' },
      { id: 'theme-2', name: 'Two' },
    ]
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'branding_themes') {
          return query({ data: themeRows, error: null })
        }
        if (table === 'campaigns') {
          return query({
            data: { config: { agent_settings: { theme_id: 'theme-2' } } },
            error: null,
          })
        }
        return query({ data: null, error: null })
      }),
    }
    const target = {
      getThemeTableName: vi.fn(async () => 'branding_themes'),
      getUserClient: vi.fn(async () => supabase),
      parseThemeId: vi.fn((value: unknown) => (typeof value === 'string' ? value : null)),
      resolveCampaignId: vi.fn(async () => 'campaign-1'),
      resolveOrgId: vi.fn(() => 'org-1'),
      resolveUserId: vi.fn(() => 'user-1'),
    }
    const handlers = new ArtifactThemesService().getHandlers(target)

    const result = (await handlers.list_themes({}, 'session')) as Array<Record<string, unknown>>

    expect(result).toEqual([
      { id: 'theme-1', name: 'One', is_active: false },
      { id: 'theme-2', name: 'Two', is_active: true },
    ])
  })

  it('creates a north-star awareness point with agent and org scope', async () => {
    let insertedPayload: Record<string, unknown> | null = null
    const serviceClient = {
      from: vi.fn((table: string) => {
        expect(table).toBe('agent_awareness_points')
        const chain = query({ data: { id: 'point-1', content: 'Stay focused' }, error: null })
        chain.insert = vi.fn((payload: Record<string, unknown>) => {
          insertedPayload = payload
          return chain
        })
        return chain
      }),
    }
    const target = {
      parseAgentIdFromSessionKey: vi.fn(() => 'vibey'),
      resolveOrgId: vi.fn(() => 'org-1'),
      resolveUserId: vi.fn(() => 'user-1'),
      serviceClient,
    }
    const handlers = new ArtifactNorthStarService().getHandlers(target)

    const result = await handlers.create_awareness_point(
      { campaign_id: 'campaign-1', content: 'Stay focused', point_type: 'principle' },
      'agent:vibey:stub',
    )

    expect(result).toEqual({ id: 'point-1', content: 'Stay focused' })
    expect(insertedPayload).toEqual({
      agent_key: 'vibey',
      campaign_id: 'campaign-1',
      content: 'Stay focused',
      org_id: 'org-1',
      point_type: 'principle',
      user_id: 'user-1',
    })
  })

  it('lists MCP servers from the first project repo context', async () => {
    const supabase = {
      from: vi.fn((table: string) => {
        expect(table).toBe('project_repos')
        return query({ data: { id: 'project-1' }, error: null })
      }),
    }
    const mcpConfig = {
      listServers: vi.fn(async () => [{ id: 'server-1', name: 'Docs' }]),
    }
    const service = new ArtifactMcpService(mcpConfig as any, {} as any)
    const target = {
      getUserClient: vi.fn(async () => supabase),
      resolveUserId: vi.fn(() => 'user-1'),
    }
    const handlers = service.getHandlers(target)

    const result = await handlers.list_mcp_servers({}, 'session')

    expect(result).toEqual({ success: true, servers: [{ id: 'server-1', name: 'Docs' }] })
    expect(mcpConfig.listServers).toHaveBeenCalledWith(supabase, 'project-1')
  })
})
