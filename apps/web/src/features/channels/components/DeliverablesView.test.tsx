import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ChannelMember, ChannelMessage } from '@/lib/channels'
import { extractDeliverablesFromMessage } from '../lib/channel-deliverables'
import { DeliverablesView } from './DeliverablesView'

const mocks = vi.hoisted(() => ({
  fetchCampaigns: vi.fn(),
  resolveArtifactCampaigns: vi.fn(),
  fetchOffer: vi.fn(),
  renderDeliverableEntityPreview: vi.fn(),
  modalDeliverables: [] as Array<{
    title: string
    type: string
    entity_id?: string | null
    entity_table?: string | null
    campaign_id?: string | null
  }>,
}))

vi.mock('@/features/studio/services/campaign.service', () => ({
  fetchCampaigns: mocks.fetchCampaigns,
  resolveArtifactCampaigns: mocks.resolveArtifactCampaigns,
}))

vi.mock('@/lib/campaigns', () => ({
  fetchCampaigns: mocks.fetchCampaigns,
  resolveArtifactCampaigns: mocks.resolveArtifactCampaigns,
}))

vi.mock('@/features/studio/services/artifact-preview.service', () => ({
  fetchAvatar: vi.fn(),
  fetchBlogPostById: vi.fn(),
  fetchDocument: vi.fn(),
  fetchFunnelWithPages: vi.fn(),
  fetchOffer: mocks.fetchOffer,
  fetchPresentation: vi.fn(),
  fetchSequence: vi.fn(),
  fetchSocialPost: vi.fn(),
}))

vi.mock('@/lib/artifacts', () => ({
  buildOfferStepPreviews: vi.fn(() => [{ label: 'Step 1', preview: 'Preview copy' }]),
  fetchAvatar: vi.fn(),
  fetchBlogPostById: vi.fn(),
  fetchDocument: vi.fn(),
  fetchFunnelWithPages: vi.fn(),
  fetchOffer: mocks.fetchOffer,
  fetchPresentation: vi.fn(),
  fetchSequence: vi.fn(),
  fetchSocialPost: vi.fn(),
}))

vi.mock('@/components/deliverables/deliverable-entity-preview-renderer', () => ({
  renderDeliverableEntityPreview: mocks.renderDeliverableEntityPreview,
}))

vi.mock('@/components/artifacts/TsxMiniIframe', () => ({
  TsxMiniIframe: () => <div data-testid="tsx-mini-iframe" />,
}))

vi.mock('@/components/deliverables/DeliverablePreviewModal', () => ({
  DeliverablePreviewModal: ({
    deliverable,
    renderEntityPreview,
  }: {
    deliverable: {
      title: string
      type: string
      entity_id?: string | null
      entity_table?: string | null
      campaign_id?: string | null
    }
    renderEntityPreview: unknown
  }) => {
    mocks.modalDeliverables.push(deliverable)
    return (
      <div
        data-testid="deliverable-preview-modal"
        data-title={deliverable.title}
        data-type={deliverable.type}
        data-entity-id={deliverable.entity_id ?? ''}
        data-entity-table={deliverable.entity_table ?? ''}
        data-campaign-id={deliverable.campaign_id ?? ''}
        data-has-renderer={typeof renderEntityPreview === 'function' ? 'yes' : 'no'}
      />
    )
  },
}))

function channelMessage(overrides: Partial<ChannelMessage>): ChannelMessage {
  return {
    id: 'msg-1',
    channel_id: 'channel-1',
    sender_type: 'agent',
    sender_id: 'atlas',
    content: '',
    content_blocks: null,
    metadata: null,
    reply_to_id: null,
    thread_name: null,
    pinned: false,
    pinned_by: null,
    created_at: '2026-06-28T10:00:00.000Z',
    updated_at: '2026-06-28T10:00:00.000Z',
    ...overrides,
  }
}

const members: ChannelMember[] = [
  {
    id: 'member-1',
    channel_id: 'channel-1',
    member_type: 'agent',
    user_id: null,
    agent_key: 'atlas',
    role: 'edit',
    added_by: null,
    joined_at: '2026-06-28T10:00:00.000Z',
    created_at: '2026-06-28T10:00:00.000Z',
    profile: null,
  },
]

