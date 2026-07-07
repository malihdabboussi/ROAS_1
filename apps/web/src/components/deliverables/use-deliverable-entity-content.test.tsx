import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MissionDeliverable } from '@/lib/missions'
import { useDeliverableEntityContent } from './use-deliverable-entity-content'

const entityMocks = vi.hoisted(() => ({
  avatarToText: vi.fn(),
  fetchAd: vi.fn(),
  fetchAvatar: vi.fn(),
  fetchDocument: vi.fn(),
  fetchEmailArtifact: vi.fn(),
  fetchOffer: vi.fn(),
  fetchPresentation: vi.fn(),
  fetchSequence: vi.fn(),
  fetchSocialPost: vi.fn(),
  offerToText: vi.fn(),
  presentationToText: vi.fn(),
  sequenceToText: vi.fn(),
}))

vi.mock('@/lib/artifacts', () => ({
  avatarToText: entityMocks.avatarToText,
  fetchAd: entityMocks.fetchAd,
  fetchAvatar: entityMocks.fetchAvatar,
  fetchDocument: entityMocks.fetchDocument,
  fetchEmailArtifact: entityMocks.fetchEmailArtifact,
  fetchOffer: entityMocks.fetchOffer,
  fetchPresentation: entityMocks.fetchPresentation,
  fetchSequence: entityMocks.fetchSequence,
  fetchSocialPost: entityMocks.fetchSocialPost,
  offerToText: entityMocks.offerToText,
  presentationToText: entityMocks.presentationToText,
  sequenceToText: entityMocks.sequenceToText,
}))

const baseDeliverable: MissionDeliverable = {
  id: 'deliverable-1',
  mission_id: 'mission-1',
  campaign_id: 'campaign-1',
  user_id: 'user-1',
  agent_key: 'vibey',
  type: 'offer',
  title: 'Offer brief',
  content: null,
  file_url: null,
  file_name: null,
  file_size: null,
  mime_type: null,
  metadata: {},
  entity_id: 'offer-1',
  entity_table: 'offers',
  source: 'mission',
  created_at: '2026-06-28T10:30:00.000Z',
}

function renderHarness(deliverable: MissionDeliverable) {
  let renderCount = 0

  function Harness() {
    renderCount += 1
    const state = useDeliverableEntityContent(deliverable)
    return (
      <div>
        <span data-testid="loading">{state.entityContentLoading ? 'loading' : 'ready'}</span>
        <span data-testid="effective-content">{state.effectiveContent ?? ''}</span>
        <span data-testid="entity-data">{state.entityData ? 'loaded' : 'empty'}</span>
        <span data-testid="source-pdf">{state.hasSourcePdfFile ? 'pdf' : 'not-pdf'}</span>
      </div>
    )
  }

  render(<Harness />)
  return { getRenderCount: () => renderCount }
}

describe('useDeliverableEntityContent', () => {
  beforeEach(() => {
    for (const mock of Object.values(entityMocks)) {
      mock.mockReset()
    }
    entityMocks.fetchOffer.mockResolvedValue({ id: 'offer-1', name: 'Growth Offer' })
    entityMocks.offerToText.mockReturnValue('Formatted offer text')
  })

  afterEach(() => {
    cleanup()
  })

  it('loads entity text and data, detects source PDFs, and settles without render churn', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { getRenderCount } = renderHarness({
      ...baseDeliverable,
      file_url: 'https://cdn.example.com/brief.pdf',
      file_name: 'brief.pdf',
      mime_type: 'application/pdf',
    })

    await waitFor(() =>
      expect(screen.getByTestId('effective-content').textContent).toBe('Formatted offer text'),
    )

    expect(entityMocks.fetchOffer).toHaveBeenCalledWith('offer-1')
    expect(entityMocks.offerToText).toHaveBeenCalledWith({ id: 'offer-1', name: 'Growth Offer' })
    expect(screen.getByTestId('loading').textContent).toBe('ready')
    expect(screen.getByTestId('entity-data').textContent).toBe('loaded')
    expect(screen.getByTestId('source-pdf').textContent).toBe('pdf')

    const renderLoopErrors = consoleErrorSpy.mock.calls.filter(([message]) =>
      String(message).match(/maximum update depth|too many re-renders/i),
    )
    expect(renderLoopErrors).toHaveLength(0)
    expect(getRenderCount()).toBeLessThan(20)
    consoleErrorSpy.mockRestore()
  })

  it('does not fetch Space doc entities because the preview body owns that path', async () => {
    renderHarness({
      ...baseDeliverable,
      type: 'doc',
      entity_id: 'space-item-1',
      entity_table: 'space_items',
      content: 'Existing doc body',
    })

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('ready'))

    expect(entityMocks.fetchDocument).not.toHaveBeenCalled()
    expect(screen.getByTestId('effective-content').textContent).toBe('Existing doc body')
  })
})
