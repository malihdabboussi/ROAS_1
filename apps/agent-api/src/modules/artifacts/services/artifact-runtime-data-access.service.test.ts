import { describe, expect, it, vi } from 'vitest'
import { ArtifactChannelMembersService } from './artifact-channel-members.service'
import { ArtifactFunnelHistoryService } from './artifact-funnel-history.service'
import { ArtifactLegacyMediaJobsService } from './artifact-legacy-media-jobs.service'
import { ArtifactLegacyMediaStatusService } from './artifact-legacy-media-status.service'
import { ArtifactLegacyMediaUploadService } from './artifact-legacy-media-upload.service'

describe('artifact runtime data access services', () => {
  it('tracks media generation jobs and provider usage events', async () => {
    const inserted: unknown[] = []
    const updated: unknown[] = []
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'ai_usage_events') {
          const chain: any = {
            select: vi.fn(() => chain),
            eq: vi.fn(() => chain),
            contains: vi.fn(() => chain),
            limit: vi.fn(async () => ({ data: [{ id: 'usage-1' }], error: null })),
          }
          return chain
        }
        if (table === 'media_generation_jobs') {
          const chain: any = {
            insert: vi.fn((payload) => {
              inserted.push(payload)
              return chain
            }),
            update: vi.fn((payload) => {
              updated.push(payload)
              return chain
            }),
            select: vi.fn(() => chain),
            single: vi.fn(async () => ({ data: { id: 'job-1' }, error: null })),
            eq: vi.fn(async () => ({ error: null })),
          }
          return chain
        }
        return {}
      }),
    }
    const service = new ArtifactLegacyMediaJobsService()

    await expect(
      service.hasProviderUsageEvent(supabase as any, 'user-1', 'replicate', 'job-ext-1'),
    ).resolves.toBe(true)
    await expect(
      service.createMediaJob(supabase as any, {
        user_id: 'user-1',
        campaign_id: 'campaign-1',
        asset_type: 'image',
        provider: 'replicate',
        provider_job_id: 'job-ext-1',
        status: 'starting',
        prompt: 'Generate image',
        model: 'model-1',
      }),
    ).resolves.toEqual({ id: 'job-1' })
    await service.updateMediaJob(supabase as any, 'job-1', {
      status: 'succeeded',
      result_url: 'https://example.com/image.png',
    })

    expect(inserted[0]).toMatchObject({
      user_id: 'user-1',
      provider_job_id: 'job-ext-1',
      status: 'starting',
    })
    expect(updated[0]).toMatchObject({
      status: 'succeeded',
      result_url: 'https://example.com/image.png',
    })
  })

  it('saves and reads channel member notes from conversation context', async () => {
    const updateMock = vi.fn()
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'channel_members') {
          const chain: any = {
            select: vi.fn(() => chain),
            eq: vi.fn(() => chain),
            maybeSingle: vi.fn(async () => ({
              data: {
                id: 'member-1',
                display_name: 'Alex',
                username: 'alex',
                title: 'Founder',
                timezone: 'UTC',
                notes: [{ content: 'Existing note' }],
              },
              error: null,
            })),
            update: vi.fn((payload) => {
              updateMock(payload)
              return chain
            }),
          }
          return chain
        }
        return {}
      }),
    }
    const target = {
      parseConversationId: vi.fn(() => 'conv-1'),
      requestContext: {
        get: vi.fn(() => ({
          channel: 'slack',
          channelMember: { platform_id: 'slack-user-1' },
        })),
      },
      resolveUserId: vi.fn(() => 'user-1'),
      resolveOrgId: vi.fn(() => 'org-1'),
      serviceClient: supabase,
    }
    const handlers = new ArtifactChannelMembersService().getHandlers(target)

    await expect(handlers.save_member_note({ note: ' Important buyer ' }, 'session')).resolves.toEqual({
      success: true,
      notes_count: 2,
    })
    expect(updateMock).toHaveBeenCalledWith({
      notes: [
        { content: 'Existing note' },
        expect.objectContaining({ content: 'Important buyer' }),
      ],
    })
    await expect(handlers.get_member_notes({}, 'session')).resolves.toMatchObject({
      success: true,
      profile: { display_name: 'Alex', username: 'alex' },
      notes: [{ content: 'Existing note' }],
    })
  })

  it('records funnel file change sets and items', async () => {
    const insertedChangeSets: unknown[] = []
    const insertedItems: unknown[] = []
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'funnel_files') {
          const chain: any = {
            select: vi.fn(() => chain),
            eq: vi.fn(() => chain),
            is: vi.fn(() => chain),
            maybeSingle: vi.fn(async () => ({
              data: { id: 'file-1', funnel_id: 'funnel-1', path: 'index.html', content: 'old' },
              error: null,
            })),
          }
          return chain
        }
        if (table === 'funnel_change_sets') {
          const chain: any = {
            update: vi.fn(() => chain),
            insert: vi.fn((payload) => {
              insertedChangeSets.push(payload)
              return chain
            }),
            eq: vi.fn(() => chain),
            is: vi.fn(async () => ({ error: null })),
            or: vi.fn(async () => ({ error: null })),
            select: vi.fn(() => chain),
            single: vi.fn(async () => ({ data: { id: 'change-1' }, error: null })),
          }
          return chain
        }
        if (table === 'funnel_change_items') {
          return {
            insert: vi.fn(async (payload) => {
              insertedItems.push(payload)
              return { error: null }
            }),
          }
        }
        return {}
      }),
    }
    const service = new ArtifactFunnelHistoryService()

    await expect(
      service.readFileSnapshot(supabase as any, {
        funnelId: 'funnel-1',
        funnelPageId: null,
        path: 'index.html',
      }),
    ).resolves.toMatchObject({ id: 'file-1', content: 'old' })

    await expect(
      service.recordChangeSet(supabase as any, {
        funnel: { id: 'funnel-1', user_id: 'user-1', org_id: 'org-1' },
        funnelPageId: null,
        action: 'update_file',
        items: [
          {
            entity_type: 'funnel_file',
            entity_id: 'file-1',
            path: 'index.html',
            operation: 'update',
            before_snapshot: { id: 'file-1', content: 'old' },
            after_snapshot: { id: 'file-1', content: 'new' },
          },
        ],
      }),
    ).resolves.toEqual({ id: 'change-1' })
    expect(insertedChangeSets[0]).toMatchObject({
      funnel_id: 'funnel-1',
      action: 'update_file',
      status: 'applied',
    })
    expect(insertedItems[0]).toEqual([
      expect.objectContaining({
        change_set_id: 'change-1',
        path: 'index.html',
        operation: 'update',
      }),
    ])
  })

  it('uploads generated media bytes and persists the media asset row', async () => {
    const insertedAssets: Array<Record<string, unknown>> = []
    const uploadedObjects: Array<Record<string, unknown>> = []
    const storageBucket = {
      upload: vi.fn(async (filePath: string, buffer: Buffer, options: Record<string, unknown>) => {
        uploadedObjects.push({ filePath, size: buffer.length, ...options })
        return { error: null }
      }),
      createSignedUrl: vi.fn(async (filePath: string) => ({
        data: { signedUrl: `https://signed.example/${filePath}` },
        error: null,
      })),
    }
    const serviceClient = {
      storage: {
        from: vi.fn(() => storageBucket),
      },
      from: vi.fn((table: string) => {
        if (table === 'media_assets') {
          const chain: any = {
            insert: vi.fn((payload: Record<string, unknown>) => {
              insertedAssets.push(payload)
              return chain
            }),
            select: vi.fn(() => chain),
            single: vi.fn(async () => ({
              data: { id: 'asset-1', ...insertedAssets[0] },
              error: null,
            })),
          }
          return chain
        }
        return {}
      }),
    }
    const target = {
      logger: { error: vi.fn() },
      serviceClient,
    }
    const service = new ArtifactLegacyMediaUploadService()

    const result = await service.uploadMediaFromBytes(
      target,
      Buffer.from('image-bytes'),
      'image/png',
      'image',
      'user-1',
      'campaign-1',
      'Render launch asset',
      'gemini-image',
      'org-1',
      'space-1',
    )

    expect(result).toMatchObject({
      asset_ref: {
        kind: 'vibey_asset',
        asset_id: 'asset-1',
        bucket_name: 'media',
        file_path: expect.stringMatching(/^user-1\/images\//),
        url: expect.stringContaining('https://signed.example/user-1/images/'),
        mime_type: 'image/png',
        asset_type: 'image',
        name: 'Render launch asset',
        original_filename: expect.stringMatching(/\.png$/),
        file_size: Buffer.from('image-bytes').length,
        campaign_id: 'campaign-1',
        space_id: 'space-1',
        org_id: 'org-1',
        source: 'generated',
        source_surface: 'agent_generated_media',
      },
      success: true,
      url: expect.stringContaining('https://signed.example/user-1/images/'),
      asset: expect.objectContaining({ id: 'asset-1' }),
    })
    expect(uploadedObjects[0]).toMatchObject({
      contentType: 'image/png',
      size: Buffer.from('image-bytes').length,
      upsert: false,
    })
    expect(insertedAssets[0]).toMatchObject({
      asset_type: 'image',
      bucket_name: 'media',
      campaign_id: 'campaign-1',
      category: 'generated',
      mime_type: 'image/png',
      org_id: 'org-1',
      space_id: 'space-1',
      user_id: 'user-1',
    })
  })

  it('returns succeeded video job status and reuses the mission deliverable update id', async () => {
    const persistedDeliverables: Array<Record<string, unknown>> = []
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'media_generation_jobs') {
          const chain: any = {
            select: vi.fn(() => chain),
            eq: vi.fn(() => chain),
            maybeSingle: vi.fn(async () => ({
              data: {
                id: 'job-1',
                campaign_id: 'campaign-1',
                duration_seconds: 8,
                media_asset_id: 'asset-1',
                model: 'video-model',
                prompt: 'Video prompt',
                provider: 'replicate',
                provider_job_id: 'provider-job-1',
                result_url: 'https://cdn.example/video.mp4',
                status: 'succeeded',
                user_id: 'user-1',
              },
              error: null,
            })),
          }
          return chain
        }
        return {}
      }),
    }
    const serviceClient = {
      from: vi.fn((table: string) => {
        if (table === 'mission_deliverables') {
          const chain: any = {
            select: vi.fn(() => chain),
            eq: vi.fn(() => chain),
            contains: vi.fn(() => chain),
            order: vi.fn(() => chain),
            limit: vi.fn(() => chain),
            maybeSingle: vi.fn(async () => ({ data: { id: 'deliverable-1' }, error: null })),
          }
          return chain
        }
        return {}
      }),
    }
    const target = {
      getUserClient: vi.fn(async () => supabase),
      isMissionSessionKey: vi.fn(() => true),
      parseAgentIdFromSessionKey: vi.fn(() => 'designer'),
      parseConversationId: vi.fn(() => null),
      persistMissionDeliverable: vi.fn(async (payload: Record<string, unknown>) => {
        persistedDeliverables.push(payload)
        return { success: true }
      }),
      requestContext: { get: vi.fn() },
      resolveMissionContext: vi.fn(async () => ({
        campaignId: 'mission-campaign',
        missionId: 'mission-1',
      })),
      resolveUserId: vi.fn(() => 'user-1'),
      serviceClient,
    }
    const service = new ArtifactLegacyMediaStatusService()

    await expect(
      service.getVideoStatus(target, { job_id: 'job-1' }, 'mission-session'),
    ).resolves.toMatchObject({
      job_id: 'job-1',
      status: 'succeeded',
      success: true,
      url: 'https://cdn.example/video.mp4',
    })
    expect(persistedDeliverables[0]).toMatchObject({
      agentKey: 'designer',
      campaignId: 'campaign-1',
      fileUrl: 'https://cdn.example/video.mp4',
      missionId: 'mission-1',
      updateId: 'deliverable-1',
      userId: 'user-1',
    })
  })
})
