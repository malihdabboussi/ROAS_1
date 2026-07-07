import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MediaAsset } from '@/lib/services/media-api'
import type { CampaignDeliverable } from '../../services/artifact-preview.service'
import type { ConversationDocument } from '../../types'
import { MediaTab } from './MediaTab'

const serviceMocks = vi.hoisted(() => ({
  copyAssetToCampaign: vi.fn(),
  deleteAsset: vi.fn(),
  deleteDocument: vi.fn(),
  fetchCampaignDeliverables: vi.fn(),
  fetchCampaignDocuments: vi.fn(),
  fetchConversationAssets: vi.fn(),
  listAssets: vi.fn(),
  updateAsset: vi.fn(),
  updateDocument: vi.fn(),
  upload: vi.fn(),
}))

const supabaseMocks = vi.hoisted(() => ({
  channel: vi.fn(),
  removeChannel: vi.fn(),
  on: vi.fn(),
  subscribe: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    message: vi.fn(),
  },
}))

vi.mock('@/components/media/MediaPickerModal', () => ({
  MediaPickerModal: ({ open }: { open: boolean }) =>
    open ? <div data-testid="media-picker-modal" /> : null,
}))

vi.mock('@/lib/hooks/use-presigned-upload', () => ({
  usePresignedUpload: () => ({
    upload: serviceMocks.upload,
  }),
}))

vi.mock('@/lib/services/media-api', () => ({
  copyAssetToCampaign: serviceMocks.copyAssetToCampaign,
  deleteAsset: serviceMocks.deleteAsset,
  listAssets: serviceMocks.listAssets,
  updateAsset: serviceMocks.updateAsset,
}))

vi.mock('@/lib/api/backend-client', () => ({
  backendUpload: vi.fn(),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    channel: supabaseMocks.channel,
    removeChannel: supabaseMocks.removeChannel,
  }),
}))

vi.mock('../../services/artifact-preview.service', () => ({
  deleteDocument: serviceMocks.deleteDocument,
  fetchCampaignDeliverables: serviceMocks.fetchCampaignDeliverables,
  fetchCampaignDocuments: serviceMocks.fetchCampaignDocuments,
  updateDocument: serviceMocks.updateDocument,
}))

vi.mock('../../services/chat.service', () => ({
  fetchConversationAssets: serviceMocks.fetchConversationAssets,
}))

