import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FinalOutputCards } from './FinalOutputCards'
import type { FinalOutputBlock } from './message-bubble.utils'

const { openArtifactPreviewInShell, openDocumentInShell } = vi.hoisted(() => ({
  openArtifactPreviewInShell: vi.fn(),
  openDocumentInShell: vi.fn(),
}))

vi.mock('@/lib/artifacts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/artifacts')>()
  return { ...actual, openArtifactPreviewInShell, openDocumentInShell }
})

afterEach(cleanup)

describe('FinalOutputCards', () => {
  beforeEach(() => {
    openArtifactPreviewInShell.mockClear()
    openDocumentInShell.mockClear()
  })

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

  it('opens a created funnel in its canonical shell preview', () => {
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

    expect(openArtifactPreviewInShell).toHaveBeenCalledWith({
      artifactType: 'funnel',
      artifactId: 'funnel-1',
      name: 'Lead Magnet Funnel',
      spaceId: 'space-1',
    })
  })

  it('automatically opens a newly created output while the agent is working', () => {
    const blocks: FinalOutputBlock[] = [
      {
        type: 'artifact_preview',
        id: 'presentation-1',
        artifactType: 'presentation',
        artifactId: 'deck-1',
        name: 'Launch deck',
      },
    ]

    render(<FinalOutputCards blocks={blocks} autoOpen />)

    expect(openArtifactPreviewInShell).toHaveBeenCalledWith({
      artifactType: 'presentation',
      artifactId: 'deck-1',
      name: 'Launch deck',
      spaceId: undefined,
    })
  })

  it('opens created tasks in the right-side task panel without navigating away', () => {
    const blocks: FinalOutputBlock[] = [
      {
        type: 'artifact_preview',
        id: 'task-1',
        artifactType: 'task',
        artifactId: 'task-1',
        name: 'Build Impact Elite GHL workflows',
        spaceId: 'delegation-desk-1',
      },
    ]

    render(<FinalOutputCards blocks={blocks} />)
    fireEvent.click(screen.getByRole('button', { name: /Build Impact Elite GHL workflows/i }))

    expect(openArtifactPreviewInShell).toHaveBeenCalledWith({
      artifactType: 'task',
      artifactId: 'task-1',
      name: 'Build Impact Elite GHL workflows',
      spaceId: 'delegation-desk-1',
    })
  })

  it('opens the exact created mission through the shell mission route', () => {
    const blocks: FinalOutputBlock[] = [
      {
        type: 'artifact_preview',
        id: 'mission-1',
        artifactType: 'mission',
        artifactId: 'mission-1',
        name: 'Validate Impact Elite message angles',
        spaceId: 'impact-elite-space',
      },
    ]

    render(<FinalOutputCards blocks={blocks} />)
    fireEvent.click(screen.getByRole('button', { name: /Validate Impact Elite message angles/i }))

    expect(openArtifactPreviewInShell).toHaveBeenCalledWith({
      artifactType: 'mission',
      artifactId: 'mission-1',
      name: 'Validate Impact Elite message angles',
      spaceId: 'impact-elite-space',
    })
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
          kind: 'video',
          fileUrl: 'https://cdn.vibey.ai/video.mp4',
        }),
      }),
    )
    window.removeEventListener('vibey-open-media', listener)
  })
})
