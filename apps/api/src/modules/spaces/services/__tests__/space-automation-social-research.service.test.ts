import { beforeEach, describe, expect, it, vi } from 'vitest'
import { findFirstAutomationContextIssue } from '../automation-context-validation'
import { assertAutomationValidWhenEnabled } from '../space-automation-publishable'
import { SpaceAutomationService } from '../space-automation.service'
import { automationsRepoFromRepo } from './space-automation-test-utils'

describe('SpaceAutomationService social research', () => {
  const socialResearch = {
    syncSocialResearch: vi.fn().mockResolvedValue({
      synced_count: 1,
      created_count: 0,
      updated_count: 0,
      platforms: ['instagram'],
      handles: ['creator'],
    }),
    selectSocialOutliers: vi.fn().mockResolvedValue({
      outlier_count: 2,
      selected_item_ids: ['a', 'b'],
      outliers: [],
      digest: 'digest text',
    }),
    enrichSocialResearchItems: vi.fn().mockResolvedValue({
      enriched_count: 2,
      enriched_item_ids: ['a', 'b'],
      outliers: [],
      digest: 'enriched digest',
    }),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  function serviceWithRepo(
    repo: Record<string, unknown>,
    userAgentApi?: Record<string, unknown>,
    scrapeCreatorsApi?: Record<string, unknown>,
    brainImportJobs?: Record<string, unknown>,
  ) {
    const creditsService = {
      assertHasAvailableCredits: vi.fn().mockResolvedValue({ totalAvailable: 100 }),
      processDirectTextUsage: vi.fn().mockResolvedValue({}),
    }
    return new SpaceAutomationService(
      repo as never,
      automationsRepoFromRepo(repo) as never,
      { get: vi.fn() } as never,
      {} as never,
      undefined,
      undefined,
      creditsService as never,
      userAgentApi as never,
      socialResearch as never,
      undefined,
      undefined,
      scrapeCreatorsApi as never,
      brainImportJobs as never,
    )
  }

  it('publish validation requires social_research context for select after schedule', () => {
    const issue = findFirstAutomationContextIssue({ type: 'schedule' }, [
      { type: 'select_social_outliers' },
    ])
    expect(issue).not.toBeNull()
    expect(issue?.missing).toContain('social_research')
  })

  it('publish validation allows scheduled YouTube channel brain ingestion', () => {
    expect(() =>
      assertAutomationValidWhenEnabled({
        is_draft: false,
        name: 'YouTube brain intake',
        trigger: {
          type: 'schedule',
          schedule: { mode: 'preset', preset: 'weekly', weekdays: [1], time: '00:00' },
          timezone: 'Asia/Nicosia',
        },
        actions: [
          {
            type: 'ingest_youtube_channel_to_agent_brain',
            brain_id: '00000000-0000-4000-8000-000000000001',
            channel_urls: ['https://youtube.com/@aidotengineer'],
            since_days: 7,
            include_shorts: false,
          },
        ],
      }),
    ).not.toThrow()
  })

  it('sync_social_research platform all calls orchestration with all platforms', async () => {
    const repo = {
      findSpaceByIdForAccess: vi.fn().mockResolvedValue({ id: 'space-1', title: 'Space' }),
    }
    const service = serviceWithRepo(repo)
    const supabase = {
      from: vi.fn(() => ({
        insert: vi.fn().mockResolvedValue({}),
      })),
    } as never

    await service.executeAutomationItemless(
      {
        id: 'automation-1',
        name: 'All platforms sync',
        enabled: true,
        trigger: { type: 'schedule' },
        actions: [{ type: 'sync_social_research', platform: 'all', sync_mode: 'use_existing' }],
      } as never,
      { type: 'schedule', fired_at: new Date().toISOString() } as never,
      { supabase, userId: 'user-1', orgId: null, spaceId: 'space-1' },
    )

    expect(socialResearch.syncSocialResearch).toHaveBeenCalledWith(
      expect.objectContaining({
        supabase,
        userId: 'user-1',
        orgId: null,
        spaceId: 'space-1',
        platformSelector: 'all',
        mode: 'use_existing',
      }),
    )
  })

  it('schedule flow can run sync then select then enrich then create_task', async () => {
    const createdItem = { id: 'task-1', title: 'Weekly digest' }
    const repo = {
      findSpaceByIdForAccess: vi.fn().mockResolvedValue({ id: 'space-1', title: 'Space' }),
      createItem: vi.fn().mockResolvedValue(createdItem),
      findItemById: vi.fn().mockResolvedValue(createdItem),
      findSubtasksByParentId: vi.fn().mockResolvedValue([]),
      findActivityByItemId: vi.fn().mockResolvedValue([]),
    }
    const service = serviceWithRepo(repo)
    const supabase = {
      from: vi.fn(() => ({
        insert: vi.fn().mockResolvedValue({}),
      })),
    } as never

    await service.executeAutomationItemless(
      {
        id: 'automation-1',
        name: 'Social digest',
        enabled: true,
        trigger: { type: 'schedule' },
        actions: [
          { type: 'sync_social_research', platform: 'both', sync_mode: 'use_existing' },
          { type: 'select_social_outliers', platform: 'both', min_outlier_score: 2, limit: 10 },
          {
            type: 'enrich_social_research_items',
            enrichments: ['caption', 'hook', 'transcript'],
          },
          {
            type: 'create_task',
            title_template: 'Weekly digest',
            notes_template: '{{steps.3.digest}}',
          },
        ],
      } as never,
      { type: 'schedule', fired_at: new Date().toISOString() } as never,
      {
        supabase,
        userId: 'user-1',
        orgId: null,
        spaceId: 'space-1',
      },
    )

    expect(socialResearch.syncSocialResearch).toHaveBeenCalled()
    expect(socialResearch.selectSocialOutliers).toHaveBeenCalled()
    expect(socialResearch.enrichSocialResearchItems).toHaveBeenCalled()
    expect(repo.createItem).toHaveBeenCalled()
    expect(vi.mocked(repo.createItem).mock.calls[0]?.[3]).toMatchObject({
      description: 'enriched digest',
    })
  })

  it('schedule flow queues recent long-form YouTube videos into an agent brain', async () => {
    const repo = {
      findSpaceByIdForAccess: vi.fn().mockResolvedValue({ id: 'space-1', title: 'Space' }),
    }
    const scrapeCreatorsApi = {
      forwardGet: vi.fn().mockResolvedValue({
        status: 200,
        body: {
          videos: [
            {
              id: 'video-1',
              url: 'https://www.youtube.com/watch?v=video-1',
              title: 'AI architecture talk',
              publishedTime: '1 day ago',
              lengthSeconds: 1800,
            },
            {
              id: 'short-1',
              url: 'https://www.youtube.com/shorts/short-1',
              title: 'Short clip',
              publishedTime: '1 day ago',
              lengthSeconds: 30,
            },
            {
              id: 'old-1',
              url: 'https://www.youtube.com/watch?v=old-1',
              title: 'Old talk',
              publishedTime: '20 days ago',
              lengthSeconds: 1800,
            },
          ],
        },
      }),
    }
    const brainImportJobs = {
      enqueueSkLinkIngest: vi.fn().mockResolvedValue({
        jobId: 'job-1',
        status: 'queued',
        deduped: false,
      }),
    }
    const service = serviceWithRepo(repo, undefined, scrapeCreatorsApi, brainImportJobs)
    const supabase = {
      from: vi.fn(() => ({
        insert: vi.fn().mockResolvedValue({}),
      })),
    } as never

    await service.executeAutomationItemless(
      {
        id: 'automation-1',
        name: 'YouTube brain intake',
        enabled: true,
        trigger: { type: 'schedule' },
        actions: [
          {
            type: 'ingest_youtube_channel_to_agent_brain',
            brain_id: '00000000-0000-4000-8000-000000000001',
            channel_urls: ['https://youtube.com/@aidotengineer'],
            since_days: 7,
            include_shorts: false,
          },
        ],
      } as never,
      { type: 'schedule', fired_at: new Date().toISOString() } as never,
      { supabase, userId: 'user-1', orgId: 'org-1', spaceId: 'space-1' },
    )

    expect(scrapeCreatorsApi.forwardGet).toHaveBeenCalledWith('/v1/youtube/channel-videos', {
      handle: 'aidotengineer',
    })
    expect(brainImportJobs.enqueueSkLinkIngest).toHaveBeenCalledTimes(1)
    expect(brainImportJobs.enqueueSkLinkIngest).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        brainId: '00000000-0000-4000-8000-000000000001',
        url: 'https://www.youtube.com/watch?v=video-1',
        sourceType: 'youtube_video',
        title: '@aidotengineer: AI architecture talk',
        domain: 'strategy',
      }),
      'org-1',
    )
  })

  it('schedule flow stops after a failed social research step', async () => {
    socialResearch.enrichSocialResearchItems.mockRejectedValueOnce(
      new Error('No selected social research items found'),
    )
    const repo = {
      findSpaceByIdForAccess: vi.fn().mockResolvedValue({ id: 'space-1', title: 'Space' }),
      createItem: vi.fn(),
      findItemById: vi.fn(),
    }
    const service = serviceWithRepo(repo)
    const supabase = {
      from: vi.fn(() => ({
        insert: vi.fn().mockResolvedValue({}),
      })),
    } as never

    await service.executeAutomationItemless(
      {
        id: 'automation-1',
        name: 'Social digest',
        enabled: true,
        trigger: { type: 'schedule' },
        actions: [
          { type: 'sync_social_research', platform: 'both', sync_mode: 'use_existing' },
          { type: 'select_social_outliers', platform: 'both', min_outlier_score: 2, limit: 10 },
          { type: 'enrich_social_research_items', enrichments: ['caption'] },
          {
            type: 'create_task',
            title_template: 'Weekly digest',
            notes_template: '{{steps.3.digest}}',
          },
        ],
      } as never,
      { type: 'schedule', fired_at: new Date().toISOString() } as never,
      { supabase, userId: 'user-1', orgId: null, spaceId: 'space-1' },
    )

    expect(repo.createItem).not.toHaveBeenCalled()
  })

  it('schedule send_to_agent before create_task fails when no task context', async () => {
    const repo = {
      findSpaceByIdForAccess: vi.fn().mockResolvedValue({ id: 'space-1', title: 'Space' }),
    }
    const service = serviceWithRepo(repo)
    const supabase = {
      from: vi.fn(() => ({
        insert: vi.fn().mockResolvedValue({}),
      })),
    } as never

    await service.executeAutomationItemless(
      {
        id: 'automation-1',
        name: 'Bad order',
        enabled: true,
        trigger: { type: 'schedule' },
        actions: [
          {
            type: 'send_to_agent',
            agent_key: 'vibey',
            prompt_template: 'Do work',
            continuation: 'after_task_completes',
          },
        ],
      } as never,
      { type: 'schedule' } as never,
      { supabase, userId: 'user-1', orgId: null, spaceId: 'space-1' },
    )

    const insertCall = vi.mocked(supabase.from).mock.results[0]?.value?.insert
    const payload = insertCall?.mock?.calls?.[0]?.[0]
    expect(payload?.status).not.toBe('success')
    expect(JSON.stringify(payload?.actions_executed)).toContain('agent step needs a created task')
  })

  it('schedule send_to_agent fails when the agent API is not configured', async () => {
    const createdItem = { id: 'task-1', title: 'Weekly digest' }
    const repo = {
      findSpaceByIdForAccess: vi.fn().mockResolvedValue({ id: 'space-1', title: 'Space' }),
      createItem: vi.fn().mockResolvedValue(createdItem),
      findItemById: vi.fn().mockResolvedValue(createdItem),
      findSubtasksByParentId: vi.fn().mockResolvedValue([]),
      findActivityByItemId: vi.fn().mockResolvedValue([]),
    }
    const service = serviceWithRepo(repo)
    const supabase = {
      from: vi.fn(() => ({
        insert: vi.fn().mockResolvedValue({}),
      })),
    } as never

    await service.executeAutomationItemless(
      {
        id: 'automation-1',
        name: 'Agent config',
        enabled: true,
        trigger: { type: 'schedule' },
        actions: [
          { type: 'create_task', title_template: 'Weekly digest' },
          { type: 'send_to_agent', agent_key: 'vibey', prompt_template: 'Do work' },
        ],
      } as never,
      { type: 'schedule' } as never,
      { supabase, userId: 'user-1', orgId: null, spaceId: 'space-1' },
    )

    const insertCall = vi.mocked(supabase.from).mock.results[0]?.value?.insert
    const payload = insertCall?.mock?.calls?.[0]?.[0]
    expect(payload?.status).toBe('partial')
    expect(JSON.stringify(payload?.actions_executed)).toContain(
      'UserAgentApiService not configured',
    )
  })
})
