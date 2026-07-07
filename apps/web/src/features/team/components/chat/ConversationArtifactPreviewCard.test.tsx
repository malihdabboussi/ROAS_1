import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { backendGet } from '@/lib/api/backend-client'
import type { ConversationDocument } from '@/lib/artifacts/artifact-types'
import { ConversationArtifactPreviewCard } from './ConversationArtifactPreviewCard'

vi.mock('@/components/artifacts/TsxMiniIframe', () => ({
  TsxMiniIframe: ({ code, css, title }: { code: string; css?: string; title: string }) => (
    <div data-testid="tsx-mini-iframe" data-css={css} title={title}>
      {code}
    </div>
  ),
}))

vi.mock('@/lib/api/backend-client', () => ({
  backendDelete: vi.fn(),
  backendGet: vi.fn(),
  backendPatch: vi.fn(),
  backendPost: vi.fn(),
  backendPut: vi.fn(),
}))

const backendGetMock = vi.mocked(backendGet)

function documentFixture(overrides: Partial<ConversationDocument>): ConversationDocument {
  return {
    id: 'doc-1',
    conversation_id: 'conversation-1',
    campaign_id: 'campaign-1',
    resource_id: null,
    document_type: 'offer',
    title: 'Artifact title',
    content: {},
    metadata: {},
    created_at: '2026-06-22T10:00:00.000Z',
    updated_at: '2026-06-22T10:00:00.000Z',
    ...overrides,
  }
}

describe('ConversationArtifactPreviewCard', () => {
  beforeEach(() => {
    backendGetMock.mockReset()
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('fetches an offer document and renders existing step previews', async () => {
    backendGetMock.mockResolvedValueOnce({
      id: 'offer-1',
      step1_data: {
        market: 'Creators selling higher-ticket advisory services',
      },
      step2_data: {
        promise: 'A clear offer users can understand in one glance',
      },
    })

    render(
      <ConversationArtifactPreviewCard
        doc={documentFixture({
          resource_id: 'offer-1',
          document_type: 'offer',
          title: 'Offer Artifact',
          content: { description: 'Fallback offer excerpt' },
        })}
        contextLine="Team chat"
      />,
    )

    expect(screen.getByText('Offer Artifact')).toBeTruthy()
    expect(screen.getByText('Team chat')).toBeTruthy()

    expect(await screen.findByText('Product & Market')).toBeTruthy()
    expect(screen.getByText(/Creators selling higher-ticket advisory services/)).toBeTruthy()
    expect(screen.getByText('Power Offer')).toBeTruthy()
    expect(screen.getByText(/clear offer users can understand/)).toBeTruthy()
    expect(backendGetMock).toHaveBeenCalledWith('/api/offers/offer-1')
  })

  it('fetches a funnel document and renders the first ordered page preview', async () => {
    backendGetMock.mockResolvedValueOnce({
      id: 'funnel-1',
      pages: [
        {
          id: 'page-2',
          generated_html: '<section>Second page</section>',
          generated_css: '.second{}',
          order_index: 2,
        },
        {
          id: 'page-1',
          generated_html: '<section>First page</section>',
          generated_css: '.first{}',
          order_index: 1,
        },
      ],
    })

    render(
      <ConversationArtifactPreviewCard
        doc={documentFixture({
          resource_id: 'funnel-1',
          document_type: 'funnel',
          title: 'Launch Funnel',
          content: { summary: 'Fallback funnel excerpt' },
        })}
      />,
    )

    const preview = await screen.findByTestId('tsx-mini-iframe')
    expect(preview.textContent).toContain('First page')
    expect(preview.getAttribute('data-css')).toBe('.first{}')
    expect(backendGetMock).toHaveBeenCalledWith('/api/funnels/funnel-1')
    expect(screen.queryByText('Fallback funnel excerpt')).toBeNull()
  })

  it('uses the document excerpt without fetching when no linked artifact id exists', async () => {
    render(
      <ConversationArtifactPreviewCard
        doc={documentFixture({
          resource_id: null,
          document_type: 'offer',
          title: 'Loose Offer Doc',
          content: { summary: 'Saved summary from the conversation document.' },
        })}
      />,
    )

    expect(screen.getByText('Loose Offer Doc')).toBeTruthy()
    expect(screen.getByText('Saved summary from the conversation document.')).toBeTruthy()

    await waitFor(() => {
      expect(backendGetMock).not.toHaveBeenCalled()
    })
  })
})