function documentFixture(overrides: Partial<ConversationDocument> = {}): ConversationDocument {
  return {
    id: 'doc-1',
    conversation_id: 'conversation-1',
    campaign_id: 'campaign-1',
    message_id: null,
    user_id: 'user-1',
    document_type: 'offer',
    title: 'Launch Doc',
    content: {},
    metadata: {},
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as ConversationDocument
}

function mediaAssetFixture(overrides: Partial<MediaAsset> = {}): MediaAsset {
  return {
    id: 'asset-1',
    user_id: 'user-1',
    name: 'Launch Image',
    original_filename: 'launch-image.png',
    file_path: 'campaigns/launch-image.png',
    bucket_name: 'media',
    file_size: 1024,
    mime_type: 'image/png',
    width: 1200,
    height: 628,
    asset_type: 'image',
    category: 'upload',
    subcategory: null,
    campaign_id: 'campaign-1',
    space_id: null,
    tags: [],
    description: null,
    is_public: true,
    public_url: 'https://example.com/launch-image.png',
    source: null,
    source_model: null,
    source_prompt: null,
    usage_count: 0,
    last_used_at: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function deliverableFixture(overrides: Partial<CampaignDeliverable> = {}): CampaignDeliverable {
  return {
    id: 'deliverable-1',
    mission_id: 'mission-1',
    campaign_id: 'campaign-1',
    user_id: 'user-1',
    agent_key: 'vibey',
    type: 'doc',
    title: 'Launch Brief',
    content: 'Brief content',
    file_url: null,
    file_name: null,
    file_size: null,
    mime_type: null,
    source: 'mission',
    metadata: {},
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function setupSupabaseChannel() {
  const channel = {
    on: supabaseMocks.on,
    subscribe: supabaseMocks.subscribe,
  }
  supabaseMocks.on.mockReturnValue(channel)
  supabaseMocks.subscribe.mockReturnValue(channel)
  supabaseMocks.channel.mockReturnValue(channel)
}

function expectNoRenderLoop(consoleErrorSpy: ReturnType<typeof vi.spyOn>) {
  const messages = consoleErrorSpy.mock.calls.map((args) => args.join(' '))
  expect(messages.join('\n')).not.toMatch(/Maximum update depth|Too many re-renders/i)
}

describe('MediaTab', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    window.localStorage.clear()
    setupSupabaseChannel()
    serviceMocks.fetchCampaignDocuments.mockResolvedValue([documentFixture()])
    serviceMocks.listAssets.mockResolvedValue({
      assets: [
        mediaAssetFixture(),
        mediaAssetFixture({
          id: 'asset-2',
          name: 'Promo Video',
          original_filename: 'promo-video.mp4',
          file_path: 'campaigns/promo-video.mp4',
          mime_type: 'video/mp4',
          asset_type: 'video',
          public_url: 'https://example.com/promo-video.mp4',
          width: 1920,
          height: 1080,
        }),
      ],
      total: 2,
    })
    serviceMocks.fetchCampaignDeliverables.mockResolvedValue([deliverableFixture()])
    serviceMocks.fetchConversationAssets.mockResolvedValue({
      items: [
        {
          id: 'link-1',
          url: 'https://example.com',
          title: 'Example link',
          message_id: 'message-1',
          created_at: '2026-01-01T00:00:00.000Z',
        },
      ],
      nextCursor: null,
    })
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    consoleErrorSpy.mockRestore()
  })

  it('keeps mounted header search, grid toggle, and bulk selection behavior stable', async () => {
    const { container } = render(<MediaTab campaignId="campaign-1" />)

    await screen.findByText('Launch Doc')
    expect(screen.getByText('Launch Image')).toBeTruthy()
    expect(screen.getByText('Promo Video')).toBeTruthy()

    fireEvent.change(screen.getByPlaceholderText('Search…'), {
      target: { value: 'promo' },
    })

    expect(screen.queryByText('Launch Doc')).toBeNull()
    expect(screen.queryByText('Launch Image')).toBeNull()
    expect(screen.getByText('Promo Video')).toBeTruthy()

    fireEvent.change(screen.getByPlaceholderText('Search…'), {
      target: { value: '' },
    })

    fireEvent.click(screen.getByText('Launch Doc').closest('button')!)
    expect(screen.getAllByText('Launch Doc')).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: 'Close preview' }))
    expect(screen.getAllByText('Launch Doc')).toHaveLength(1)

    fireEvent.click(screen.getByText('Launch Brief').closest('button')!)
    expect(screen.getAllByText('Launch Brief')).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: 'Close preview' }))
    expect(screen.getAllByText('Launch Brief')).toHaveLength(1)

    fireEvent.click(screen.getByText('Launch Image').closest('button')!)
    expect(screen.getByRole('img', { name: 'Launch Image' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Close preview' }))
    expect(screen.queryByRole('img', { name: 'Launch Image' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /Grid/i }))
    expect(window.localStorage.getItem('media-tab-view-mode')).toBe('grid')
    expect(screen.getByRole('button', { name: /List/i })).toBeTruthy()
    expect(screen.getByText('Docs')).toBeTruthy()

    fireEvent.click(screen.getByText('Launch Doc').closest('button')!)
    expect(screen.getAllByText('Launch Doc')).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: 'Close preview' }))
    expect(screen.getAllByText('Launch Doc')).toHaveLength(1)

    fireEvent.click(screen.getByRole('button', { name: /List/i }))
    expect(window.localStorage.getItem('media-tab-view-mode')).toBe('list')

    const headerIconButtons = container.querySelectorAll('button.btn-icon-glass')
    expect(headerIconButtons.length).toBeGreaterThanOrEqual(2)
    fireEvent.click(headerIconButtons[0]!)
    fireEvent.click(screen.getByText('Launch Doc').closest('button')!)

    expect(screen.getByText('1 selected')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeTruthy()

    await waitFor(() => {
      expect(serviceMocks.fetchCampaignDocuments).toHaveBeenCalledTimes(1)
      expect(serviceMocks.listAssets).toHaveBeenCalledTimes(1)
      expect(serviceMocks.fetchCampaignDeliverables).toHaveBeenCalledTimes(1)
      expect(serviceMocks.fetchConversationAssets).toHaveBeenCalledTimes(1)
    })
    expectNoRenderLoop(consoleErrorSpy)
  })
})
