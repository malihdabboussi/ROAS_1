import { cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useArtifactsData } from './useArtifactsData'

const mocks = vi.hoisted(() => ({
  channel: vi.fn(),
  channelOn: vi.fn(),
  channelSubscribe: vi.fn(),
  removeChannel: vi.fn(),
  fetchBlogPosts: vi.fn(),
  fetchCampaign: vi.fn(),
  fetchCampaignAdCampaigns: vi.fn(),
  fetchCampaignAds: vi.fn(),
  fetchCampaignAvatars: vi.fn(),
  fetchCampaignFunnels: vi.fn(),
  fetchCampaignOffers: vi.fn(),
  fetchCampaignPresentations: vi.fn(),
  fetchCampaignSequences: vi.fn(),
  fetchCampaignSocialPosts: vi.fn(),
  fetchCampaigns: vi.fn(),
  getTheme: vi.fn(),
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

vi.mock('@/features/studio/services/artifact-preview.service', () => ({
  fetchBlogPosts: mocks.fetchBlogPosts,
  fetchCampaignAdCampaigns: mocks.fetchCampaignAdCampaigns,
  fetchCampaignAds: mocks.fetchCampaignAds,
  fetchCampaignAvatars: mocks.fetchCampaignAvatars,
  fetchCampaignFunnels: mocks.fetchCampaignFunnels,
  fetchCampaignOffers: mocks.fetchCampaignOffers,
  fetchCampaignPresentations: mocks.fetchCampaignPresentations,
  fetchCampaignSequences: mocks.fetchCampaignSequences,
  fetchCampaignSocialPosts: mocks.fetchCampaignSocialPosts,
}))

vi.mock('@/lib/campaigns', () => ({
  fetchCampaign: mocks.fetchCampaign,
  fetchCampaigns: mocks.fetchCampaigns,
}))

vi.mock('@/lib/themes', () => ({
  getTheme: mocks.getTheme,
}))

function makeTheme() {
  return {
    id: 'theme-1',
    slug: 'theme-1',
    name: 'Launch Theme',
    colors: {
      primary: '#10b981',
      primaryForeground: '#ffffff',
      secondaryAccent1: '',
      secondaryAccent2: '#7c3aed',
      heading: '#111827',
      body: '#4b5563',
      pageBackground: '#f9fafb',
      cardBackground: '#ffffff',
      border: '#e5e7eb',
      input: '#f3f4f6',
      primaryLight: '',
      primaryDark: '',
      success: '#22c55e',
      warning: '#f59e0b',
      danger: '#ef4444',
    },
    logo_asset_id: null,
    headshot_images: [],
    product_images: [],
    font_heading: 'Inter',
    font_body: null,
    brand_voice: null,
    brand_values: null,
    social_links: null,
    design_settings: null,
    image_style_prompt: null,
    preview_image_url: null,
    is_system: false,
    status: 'complete',
    user_id: 'user-1',
    created_at: '2026-06-25T00:00:00.000Z',
    updated_at: '2026-06-25T00:00:00.000Z',
  }
}

function expectNoRenderLoop(consoleErrorSpy: ReturnType<typeof vi.spyOn>) {
  const messages = consoleErrorSpy.mock.calls.map((args) => args.join(' '))
  expect(messages.join('\n')).not.toMatch(/Maximum update depth|Too many re-renders/i)
}

describe('useArtifactsData', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    setupRealtimeMock()
    sessionStorage.clear()
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    mocks.fetchCampaigns.mockResolvedValue([
      { id: 'campaign-1', name: 'Launch Campaign', config: { icon: 'rocket' } },
      { id: 'campaign-2', name: null, config: null },
    ])
    mocks.fetchCampaign.mockResolvedValue({
      id: 'campaign-1',
      config: { agent_settings: { theme_id: 'theme-1' } },
    })
    mocks.getTheme.mockResolvedValue(makeTheme())
    mocks.fetchCampaignFunnels.mockResolvedValue([
      {
        id: 'funnel-classic',
        name: 'Classic funnel',
        funnel_type: 'custom',
        created_at: '2026-06-25T00:01:00.000Z',
      },
      {
        id: 'funnel-website',
        name: 'Website',
        funnel_type: 'website',
        created_at: '2026-06-25T00:02:00.000Z',
      },
    ])
    mocks.fetchCampaignOffers.mockResolvedValue([
      {
        id: 'offer-1',
        name: 'Launch offer',
        created_at: '2026-06-25T00:03:00.000Z',
      },
    ])
    mocks.fetchCampaignAds.mockResolvedValue([
      {
        id: 'ad-1',
        headline: 'Launch ad',
        ad_set_id: null,
        placement: 'feed',
        source: 'vibey',
        meta_effective_status: null,
        created_at: '2026-06-25T00:04:00.000Z',
      },
    ])
    mocks.fetchCampaignSequences.mockResolvedValue([
      {
        id: 'sequence-1',
        name: 'Launch sequence',
        sequence_emails: [],
        created_at: '2026-06-25T00:05:00.000Z',
      },
    ])
    mocks.fetchCampaignPresentations.mockResolvedValue([
      {
        id: 'presentation-1',
        name: 'Launch deck',
        created_at: '2026-06-25T00:06:00.000Z',
      },
    ])
    mocks.fetchCampaignAvatars.mockResolvedValue([
      {
        id: 'avatar-1',
        name: 'Launch avatar',
        created_at: '2026-06-25T00:07:00.000Z',
      },
    ])
    mocks.fetchCampaignAdCampaigns.mockResolvedValue([
      {
        id: 'adcamp-1',
        name: 'Meta campaign',
        source: 'meta',
        meta_effective_status: 'ACTIVE',
        created_at: '2026-06-25T00:08:00.000Z',
        ad_sets: [
          {
            id: 'adset-1',
            name: 'Meta ad set',
            source: 'meta',
            meta_effective_status: 'ACTIVE',
            meta_adset_id: 'meta-adset-1',
            ads: [],
          },
        ],
      },
    ])
    mocks.fetchCampaignSocialPosts.mockResolvedValue([
      {
        id: 'social-1',
        platform: 'linkedin',
        headline: 'Newest social',
        caption: '',
        created_at: '2026-06-25T00:10:00.000Z',
      },
    ])
    mocks.fetchBlogPosts.mockResolvedValue([
      {
        id: 'blog-1',
        funnel_id: 'funnel-website',
        title: 'Launch blog',
        slug: 'launch-blog',
        created_at: '2026-06-25T00:09:00.000Z',
      },
    ])
  })

  afterEach(() => {
    cleanup()
    consoleErrorSpy.mockRestore()
  })

  it('loads artifacts, campaign options, theme CSS, and realtime without render churn', async () => {
    let renderCount = 0
    const { result, unmount } = renderHook(() => {
      renderCount += 1
      return useArtifactsData({ campaignId: 'campaign-1' })
    })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(result.current.campaignOptions).toEqual([
        { id: 'campaign-1', name: 'Launch Campaign', icon: 'rocket' },
        { id: 'campaign-2', name: 'Untitled', icon: 'folder-kanban' },
      ])
      expect(result.current.themePreviewCss).toContain('  --color-primary: #10b981;')
      expect(result.current.treeData.map((node) => node.id)).toEqual(
        expect.arrayContaining(['offers', 'funnels', 'websites', 'ads', 'social-content']),
      )
    })

    expect(result.current.artifacts.blogPosts).toHaveLength(1)
    expect(result.current.expandedIds.has('funnel-funnel-website')).toBe(true)
    expect(result.current.expandedIds.has('adset-adset-1')).toBe(true)
    expect(result.current.findNewestArtifactNode(result.current.artifacts)).toMatchObject({
      id: 'social-post-social-1',
      label: 'Newest social',
      type: 'social-post',
      resourceId: 'social-1',
    })

    expect(mocks.fetchBlogPosts).toHaveBeenCalledWith('funnel-website')
    expect(mocks.channel).toHaveBeenCalledWith('artifacts:campaign-1')
    expect(renderCount).toBeLessThan(25)
    expectNoRenderLoop(consoleErrorSpy)

    unmount()
    expect(mocks.removeChannel).toHaveBeenCalledTimes(1)
  })
})
