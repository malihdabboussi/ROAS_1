import { Profiler } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { MessageContentBlock } from '../../types'
import type { ContentBlockRenderContext } from './message-bubble.types'
import { messageContentBlockPartA } from './MessageContentBlockSwitchPartA'

const artifactPreviewMocks = vi.hoisted(() => ({
  fetchAd: vi.fn(),
  fetchAdCampaign: vi.fn(),
  fetchAdSet: vi.fn(),
}))

vi.mock('../../services/artifact-preview.service', () => artifactPreviewMocks)

vi.mock('../chat/meta', () => ({
  MetaAdAccountSelector: ({
    adAccounts,
    pages,
    onSelect,
  }: {
    adAccounts: Array<{ id: string; name: string }>
    pages: Array<{ id: string; name: string }>
    onSelect?: (adAccountId: string, pageId: string) => void
  }) => (
    <div data-testid="meta-ad-account-selector">
      <span>accounts:{adAccounts.map((account) => account.name).join(',')}</span>
      <span>pages:{pages.map((page) => page.name).join(',')}</span>
      <button
        type="button"
        onClick={() => onSelect?.(adAccounts[0]?.id ?? '', pages[0]?.id ?? '')}
      >
        Select Meta
      </button>
    </div>
  ),
  MetaConfigCard: ({
    defaults,
    onConfigure,
  }: {
    defaults?: {
      objective?: string
      daily_budget?: number
      countries?: string[]
      pixel_id?: string
      custom_event_type?: string
    }
    onConfigure?: (config: {
      objective: string
      dailyBudget: number
      countries: string[]
      pixelId?: string
      customEventType?: string
    }) => void
  }) => (
    <div data-testid="meta-config-card">
      <span>objective:{defaults?.objective}</span>
      <button
        type="button"
        onClick={() =>
          onConfigure?.({
            objective: 'OUTCOME_SALES',
            dailyBudget: 1200,
            countries: ['US', 'GB'],
            pixelId: 'pixel-from-config',
            customEventType: 'PURCHASE',
          })
        }
      >
        Configure Meta
      </button>
    </div>
  ),
  MetaPublishConfirm: ({
    adId,
    onPublished,
  }: {
    adId: string
    onPublished?: (payload: { metaAdId: string; campaignId?: string }) => void
  }) => (
    <div data-testid="meta-publish-confirm">
      <span>ad:{adId}</span>
      <button
        type="button"
        onClick={() => onPublished?.({ metaAdId: 'meta-ad-1', campaignId: 'meta-campaign-1' })}
      >
        Publish Meta
      </button>
    </div>
  ),
  MetaStatusCard: ({
    metaAdId,
    status,
    campaignId,
  }: {
    metaAdId: string
    status: string
    campaignId?: string
  }) => (
    <div data-testid="meta-status-card">
      {metaAdId}|{status}|{campaignId}
    </div>
  ),
}))

function createContext(
  appendUiBlockToOrderedBlocks = vi.fn(),
): ContentBlockRenderContext {
  return {
    message: {
      id: 'message-1',
      conversation_id: 'conversation-1',
      role: 'assistant',
      content: null,
      content_blocks: null,
      metadata: {},
      created_at: '2026-06-24T00:00:00Z',
    },
    contentBlocksOrdered: [],
    isCurrentlyStreaming: false,
    isBeingWorkedOn: false,
    lastTextBlockId: null,
    toolStyleIndex: 0,
    latestPlanBlockIds: new Set(),
    replaceUiBlock: vi.fn(),
    appendUiBlockToOrderedBlocks,
    setOrderedBlocks: vi.fn(),
    sendOrApprove: vi.fn(),
  }
}

