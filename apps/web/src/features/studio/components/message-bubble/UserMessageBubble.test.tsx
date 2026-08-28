import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { UserMessageBubble } from './UserMessageBubble'

vi.mock('../ChatInput', () => ({
  ChatInput: () => <div>Edit composer</div>,
}))

vi.mock('../chat/FileAttachments', () => ({
  PersistedFileChips: () => null,
}))

const baseProps = {
  messageId: 'message-1',
  createdAt: '2026-08-28T19:30:00.000Z',
  content: 'A pinned user message that should be directly interactive.',
  documents: [],
  highlightedArtifacts: [],
  messageReferences: [],
}

afterEach(cleanup)

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

  it('uses a flat message surface with its persisted timestamp and scoped hover actions', () => {
    const { container } = render(<UserMessageBubble {...baseProps} isEditable />)

    const message = container.querySelector('[data-message="message-1"]')
    const bubble = screen.getByRole('button', { name: 'Edit message' })
    const options = screen.getByRole('button', { name: 'Message options' })

    expect(message).toHaveClass('group/message')
    expect(bubble).toHaveClass('bg-secondary')
    expect(bubble).not.toHaveClass('card-glass-user')
    expect(options).toHaveClass('group-hover/message:opacity-100')
    expect(screen.getByText(/Aug 28/)).toBeInTheDocument()
  })
})
