import { cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSpaceArtifactPreviewController } from './use-space-artifact-preview-controller'

const mocks = vi.hoisted(() => ({
  channel: vi.fn(),
  channelOn: vi.fn(),
  channelSubscribe: vi.fn(),
  removeChannel: vi.fn(),
  fetchCampaign: vi.fn(),
  fetchFunnelPageBundleCached: vi.fn(),
  fetchFunnelPageCached: vi.fn(),
  fetchFunnelWithPagesCached: vi.fn(),
  fetchPresentationCached: vi.fn(),
  getTheme: vi.fn(),
  invalidateCachedFetch: vi.fn(),
}))

mocks.channel.mockReturnValue({
  on: mocks.channelOn,
  subscribe: mocks.channelSubscribe,
})
mocks.channelOn.mockReturnValue({
  on: mocks.channelOn,
  subscribe: mocks.channelSubscribe,
})
mocks.channelSubscribe.mockReturnValue({
  on: mocks.channelOn,
  subscribe: mocks.channelSubscribe,
})

vi.mock('@supabase/ssr', () => ({
  createBrowserClient: () => ({
    channel: mocks.channel,
    removeChannel: mocks.removeChannel,
  }),
}))

vi.mock('@/lib/artifacts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/artifacts')>()),
  fetchFunnelPageBundleCached: mocks.fetchFunnelPageBundleCached,
  fetchFunnelPageCached: mocks.fetchFunnelPageCached,
  fetchFunnelWithPagesCached: mocks.fetchFunnelWithPagesCached,
  fetchPresentationCached: mocks.fetchPresentationCached,
  invalidateFunnelPreviewCache: vi.fn(),
  invalidatePresentationPreviewCache: vi.fn(),
}))

vi.mock('@/lib/campaigns', () => ({
  fetchCampaign: mocks.fetchCampaign,
}))

vi.mock('@/lib/cache/keyed-fetch-cache', () => ({
  cachedFetch: (_key: string, loader: () => Promise<unknown>) => loader(),
  invalidateCachedFetch: mocks.invalidateCachedFetch,
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

describe('useSpaceArtifactPreviewController', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.fetchCampaign.mockResolvedValue({
      id: 'campaign-1',
      config: { agent_settings: { theme_id: 'theme-1' } },
    })
    mocks.fetchFunnelWithPagesCached.mockResolvedValue({
      id: 'funnel-1',
      name: 'Launch funnel',
      status: 'draft',
      slug: 'launch',
      published_url: null,
      funnel_type: 'custom',
      campaign_id: 'campaign-1',
      theme_id: 'funnel-theme-1',
      metadata: { source: 'test' },
      layout: null,
      pages: [
        {
          id: 'page-late',
          name: 'Second',
          sort_order: 2,
          source_mode: 'generated_html',
          generated_html: '<section>Second</section>',
          generated_css: '.second{}',
          preview_contract: null,
        },
        {
          id: 'page-first',
          name: 'First',
          sort_order: 1,
          source_mode: 'generated_html',
          generated_html: '<section>First</section>',
          generated_css: '.first{}',
          preview_contract: {
            normalization_applied: [],
            recovery_applied: [],
            used_fallback: false,
          },
        },
      ],
    })
    mocks.fetchFunnelPageCached.mockResolvedValue({
      id: 'page-first',
      name: 'First',
      source_mode: 'generated_html',
      generated_html: '<section>First</section>',
      generated_css: '.first{}',
      preview_contract: {
        normalization_applied: [],
        recovery_applied: [],
        used_fallback: false,
      },
    })
    mocks.fetchPresentationCached.mockResolvedValue({
      id: 'presentation-1',
      name: 'Launch deck',
      status: 'generated',
      file_url: null,
      generated_html: '<section>Deck</section>',
      published_url: null,
      campaign_id: 'campaign-1',
      updated_at: '2026-06-25T00:00:00.000Z',
    })
    mocks.getTheme.mockResolvedValue(makeTheme())
  })

  afterEach(() => {
    cleanup()
    consoleErrorSpy.mockRestore()
  })

  it('loads presentation metadata and campaign theme CSS without render churn', async () => {
    const { result } = renderHook(() =>
      useSpaceArtifactPreviewController({
        campaignId: 'campaign-1',
        selection: {
          type: 'presentation',
          id: 'presentation-1',
          title: 'Launch deck',
        },
      }),
    )

    await waitFor(() => {
      expect(result.current.selectedPresentation?.id).toBe('presentation-1')
      expect(result.current.themePreviewCss).toContain('  --color-primary: #10b981;')
    })

    expect(mocks.fetchCampaign).toHaveBeenCalledWith('campaign-1')
    expect(mocks.getTheme).toHaveBeenCalledWith('theme-1')
    expectNoRenderLoop(consoleErrorSpy)
  })

  it('loads sorted funnel pages and the first page preview without render churn', async () => {
    const { result } = renderHook(() =>
      useSpaceArtifactPreviewController({
        campaignId: 'campaign-1',
        selection: {
          type: 'funnel',
          id: 'funnel-1',
          title: 'Launch funnel',
        },
      }),
    )

    await waitFor(() => {
      expect(result.current.selectedFunnel?.id).toBe('funnel-1')
      expect(result.current.funnelPages.map((page) => page.id)).toEqual([
        'page-first',
        'page-late',
      ])
      expect(result.current.currentPageId).toBe('page-first')
      expect(result.current.pageContent?.code).toBe('<section>First</section>')
    })

    expect(mocks.fetchFunnelWithPagesCached).toHaveBeenCalledWith('funnel-1')
    expect(mocks.fetchFunnelPageCached).toHaveBeenCalledWith('funnel-1', 'page-first')
    expectNoRenderLoop(consoleErrorSpy)
  })

  it('refreshes presentation metadata from realtime events and removes the channel', async () => {
    const { result, unmount } = renderHook(() =>
      useSpaceArtifactPreviewController({
        campaignId: 'campaign-1',
        selection: {
          type: 'presentation',
          id: 'presentation-1',
          title: 'Launch deck',
        },
      }),
    )

    await waitFor(() => {
      expect(result.current.selectedPresentation?.name).toBe('Launch deck')
    })

    const presentationChangeHandler = mocks.channelOn.mock.calls.find(
      ([event, config]) =>
        event === 'postgres_changes' &&
        typeof config === 'object' &&
        config !== null &&
        'table' in config &&
        config.table === 'presentations',
    )?.[2] as (() => void) | undefined

    expect(mocks.channel).toHaveBeenCalledWith('space-presentation-preview:presentation-1')
    expect(presentationChangeHandler).toBeDefined()

    mocks.fetchPresentationCached.mockResolvedValueOnce({
      id: 'presentation-1',
      name: 'Updated deck',
      status: 'published',
      file_url: null,
      generated_html: '<section>Updated</section>',
      published_url: 'https://example.test/deck',
      campaign_id: 'campaign-1',
      updated_at: '2026-06-25T00:01:00.000Z',
    })

    presentationChangeHandler?.()

    await waitFor(() => {
      expect(result.current.selectedPresentation?.name).toBe('Updated deck')
      expect(result.current.selectedPresentation?.publishedUrl).toBe('https://example.test/deck')
    })

    unmount()

    expect(mocks.removeChannel).toHaveBeenCalledTimes(1)
    expectNoRenderLoop(consoleErrorSpy)
  })
})
