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
})
