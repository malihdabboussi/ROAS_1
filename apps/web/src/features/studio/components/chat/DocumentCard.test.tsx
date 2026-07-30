import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DocumentCard } from './DocumentCard'

const { openDocumentInShell } = vi.hoisted(() => ({
  openDocumentInShell: vi.fn(),
}))

vi.mock('@/lib/artifacts', () => ({
  openDocumentInShell,
}))

describe('DocumentCard', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('opens conversation documents in the canonical shell document preview', () => {
    render(
      <DocumentCard
        title="Launch brief"
        documentId="document-1"
        snippet="A concise launch brief."
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Launch brief/i }))

    expect(openDocumentInShell).toHaveBeenCalledWith({
      documentId: 'document-1',
      title: 'Launch brief',
      spaceId: undefined,
      spaceItemId: undefined,
    })
  })

  it('opens dual-written documents in the canonical Space editor', () => {
    render(
      <DocumentCard
        title="Campaign brief"
        documentId="document-2"
        spaceId="space-1"
        spaceItemId="item-1"
        snippet="The campaign brief."
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Campaign brief/i }))

    expect(openDocumentInShell).toHaveBeenCalledWith({
      documentId: 'document-2',
      title: 'Campaign brief',
      spaceId: 'space-1',
      spaceItemId: 'item-1',
    })
  })
})
