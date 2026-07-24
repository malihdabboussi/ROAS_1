import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FinalOutputCards } from './FinalOutputCards'
import type { FinalOutputBlock } from './message-bubble.utils'

afterEach(cleanup)

describe('FinalOutputCards', () => {
  it('renders compact full-width output rows', () => {
    const blocks: FinalOutputBlock[] = [
      {
        type: 'artifact_preview',
        id: 'presentation-1',
        artifactType: 'presentation',
        artifactId: 'deck-1',
        name: 'Launch deck',
        subtitle: '8 slides',
      },
      {
        type: 'document_card',
        id: 'doc-1',
        title: 'Launch brief',
        documentId: 'document-1',
        snippet: 'A concise launch brief.',
      },
    ]

    render(<FinalOutputCards blocks={blocks} />)

    expect(screen.getByRole('button', { name: /Launch deck/i })).not.toBeNull()
    expect(screen.getByRole('button', { name: /Launch brief/i })).not.toBeNull()
    expect(screen.getByText('Presentation')).not.toBeNull()
    expect(screen.getByText('Document')).not.toBeNull()
  })

  it('opens output blocks through the deliverable preview when source context is available', () => {
    const onOpenDeliverablePreview = vi.fn()
    const blocks: FinalOutputBlock[] = [
      {
        type: 'document_card',
        id: 'doc-1',
        title: 'Launch brief',
        documentId: 'document-1',
        snippet: 'A concise launch brief.',
      },
    ]

    render(
      <FinalOutputCards
        blocks={blocks}
        deliverableSource={{
          messageId: 'message-1',
          createdAt: '2026-06-25T00:00:00.000Z',
          agentKey: 'agent-1',
        }}
        onOpenDeliverablePreview={onOpenDeliverablePreview}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Launch brief/i }))

    expect(onOpenDeliverablePreview).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'message-1-doc-document-1',
        title: 'Launch brief',
        entity_id: 'document-1',
      }),
    )
  })

  it('opens a created funnel in the in-app artifact workspace', () => {
    const listener = vi.fn()
    window.addEventListener('vibey-open-artifact', listener)
    const blocks: FinalOutputBlock[] = [
      {
        type: 'artifact_preview',
        id: 'funnel-1',
        artifactType: 'funnel',
        artifactId: 'funnel-1',
        name: 'Lead Magnet Funnel',
        spaceId: 'space-1',
      },
    ]

    render(<FinalOutputCards blocks={blocks} />)
    fireEvent.click(screen.getByRole('button', { name: /Lead Magnet Funnel/i }))

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: {
          artifactType: 'funnel',
          artifactId: 'funnel-1',
          name: 'Lead Magnet Funnel',
          spaceId: 'space-1',
        },
      }),
    )
    window.removeEventListener('vibey-open-artifact', listener)
  })

  it('opens a generated video in the in-app media workspace', () => {
    const listener = vi.fn()
    window.addEventListener('vibey-open-media', listener)
    const mediaAssetId = '565c9d8e-a74f-456a-90bf-8eb98d4e26a3'
    const blocks: FinalOutputBlock[] = [
      {
        type: 'media_asset',
        id: `media-${mediaAssetId}`,
        mediaAssetId,
        spaceId: 'c0a6bc09-9502-4b0e-9438-302ed1482531',
        url: 'https://cdn.vibey.ai/video.mp4',
        title: 'Generated video',
        kind: 'video',
      },
    ]

    render(<FinalOutputCards blocks={blocks} />)
    fireEvent.click(screen.getByRole('button', { name: /Generated video/i }))

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: expect.objectContaining({
          mediaAssetId,
          title: 'Generated video',
        }),
      }),
    )
    window.removeEventListener('vibey-open-media', listener)
  })
})
