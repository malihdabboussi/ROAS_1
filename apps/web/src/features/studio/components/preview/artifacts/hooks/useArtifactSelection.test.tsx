import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ArtifactsState, TreeNode } from '../tree/types'
import { useArtifactSelection } from './useArtifactSelection'

const mocks = vi.hoisted(() => ({
  channel: vi.fn(),
  channelOn: vi.fn(),
  channelSubscribe: vi.fn(),
  removeChannel: vi.fn(),
  fetchFunnelPage: vi.fn(),
  fetchFunnelPageBundle: vi.fn(),
  fetchPresentation: vi.fn(),
}))

function setupRealtimeMock() {
  const channel = {
    on: mocks.channelOn,
    subscribe: mocks.channelSubscribe,
  }
  mocks.channel.mockReturnValue(channel)
  mocks.channelOn.mockReturnValue(channel)
  mocks.channelSubscribe.mockReturnValue(channel)
}

vi.mock('@supabase/ssr', () => ({
  createBrowserClient: () => ({
    channel: mocks.channel,
    removeChannel: mocks.removeChannel,
  }),
}))

vi.mock('@/lib/artifacts', () => ({
  fetchFunnelPage: mocks.fetchFunnelPage,
  fetchFunnelPageBundle: mocks.fetchFunnelPageBundle,
  fetchPresentation: mocks.fetchPresentation,
}))

function makeArtifacts(): ArtifactsState {
  return {
    funnels: [
      {
        id: 'funnel-1',
        name: 'Launch funnel',
        status: 'draft',
        slug: 'launch-funnel',
        published_url: null,
        funnel_type: 'custom',
        campaign_id: 'campaign-1',
        theme_id: 'funnel-theme',
        hide_branding: false,
        metadata: { source: 'test' },
        layout: null,
        created_at: '2026-06-25T00:00:00.000Z',
        updated_at: '2026-06-25T00:00:00.000Z',
        pages: [
          {
            id: 'page-second',
            funnel_id: 'funnel-1',
            page_type: 'content',
            name: 'Second',
            sort_order: 2,
            status: 'draft',
            source_mode: 'generated_html',
            generated_html: '<section>Second</section>',
            generated_css: '.second{}',
            created_at: '2026-06-25T00:00:00.000Z',
            updated_at: '2026-06-25T00:00:00.000Z',
          },
          {
            id: 'page-first',
            funnel_id: 'funnel-1',
            page_type: 'content',
            name: 'First',
            sort_order: 1,
            status: 'draft',
            source_mode: 'generated_html',
            generated_html: '<section>First</section>',
            generated_css: '.first{}',
            preview_contract: {
              normalization_applied: [],
              recovery_applied: [],
              used_fallback: false,
            },
            created_at: '2026-06-25T00:00:00.000Z',
            updated_at: '2026-06-25T00:00:00.000Z',
          },
        ],
      },
      {
        id: 'website-1',
        name: 'Website',
        status: 'draft',
        slug: 'website',
        published_url: null,
        funnel_type: 'website',
        campaign_id: 'campaign-1',
        theme_id: null,
        hide_branding: false,
        metadata: null,
        layout: null,
        created_at: '2026-06-25T00:00:00.000Z',
        updated_at: '2026-06-25T00:00:00.000Z',
        pages: [],
      },
    ],
    offers: [],
    ads: [],
    sequences: [],
    presentations: [],
    avatars: [],
    adCampaigns: [],
    socialPosts: [],
    blogPosts: [
      {
        id: 'blog-old',
        user_id: 'user-1',
        funnel_id: 'website-1',
        campaign_id: 'campaign-1',
        title: 'Old post',
        slug: 'old-post',
        content: null,
        excerpt: null,
        cover_image: null,
        author: null,
        tags: [],
        seo: {},
        status: 'draft',
        published_at: null,
        metadata: {},
        created_at: '2026-06-25T00:01:00.000Z',
        updated_at: '2026-06-25T00:01:00.000Z',
      },
      {
        id: 'blog-new',
        user_id: 'user-1',
        funnel_id: 'website-1',
        campaign_id: 'campaign-1',
        title: 'New post',
        slug: 'new-post',
        content: null,
        excerpt: null,
        cover_image: null,
        author: null,
        tags: [],
        seo: {},
        status: 'draft',
        published_at: null,
        metadata: {},
        created_at: '2026-06-25T00:02:00.000Z',
        updated_at: '2026-06-25T00:03:00.000Z',
      },
    ],
  }
}