describe('DeliverablesView channel deliverable extraction', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    mocks.modalDeliverables.length = 0
  })

  it('extracts URL, attachment, structured artifact, document, screenshot, project, widget, and text block deliverables', () => {
    const message = channelMessage({
      content:
        '![Hero](https://cdn.example.com/hero.png) [Brief](https://cdn.example.com/brief.pdf)',
      metadata: {
        campaign_id: 'campaign-message',
        attachments: ['https://cdn.example.com/raw.mp4'],
        content_blocks_ordered: [
          {
            id: 'artifact-block',
            type: 'artifact_preview',
            artifactType: 'offer',
            artifactId: 'offer-1',
            name: 'Primary offer',
            imageUrl: 'https://cdn.example.com/offer.png',
            campaign_id: 'campaign-artifact',
          },
          {
            id: 'doc-block',
            type: 'document_card',
            documentId: 'doc-1',
            title: 'Launch brief',
          },
          {
            id: 'shot-block',
            type: 'browser_screenshot',
            imageUrl: 'https://cdn.example.com/screenshot.webp',
            pageUrl: 'https://vibey.example.com/path',
          },
          {
            id: 'project-block',
            type: 'project_preview',
            project_id: 'project-1',
            name: 'Launch project',
          },
          {
            id: 'widget-block',
            type: 'widget_preview',
            name: 'Signup widget',
          },
          {
            id: 'text-block',
            type: 'text',
            content: '[Audio](https://cdn.example.com/audio.mp3)',
          },
        ],
      },
    })

    const deliverables = extractDeliverablesFromMessage(
      message,
      new Map([['atlas', 'https://cdn.example.com/atlas.png']]),
    )

    expect(deliverables.map((item) => [item.label, item.type, item.campaignId])).toEqual([
      ['hero.png', 'image', 'campaign-message'],
      ['Brief', 'document', 'campaign-message'],
      ['raw.mp4', 'video', 'campaign-message'],
      ['Primary offer', 'image', 'campaign-artifact'],
      ['Launch brief', 'document', 'campaign-message'],
      ['Screenshot — vibey.example.com', 'image', 'campaign-message'],
      ['Launch project', 'artifact', 'campaign-message'],
      ['Signup widget', 'artifact', 'campaign-message'],
      ['Audio', 'audio', 'campaign-message'],
    ])
    expect(deliverables.find((item) => item.label === 'Primary offer')).toMatchObject({
      artifactType: 'offer',
      artifactId: 'offer-1',
      agentKey: 'atlas',
      agentAvatarUrl: 'https://cdn.example.com/atlas.png',
    })
  })

  it('renders resolved campaign deliverables through the preview modal and settles across rerenders', async () => {
    mocks.fetchCampaigns.mockResolvedValue([{ id: 'campaign-resolved', name: 'Resolved Campaign' }])
    mocks.resolveArtifactCampaigns.mockResolvedValue({ 'offers:offer-1': ['campaign-resolved'] })
    mocks.fetchOffer.mockResolvedValue({ step1_data: { headline: 'Offer headline' } })
    const messages = [
      channelMessage({
        metadata: {
          content_blocks_ordered: [
            {
              id: 'artifact-block',
              type: 'artifact_preview',
              artifactType: 'offer',
              artifactId: 'offer-1',
              name: 'Primary offer',
            },
          ],
        },
      }),
    ]

    const { rerender } = render(
      <DeliverablesView messages={messages} members={members} rosterAvatars={new Map()} />,
    )

    await waitFor(() => {
      expect(mocks.resolveArtifactCampaigns).toHaveBeenCalledWith([
        { table: 'offers', id: 'offer-1' },
      ])
    })

    fireEvent.click(screen.getByRole('button', { name: /Primary offer/i }))

    await waitFor(() => {
      expect(screen.getByTestId('deliverable-preview-modal').getAttribute('data-campaign-id')).toBe(
        'campaign-resolved',
      )
    })
    const modal = screen.getByTestId('deliverable-preview-modal')
    expect(modal.getAttribute('data-type')).toBe('offer')
    expect(modal.getAttribute('data-entity-table')).toBe('offers')
    expect(modal.getAttribute('data-has-renderer')).toBe('yes')

    rerender(<DeliverablesView messages={messages} members={members} rosterAvatars={new Map()} />)
    await waitFor(() => {
      expect(mocks.fetchCampaigns).toHaveBeenCalledTimes(1)
    })
    expect(mocks.modalDeliverables.length).toBeGreaterThanOrEqual(1)
  })

  it('filters deliverables by type from the dropdown and clears without repeated campaign loads', async () => {
    mocks.fetchCampaigns.mockResolvedValue([])
    const messages = [
      channelMessage({
        content:
          '![Hero](https://cdn.example.com/hero.png) [Brief](https://cdn.example.com/brief.pdf)',
      }),
    ]

    const { rerender } = render(
      <DeliverablesView messages={messages} members={members} rosterAvatars={new Map()} />,
    )

    expect(await screen.findByRole('button', { name: /hero\.png/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Brief/i })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /Filters/i }))
    const typeRow = screen.getByText('Type').closest('div')
    expect(typeRow).toBeTruthy()
    fireEvent.mouseEnter(typeRow as HTMLElement)
    fireEvent.click(screen.getByRole('button', { name: /Documents/i }))

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /hero\.png/i })).toBeNull()
    })
    expect(screen.getByRole('button', { name: /Brief/i })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /Clear all filters/i }))

    expect(await screen.findByRole('button', { name: /hero\.png/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Brief/i })).toBeTruthy()

    rerender(<DeliverablesView messages={messages} members={members} rosterAvatars={new Map()} />)

    await waitFor(() => {
      expect(mocks.fetchCampaigns).toHaveBeenCalledTimes(1)
    })
  })
})
