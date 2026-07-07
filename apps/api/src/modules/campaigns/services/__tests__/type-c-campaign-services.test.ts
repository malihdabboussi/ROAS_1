import { describe, expect, it, vi } from 'vitest'
import { AdVariationGeneratorService } from '../ad-variation-generator.service'
import { ArtifactsService } from '../artifacts.service'
import { CampaignsService } from '../campaigns.service'
import { SocialInsightsService } from '../social-insights.service'
import { WorkflowEdgeDeleteCleanupService } from '../workflow-edge-delete-cleanup.service'
import { WorkflowsService } from '../workflows.service'

function thenable<T>(value: T) {
  return {
    then: (resolve: (value: T) => unknown) => resolve(value),
    catch: () => thenable(value),
  }
}

function chain<T>(value: T, extras: Record<string, unknown> = {}) {
  const query: Record<string, any> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(value),
    single: vi.fn().mockResolvedValue(value),
    ...extras,
  }
  query.then = (resolve: (value: T) => unknown) => resolve(value)
  query.catch = () => query
  return query
}

describe('Campaign Type C characterization', () => {
  it('lists campaign documents with signed presentation file URLs', async () => {
    const artifacts = new ArtifactsService({} as any, {} as any)
    const signed = vi
      .fn()
      .mockResolvedValue({ data: { signedUrl: 'https://signed.test/deck.pdf' } })
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'conversation_documents') {
          return chain({
            data: [
              {
                id: 'doc-1',
                campaign_id: 'campaign-1',
                created_at: '2026-06-16T10:00:00.000Z',
              },
            ],
            error: null,
          })
        }
        if (table === 'presentations') {
          return chain({
            data: [
              {
                id: 'presentation-1',
                name: 'Deck',
                file_url:
                  'https://project.supabase.co/storage/v1/object/presentations/campaign/deck.pdf',
                status: 'published',
                created_at: '2026-06-16T11:00:00.000Z',
                updated_at: '2026-06-16T11:05:00.000Z',
              },
            ],
            error: null,
          })
        }
        return chain({ data: [], error: null })
      }),
      storage: { from: vi.fn(() => ({ createSignedUrl: signed })) },
    }

    const result = await artifacts.listDocumentsByCampaign(supabase as any, 'campaign-1')

    expect(result[0]).toMatchObject({
      id: 'lm-presentation-1',
      title: 'Deck',
      content: { file_url: 'https://signed.test/deck.pdf', type: 'pdf' },
    })
    expect(result[1]).toMatchObject({ id: 'doc-1' })
    expect(signed).toHaveBeenCalledWith('campaign/deck.pdf', 365 * 24 * 60 * 60)
  })

  it('schedules a social post by upserting schedule state and updating the post', async () => {
    const lifecycle = { processArtifactLifecycleEvent: vi.fn().mockResolvedValue(undefined) }
    const artifacts = new ArtifactsService({} as any, {} as any, {} as any, lifecycle as any)
    const scheduleUpserts: Array<Record<string, unknown>> = []
    const postUpdates: Array<Record<string, unknown>> = []
    const post = {
      id: 'post-1',
      user_id: 'user-1',
      campaign_id: 'campaign-1',
      org_id: 'org-1',
      post_type: 'single_image',
      image_url: 'https://example.com/post.png',
      video_url: null,
      caption: 'Launch post',
    }
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'social_posts') {
          return chain(
            { data: post, error: null },
            {
              update: vi.fn((payload: Record<string, unknown>) => {
                postUpdates.push(payload)
                return chain({ data: { ...post, ...payload }, error: null })
              }),
            },
          )
        }
        if (table === 'social_post_schedules') {
          return {
            upsert: vi.fn((payload: Record<string, unknown>) => {
              scheduleUpserts.push(payload)
              return chain({ data: { id: 'schedule-1' }, error: null })
            }),
          }
        }
        return chain({ data: null, error: null })
      }),
    }

    const result = await artifacts.scheduleSocialPost(
      supabase as any,
      'post-1',
      '2026-06-17T09:00:00.000Z',
    )

    expect(scheduleUpserts[0]).toMatchObject({
      social_post_id: 'post-1',
      user_id: 'user-1',
      org_id: 'org-1',
      campaign_id: 'campaign-1',
      scheduled_at: '2026-06-17T09:00:00.000Z',
      status: 'scheduled',
    })
    expect(postUpdates[0]).toMatchObject({
      scheduled_at: '2026-06-17T09:00:00.000Z',
      status: 'scheduled',
    })
    expect(result).toMatchObject({ id: 'post-1', status: 'scheduled' })
    expect(lifecycle.processArtifactLifecycleEvent).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        artifact_kind: 'social_post',
        lifecycle_event: 'scheduled',
        artifact_id: 'post-1',
      }),
    )
  })

  it('enriches campaign team rows from the agent registry', async () => {
    const campaignsRepo = {
      findById: vi.fn().mockResolvedValue({ id: 'campaign-1', user_id: 'owner-1', org_id: null }),
      listCampaignAgents: vi
        .fn()
        .mockResolvedValue([{ campaign_id: 'campaign-1', agent_key: 'copywriter', name: 'Draft' }]),
    }
    const service = new CampaignsService(campaignsRepo as any, {} as any, {} as any, {} as any)
    const supabase = {
      from: vi.fn(() =>
        chain({
          data: [
            {
              agent_key: 'copywriter',
              name: 'Copywriter',
              role: 'Writes ads',
              level: 'employee',
              image_url: 'https://example.com/avatar.png',
              config: { domain: 'marketing' },
            },
          ],
          error: null,
        }),
      ),
    }

    const result = await service.listCampaignTeam(supabase as any, 'viewer-1', 'campaign-1')

    expect(campaignsRepo.listCampaignAgents).toHaveBeenCalledWith(supabase, 'owner-1', 'campaign-1')
    expect(result[0]).toMatchObject({
      agent_key: 'copywriter',
      name: 'Copywriter',
      role: 'Writes ads',
      level: 'employee',
      image_url: 'https://example.com/avatar.png',
      config: { domain: 'marketing' },
    })
  })

  it('lists campaign social connection options from campaign and user integrations', async () => {
    const service = new SocialInsightsService({ executeTool: vi.fn() } as any)
    let userIntegrationCall = 0
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'campaigns') {
          return chain({ data: { org_id: 'org-1' }, error: null })
        }
        if (table === 'campaign_integration_connections') {
          return chain({
            data: {
              id: 'campaign-conn-1',
              composio_connected_account_id: 'ca-campaign',
              status: 'connected',
              metadata: { linkedin_organization_name: 'Campaign Page' },
            },
            error: null,
          })
        }
        if (table === 'user_integrations') {
          userIntegrationCall += 1
          return chain({
            data:
              userIntegrationCall === 1
                ? [
                    {
                      id: 'personal-1',
                      connection_label: 'Personal Page',
                      metadata: { composio_connected_account_id: 'ca-personal' },
                      scope_mode: 'personal',
                      is_default: false,
                    },
                  ]
                : [
                    {
                      id: 'shared-1',
                      connection_label: 'Shared Page',
                      metadata: { composio_connected_account_id: 'ca-shared' },
                      scope_mode: 'org_shared',
                      is_default: true,
                    },
                  ],
            error: null,
          })
        }
        return chain({ data: null, error: null })
      }),
    }

    const result = await service.listCampaignSocialConnectionOptions(
      supabase as any,
      'user-1',
      'campaign-1',
      'linkedin',
    )

    expect(result.map((option) => option.id)).toEqual(['campaign-conn-1', 'shared-1', 'personal-1'])
    expect(result[0]).toMatchObject({
      source: 'campaign_integration',
      label: 'Campaign Page',
      is_default: true,
    })
  })

  it('validates a funnel-to-sequence workflow edge before creating it', async () => {
    const repo = {
      findAccessibleCampaign: vi.fn().mockResolvedValue({ id: 'campaign-1', user_id: 'user-1' }),
      findWorkflowByCampaignId: vi.fn().mockResolvedValue({ id: 'workflow-1' }),
      findFunnelInCampaign: vi
        .fn()
        .mockResolvedValue({ id: 'funnel-1', campaign_id: 'campaign-1' }),
      findSequenceInCampaign: vi
        .fn()
        .mockResolvedValue({ id: 'sequence-1', campaign_id: 'campaign-1' }),
      hasEmailCaptureConversionPoint: vi.fn().mockResolvedValue(true),
      findVerifiedSenderIdentity: vi
        .fn()
        .mockResolvedValue({ id: 'sender-1', domain_id: 'domain-1' }),
      createEdge: vi.fn(async (_supabase: unknown, row: Record<string, unknown>) => ({
        id: 'edge-1',
        ...row,
      })),
    }
    const service = new WorkflowsService(
      repo as any,
      {
        cancelUnsentForEdge: vi.fn(),
      } as any,
    )
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'campaigns') {
          return chain({ data: { id: 'campaign-1', user_id: 'user-1' }, error: null })
        }
        if (table === 'funnels') {
          return chain({ data: { id: 'funnel-1', campaign_id: 'campaign-1' }, error: null })
        }
        if (table === 'sequences') {
          return chain({ data: { id: 'sequence-1', campaign_id: 'campaign-1' }, error: null })
        }
        if (table === 'email_sender_identities') {
          return chain({ data: { id: 'sender-1', domain_id: 'domain-1' }, error: null })
        }
        return chain({ data: null, error: null })
      }),
    }

    const result = await service.createEdge(supabase as any, 'user-1', 'campaign-1', {
      from_type: 'funnel',
      from_id: 'funnel-1',
      to_type: 'sequence',
      to_id: 'sequence-1',
      edge_type: 'funnel_conversion_to_sequence',
    })

    expect(repo.hasEmailCaptureConversionPoint).toHaveBeenCalledWith(supabase, 'funnel-1')
    expect(repo.createEdge).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        user_id: 'user-1',
        campaign_id: 'campaign-1',
        workflow_id: 'workflow-1',
        from_type: 'funnel',
        to_type: 'sequence',
        edge_type: 'funnel_conversion_to_sequence',
        status: 'valid',
        validation_errors: [],
      }),
    )
    expect(result).toMatchObject({ id: 'edge-1', status: 'valid', validation_errors: [] })
  })

  it('cancels unsent schedules and skips pending sends when deleting a sequence workflow edge', async () => {
    const service = new WorkflowEdgeDeleteCleanupService()
    const updates: Array<{ table: string; payload: Record<string, unknown>; query: any }> = []
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'sequence_email_sends') {
          const selectQuery = chain({
            data: [{ lead_id: 'lead-1' }, { lead_id: 'lead-2' }, { lead_id: 'lead-1' }],
            error: null,
          })
          const update = vi.fn((payload: Record<string, unknown>) => {
            const query = chain({ data: null, error: null })
            updates.push({ table, payload, query })
            return query
          })
          return { ...selectQuery, update }
        }
        if (table === 'email_single_schedules') {
          return {
            update: vi.fn((payload: Record<string, unknown>) => {
              const query = chain({ data: null, error: null })
              updates.push({ table, payload, query })
              return query
            }),
          }
        }
        return chain({ data: [], error: null })
      }),
    }

    await service.cancelUnsentForEdge(
      supabase as any,
      { from_id: 'sequence-source', to_id: 'sequence-target' },
      'sequence_complete_to_sequence',
    )

    expect(updates).toHaveLength(2)
    expect(updates[0]).toMatchObject({
      table: 'email_single_schedules',
      payload: {
        status: 'cancelled',
        error_message: 'Cancelled by workflow edge delete (sequence->sequence)',
      },
    })
    expect(updates[0].query.in).toHaveBeenCalledWith('lead_id', ['lead-1', 'lead-2'])
    expect(updates[1]).toMatchObject({
      table: 'sequence_email_sends',
      payload: { status: 'skipped' },
    })
    expect(updates[1].query.in).toHaveBeenCalledWith('lead_id', ['lead-1', 'lead-2'])
  })

  it('syncs campaign knowledge from offer, avatar, theme, and deliverable assets', async () => {
    const campaignsRepo = {
      findById: vi.fn().mockResolvedValue({ id: 'campaign-1', user_id: 'user-1', org_id: null }),
      listKnowledgeSyncOffers: vi
        .fn()
        .mockResolvedValue([
          { id: 'offer-1', name: 'Offer', step1_data: { a: 1 }, step2_data: { b: 2 } },
        ]),
      listKnowledgeSyncAvatars: vi
        .fn()
        .mockResolvedValue([{ id: 'avatar-1', name: 'Avatar', persona_data: { role: 'buyer' } }]),
      listKnowledgeSyncThemes: vi
        .fn()
        .mockResolvedValue([
          { id: 'theme-1', name: 'Theme', brand_voice: 'clear', brand_values: ['fast'] },
        ]),
      listKnowledgeSyncDeliverables: vi.fn().mockResolvedValue([
        {
          id: 'deliverable-1',
          title: 'Brief',
          type: 'brief',
          content: 'Launch brief',
          content_json: null,
          file_url: null,
          agent_key: 'atlas',
        },
      ]),
    }
    const service = new CampaignsService(campaignsRepo as any, {} as any, {} as any, {} as any)
    const upsertSpy = vi.spyOn(service as any, 'upsertAssetNode').mockResolvedValue(1)
    const supabase = {}

    const result = await service.syncKnowledgeFromAssets(supabase as any, 'user-1', 'campaign-1')

    expect(result.created).toEqual({ offer: 1, avatar: 1, theme: 1, deliverable: 1 })
    expect(upsertSpy).toHaveBeenCalledWith(
      supabase,
      'user-1',
      'campaign-1',
      'deliverable',
      'mission',
      'deliverable-1',
      'Brief',
      'Launch brief',
      { deliverable_type: 'brief', agent_key: 'atlas' },
    )
  })

  it('ingests only completed mission deliverables as campaign knowledge', async () => {
    const campaignsRepo = {
      findById: vi.fn().mockResolvedValue({ id: 'campaign-1', user_id: 'user-1', org_id: null }),
      findMissionDeliverableForKnowledge: vi.fn().mockResolvedValue({
        id: 'deliverable-1',
        mission_id: 'mission-1',
        user_id: 'user-1',
        campaign_id: 'campaign-1',
        title: 'Launch Brief',
        type: 'brief',
        content: 'Launch brief content',
        content_json: null,
        file_url: null,
        agent_key: 'atlas',
        metadata: { source: 'mission' },
      }),
      findMissionForKnowledgeDeliverable: vi.fn().mockResolvedValue({
        id: 'mission-1',
        user_id: 'user-1',
        campaign_id: 'campaign-1',
        status: 'done',
      }),
    }
    const service = new CampaignsService(campaignsRepo as any, {} as any, {} as any, {} as any)
    const ingestSpy = vi
      .spyOn(service as any, 'ingestKnowledgePayload')
      .mockResolvedValue({ id: 'node-1' })
    const supabase = {}

    const result = await service.ingestKnowledgeFromDeliverable(
      supabase as any,
      'user-1',
      'campaign-1',
      'deliverable-1',
    )

    expect(result).toEqual({ id: 'node-1' })
    expect(ingestSpy).toHaveBeenCalledWith(
      supabase,
      'user-1',
      'campaign-1',
      expect.objectContaining({
        nodeType: 'deliverable',
        title: 'Launch Brief',
        content: 'Launch brief content',
        sourceType: 'mission',
        sourceId: 'deliverable-1',
        metadata: {
          mission_id: 'mission-1',
          deliverable_type: 'brief',
          agent_key: 'atlas',
          approved_by_user: true,
        },
        domain: 'general',
      }),
    )
  })

  it('uploads generated ad variations to media storage and records media assets', async () => {
    const previousGeminiKey = process.env.GEMINI_API_KEY
    process.env.GEMINI_API_KEY = 'test-key'
    const generatedImageBase64 = Buffer.from([4, 5, 6]).toString('base64')
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3]).buffer),
        headers: { get: vi.fn().mockReturnValue('image/png') },
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          candidates: [
            {
              content: {
                parts: [{ inlineData: { data: generatedImageBase64, mimeType: 'image/png' } }],
              },
            },
          ],
        }),
      })
    vi.stubGlobal('fetch', fetchMock)

    const uploads: Array<Record<string, unknown>> = []
    const mediaAssets: Array<Record<string, unknown>> = []
    const supabase = {
      storage: {
        from: vi.fn(() => ({
          upload: vi.fn((path: string, bytes: Buffer, options: Record<string, unknown>) => {
            uploads.push({ path, bytes, options })
            return Promise.resolve({ error: null })
          }),
          createSignedUrl: vi.fn().mockResolvedValue({
            data: { signedUrl: 'https://signed.test/variation.png' },
          }),
        })),
      },
      from: vi.fn((table: string) => {
        if (table === 'media_assets') {
          return {
            insert: vi.fn((payload: Record<string, unknown>) => {
              mediaAssets.push(payload)
              return {
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { id: 'asset-1' }, error: null }),
                }),
              }
            }),
          }
        }
        return chain({ data: null, error: null })
      }),
    }
    const service = new AdVariationGeneratorService()

    try {
      const result = await (service as any).generateSingleVariation(
        supabase,
        'user-1',
        'https://example.com/base.png',
        'color_mood_shift',
        'Make it cooler',
        'campaign-1',
      )

      expect(result).toEqual({
        id: 'asset-1',
        imageUrl: 'https://signed.test/variation.png',
        strategy: 'color_mood_shift',
        assetId: 'asset-1',
      })
      expect(uploads[0]?.path).toMatch(/^user-1\/images\/.+\.png$/)
      expect(uploads[0]?.options).toMatchObject({ contentType: 'image/png', upsert: false })
      expect(mediaAssets[0]).toMatchObject({
        user_id: 'user-1',
        campaign_id: 'campaign-1',
        name: 'Variation - color_mood_shift',
        bucket_name: 'media',
        mime_type: 'image/png',
        asset_type: 'image',
        source: 'generated',
        source_prompt: 'Make it cooler',
        public_url: 'https://signed.test/variation.png',
        tags: ['ai-generated', 'ad-variation', 'color_mood_shift'],
      })
    } finally {
      if (previousGeminiKey === undefined) {
        delete process.env.GEMINI_API_KEY
      } else {
        process.env.GEMINI_API_KEY = previousGeminiKey
      }
      vi.unstubAllGlobals()
    }
  })
})