function makeSetArtifacts(artifactsRef: React.MutableRefObject<ArtifactsState>) {
  return vi.fn((next: React.SetStateAction<ArtifactsState>) => {
    artifactsRef.current = typeof next === 'function' ? next(artifactsRef.current) : next
  }) as React.Dispatch<React.SetStateAction<ArtifactsState>>
}

function expectNoRenderLoop(consoleErrorSpy: ReturnType<typeof vi.spyOn>) {
  const messages = consoleErrorSpy.mock.calls.map((args) => args.join(' '))
  expect(messages.join('\n')).not.toMatch(/Maximum update depth|Too many re-renders/i)
}

describe('useArtifactSelection', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    setupRealtimeMock()
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.fetchFunnelPage.mockResolvedValue({
      id: 'page-first',
      funnel_id: 'funnel-1',
      page_type: 'content',
      name: 'First',
      status: 'draft',
      source_mode: 'generated_html',
      generated_html: '<section>First loaded</section>',
      generated_css: '.first-loaded{}',
      preview_contract: {
        normalization_applied: [],
        recovery_applied: [],
        used_fallback: false,
      },
      created_at: '2026-06-25T00:00:00.000Z',
      updated_at: '2026-06-25T00:00:00.000Z',
    })
    mocks.fetchFunnelPageBundle.mockResolvedValue({
      page: { id: 'page-first', name: 'First' },
      files: [],
    })
  })

  afterEach(() => {
    cleanup()
    consoleErrorSpy.mockRestore()
  })

  it('selects a funnel, loads its first page, registers realtime cleanup, and selects latest blog posts without render churn', async () => {
    const artifactsRef = { current: makeArtifacts() }
    const setArtifacts = makeSetArtifacts(artifactsRef)
    let renderCount = 0

    const { result, unmount } = renderHook(() => {
      renderCount += 1
      return useArtifactSelection({
        artifactsRef,
        setArtifacts,
        activeThemeId: 'theme-1',
      })
    })

    const funnelNode: TreeNode = {
      id: 'funnel-funnel-1',
      label: 'Launch funnel',
      type: 'funnel',
      resourceId: 'funnel-1',
      icon: null,
    }

    await act(async () => {
      await result.current.handleSelect(funnelNode)
    })

    await waitFor(() => {
      expect(result.current.selectedFunnel?.id).toBe('funnel-1')
      expect(result.current.selectedFunnel?.themeId).toBe('theme-1')
      expect(result.current.selectedResource).toMatchObject({
        type: 'funnel',
        id: 'funnel-1',
        name: 'Launch funnel',
      })
      expect(result.current.currentPageId).toBe('page-first')
      expect(result.current.pageContent?.code).toBe('<section>First loaded</section>')
    })

    expect(mocks.fetchFunnelPage).toHaveBeenCalledWith('funnel-1', 'page-first')
    expect(mocks.channel).toHaveBeenCalledWith('funnel-page-preview:page-first')

    act(() => {
      result.current.selectBlogPostById('blog-new')
    })

    expect(result.current.selectedId).toBe('website-blog-website-1')
    expect(result.current.selectedResource).toMatchObject({
      type: 'blog-post',
      id: 'blog-new',
      funnelId: 'website-1',
      name: 'New post',
    })
    expect(mocks.removeChannel).toHaveBeenCalledTimes(1)

    expect(renderCount).toBeLessThan(25)
    expectNoRenderLoop(consoleErrorSpy)

    unmount()
    expect(mocks.removeChannel).toHaveBeenCalledTimes(2)
  })
})
