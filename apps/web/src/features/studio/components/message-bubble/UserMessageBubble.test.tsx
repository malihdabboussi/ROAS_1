import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { UserMessageBubble } from './UserMessageBubble'

vi.mock('../ChatInput', () => ({
  ChatInput: () => <div>Edit composer</div>,
}))

vi.mock('../chat/FileAttachments', () => ({
  PersistedFileChips: () => null,
}))

const baseProps = {
  messageId: 'message-1',
  content: 'A pinned user message that should be directly interactive.',
  documents: [],
  highlightedArtifacts: [],
  messageReferences: [],
  stickyUser: true,
}

describe('UserMessageBubble', () => {
  it('exposes a clickable and keyboard-operable expand control', () => {
    render(<UserMessageBubble {...baseProps} />)

    const bubble = screen.getByRole('button', { name: 'Expand message' })
    fireEvent.keyDown(bubble, { key: 'Enter' })

    expect(screen.getByRole('button', { name: 'Collapse message' })).toBeInTheDocument()
  })

  it('opens the edit composer from the keyboard when editing is available', () => {
    render(<UserMessageBubble {...baseProps} isEditable onEditSubmit={vi.fn()} />)

    fireEvent.keyDown(screen.getByRole('button', { name: 'Edit message' }), { key: ' ' })

    expect(screen.getByText('Edit composer')).toBeInTheDocument()
  })
})
