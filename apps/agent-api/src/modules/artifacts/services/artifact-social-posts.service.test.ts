import { describe, expect, it, vi } from 'vitest'
import { ArtifactSocialPostsService } from './artifact-social-posts.service'

function query(result: Record<string, unknown>) {
  const chain: any = {
    eq: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    is: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => result),
    not: vi.fn(() => chain),
    order: vi.fn(() => chain),
    select: vi.fn(() => chain),
    single: vi.fn(async () => result),
    update: vi.fn(() => chain),
    upsert: vi.fn(() => chain),
    then(
      onFulfilled: (value: Record<string, unknown>) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) {
      return Promise.resolve(result).then(onFulfilled, onRejected)
    },
  }
  return chain
}

describe('ArtifactSocialPostsService', () => {
  it('creates a scheduled social post and schedule row with space scope', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true })))
    let insertedPost: Record<string, unknown> | null = null
    let scheduleRow: Record<string, unknown> | null = null
    let spaceSchema: Record<string, unknown> | null = null
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'social_posts') {
          const chain = query({ data: null, error: null })
          chain.insert = vi.fn((payload: Record<string, unknown>) => {
            insertedPost = payload
            return chain
          })
          chain.single = vi.fn(async () => ({
            data: {
              id: 'post-1',
              caption: insertedPost?.caption,
              headline: insertedPost?.headline,
              image_url: insertedPost?.image_url,
              status: insertedPost?.status ?? 'draft',
            },
            error: null,
          }))
          return chain
        }
        if (table === 'social_post_schedules') {
          const chain = query({ data: null, error: null })
          chain.upsert = vi.fn((payload: Record<string, unknown>) => {
            scheduleRow = payload
            return chain
          })
          return chain
        }
        if (table === 'spaces') {
          const chain = query({ data: { id: 'space-1', schema: { views: [] } }, error: null })
          chain.update = vi.fn((payload: Record<string, unknown>) => {
            spaceSchema = payload
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
      logger: { error: vi.fn(), warn: vi.fn() },
      resolveCampaignId: vi.fn(async () => 'campaign-1'),
      resolveOrgId: vi.fn(() => 'org-1'),
      resolveUserId: vi.fn(() => 'user-1'),
    }
    const handlers = new ArtifactSocialPostsService().getHandlers(target)

    const result = (await handlers.create_social_post(
      {
        caption: 'Launch caption',
        image_url: 'https://example.com/post.png',
        platform: 'linkedin',
        post_type: 'single_image',
        scheduled_at: '2030-01-01T10:00:00.000Z',
        space_id: 'space-1',
      },
      'session',
    )) as any

    expect(result.id).toBe('post-1')
    expect(insertedPost).toMatchObject({
      campaign_id: 'campaign-1',
      org_id: 'org-1',
      platform: 'linkedin',
      post_type: 'single_image',
      space_id: 'space-1',
      status: 'scheduled',
      user_id: 'user-1',
    })
    expect(scheduleRow).toMatchObject({
      campaign_id: 'campaign-1',
      org_id: 'org-1',
      social_post_id: 'post-1',
      status: 'scheduled',
    })
    expect(spaceSchema?.schema).toMatchObject({
      views: [expect.objectContaining({ type: 'social_posts' })],
    })
  })

  it('patches one carousel slide with a unique TSX replacement', async () => {
    let updatedPost: Record<string, unknown> | null = null
    const supabase = {
      from: vi.fn(() => {
        const chain = query({
          data: {
            carousel_slides: [
              {
                tsx: 'function Slide(){ return <Text>Old</Text> }',
              },
            ],
          },
          error: null,
        })
        chain.update = vi.fn((payload: Record<string, unknown>) => {
          updatedPost = payload
          return chain
        })
        chain.maybeSingle = vi.fn(async () => ({
          data: updatedPost ? { id: 'post-1', ...updatedPost } : chain.__result?.data,
          error: null,
        }))
        chain.__result = {
          data: {
            carousel_slides: [{ tsx: 'function Slide(){ return <Text>Old</Text> }' }],
          },
        }
        return chain
      }),
    }
    const target = {
      getUserClient: vi.fn(async () => supabase),
      logger: { error: vi.fn() },
      resolveOrgId: vi.fn(() => null),
      resolveUserId: vi.fn(() => 'user-1'),
    }
    const handlers = new ArtifactSocialPostsService().getHandlers(target)

    const result = (await handlers.update_social_post(
      {
        carousel_slide_patch: {
          find: 'Old',
          index: 0,
          replace: 'New',
        },
        social_post_id: 'post-1',
      },
      'session',
    )) as any

    expect(result.carousel_slides[0].tsx).toContain('New')
    expect(updatedPost?.carousel_slides).toEqual([
      { tsx: 'function Slide(){ return <Text>New</Text> }' },
    ])
  })

  it('publishes a LinkedIn text post and marks it published', async () => {
    let updatedStatus: Record<string, unknown> | null = null
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'social_posts') {
          const chain = query({
            data: {
              id: 'post-1',
              caption: 'Hello LinkedIn',
              hashtags: [],
              platform: 'linkedin',
              post_type: 'text_only',
            },
            error: null,
          })
          chain.update = vi.fn((payload: Record<string, unknown>) => {
            updatedStatus = payload
            return chain
          })
          return chain
        }
        if (table === 'user_integrations') {
          return query({
            data: [
              {
                is_default: false,
                metadata: { linkedin_author_urn: 'urn:li:person:123' },
                scope_mode: 'personal',
                user_id: 'user-1',
              },
            ],
            error: null,
          })
        }
        return query({ data: null, error: null })
      }),
    }
    const useIntegration = vi.fn(async () => ({ success: true, result: { id: 'published-1' } }))
    const target = {
      actionRegistry: { use_integration: useIntegration },
      getUserClient: vi.fn(async () => supabase),
      resolveOrgId: vi.fn(() => null),
      resolveUserId: vi.fn(() => 'user-1'),
    }
    const handlers = new ArtifactSocialPostsService().getHandlers(target)

    const result = await handlers.publish_social_post({ social_post_id: 'post-1' }, 'session')

    expect(result).toEqual({ success: true, result: { id: 'published-1' } })
    expect(useIntegration).toHaveBeenCalledWith(
      {
        integration_action: 'LINKEDIN_CREATE_LINKED_IN_POST',
        params: {
          author: 'urn:li:person:123',
          commentary: 'Hello LinkedIn',
        },
        service: 'linkedin',
      },
      'session',
    )
    expect(updatedStatus).toMatchObject({
      published_id: 'published-1',
      status: 'published',
    })
  })
})