function PartAHarness({
  block,
  ctx,
}: {
  block: MessageContentBlock
  ctx: ContentBlockRenderContext
}) {
  return <>{messageContentBlockPartA(block, ctx)}</>
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('messageContentBlockPartA Meta rendering', () => {
  it('renders Meta account choices and appends a config block with resolved campaign defaults', async () => {
    artifactPreviewMocks.fetchAd.mockResolvedValue({ ad_set_id: 'ad-set-1' })
    artifactPreviewMocks.fetchAdSet.mockResolvedValue({
      ad_campaign_id: 'campaign-1',
      targeting: { geo_locations: { countries: ['CA'] } },
    })
    artifactPreviewMocks.fetchAdCampaign.mockResolvedValue({
      objective: 'OUTCOME_LEADS',
      daily_budget: 900,
      metadata: {
        meta_pixel_id: 'pixel-1',
        meta_custom_event_type: 'LEAD',
      },
    })
    const appendUiBlockToOrderedBlocks = vi.fn()
    let commitCount = 0
    const block = {
      type: 'meta_ad_accounts',
      id: 'meta-accounts-1',
      ad_id: 'ad-1',
      campaign_name: 'Summer Push',
      headline: 'Fresh headline',
      primary_text: 'Fresh primary text',
      image_url: 'https://example.test/ad.png',
      data: {
        data: [{ account_id: 'act-1', account_name: 'Main Ad Account', currency: 'USD' }],
      },
      facebook_pages: [{ page_id: 'page-1', page_name: 'Main Page' }],
    } as unknown as MessageContentBlock

    render(
      <Profiler id="part-a-meta" onRender={() => commitCount++}>
        <PartAHarness block={block} ctx={createContext(appendUiBlockToOrderedBlocks)} />
      </Profiler>,
    )

    expect(screen.queryByText('accounts:Main Ad Account')).not.toBeNull()
    expect(screen.queryByText('pages:Main Page')).not.toBeNull()

    fireEvent.click(screen.getByText('Select Meta'))

    await waitFor(() =>
      expect(appendUiBlockToOrderedBlocks).toHaveBeenCalledWith(
        'conversation-1',
        'message-1',
        expect.objectContaining({
          type: 'meta_config',
          adId: 'ad-1',
          campaignId: 'campaign-1',
          adAccountId: 'act-1',
          pageId: 'page-1',
          campaignName: 'Summer Push',
          headline: 'Fresh headline',
          primaryText: 'Fresh primary text',
          imageUrl: 'https://example.test/ad.png',
          defaults: {
            objective: 'OUTCOME_LEADS',
            daily_budget: 900,
            countries: ['CA'],
            pixel_id: 'pixel-1',
            custom_event_type: 'LEAD',
          },
        }),
      ),
    )
    expect(commitCount).toBeLessThan(6)
  })

  it('appends a publish-confirm block from the Meta config callback', () => {
    const appendUiBlockToOrderedBlocks = vi.fn()
    const block = {
      type: 'meta_config',
      id: 'meta-config-1',
      ad_id: 'ad-1',
      campaign_id: 'campaign-1',
      ad_account_id: 'act-1',
      page_id: 'page-1',
      campaign_name: 'Summer Push',
      headline: 'Fresh headline',
      primary_text: 'Fresh primary text',
      image_url: 'https://example.test/ad.png',
      defaults: {
        objective: 'OUTCOME_LEADS',
        daily_budget: 900,
        countries: ['CA'],
      },
    } as unknown as MessageContentBlock

    render(<PartAHarness block={block} ctx={createContext(appendUiBlockToOrderedBlocks)} />)

    expect(screen.queryByText('objective:OUTCOME_LEADS')).not.toBeNull()
    fireEvent.click(screen.getByText('Configure Meta'))

    expect(appendUiBlockToOrderedBlocks).toHaveBeenCalledWith(
      'conversation-1',
      'message-1',
      expect.objectContaining({
        type: 'meta_publish_confirm',
        adId: 'ad-1',
        campaignId: 'campaign-1',
        adAccountId: 'act-1',
        pageId: 'page-1',
        pixelId: 'pixel-from-config',
        customEventType: 'PURCHASE',
        campaignName: 'Summer Push',
        objective: 'OUTCOME_SALES',
        dailyBudget: 1200,
        targeting: {
          geo_locations: {
            countries: ['US', 'GB'],
          },
        },
        headline: 'Fresh headline',
        primaryText: 'Fresh primary text',
        imageUrl: 'https://example.test/ad.png',
      }),
    )
  })

  it('normalizes publish-confirm and status blocks into Meta child props', () => {
    const appendUiBlockToOrderedBlocks = vi.fn()
    const publishBlock = {
      type: 'meta_publish_confirm',
      id: 'meta-publish-confirm-1',
      ad_id: 'ad-1',
      ad_account_id: 'act-1',
      page_id: 'page-1',
      campaign_name: 'Summer Push',
      targeting: {},
      headline: 'Fresh headline',
      primary_text: 'Fresh primary text',
    } as unknown as MessageContentBlock
    const statusBlock = {
      type: 'meta_status',
      id: 'meta-status-1',
      meta_ad_id: 'meta-ad-1',
      effective_status: 'ACTIVE',
      meta_campaign_id: 'campaign-1',
    } as unknown as MessageContentBlock

    const { rerender } = render(
      <PartAHarness block={publishBlock} ctx={createContext(appendUiBlockToOrderedBlocks)} />,
    )

    expect(screen.queryByText('ad:ad-1')).not.toBeNull()
    fireEvent.click(screen.getByText('Publish Meta'))
    expect(appendUiBlockToOrderedBlocks).toHaveBeenCalledWith(
      'conversation-1',
      'message-1',
      expect.objectContaining({
        type: 'meta_status',
        metaAdId: 'meta-ad-1',
        status: 'PAUSED',
        campaignId: 'meta-campaign-1',
      }),
    )

    rerender(<PartAHarness block={statusBlock} ctx={createContext()} />)

    expect(screen.queryByTestId('meta-status-card')?.textContent).toBe(
      'meta-ad-1|ACTIVE|campaign-1',
    )
  })
})
