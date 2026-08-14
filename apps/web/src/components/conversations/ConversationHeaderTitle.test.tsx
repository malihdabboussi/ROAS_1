import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ConversationHeaderTitle } from './ConversationHeaderTitle'

describe('ConversationHeaderTitle', () => {
  afterEach(() => cleanup())

  it('renames the conversation from the full chat header', async () => {
    const onRename = vi.fn().mockResolvedValue(undefined)

    render(<ConversationHeaderTitle title="Sales follow-up" onRename={onRename} />)

    fireEvent.click(screen.getByRole('button', { name: 'Rename conversation' }))
    const input = screen.getByRole('textbox', { name: 'Conversation name' })
    fireEvent.change(input, { target: { value: 'Pipeline follow-up' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => expect(onRename).toHaveBeenCalledWith('Pipeline follow-up'))
  })

  it('cancels an inline rename without saving', () => {
    const onRename = vi.fn()

    render(<ConversationHeaderTitle title="Sales follow-up" onRename={onRename} />)

    fireEvent.click(screen.getByRole('button', { name: 'Rename conversation' }))
    const input = screen.getByRole('textbox', { name: 'Conversation name' })
    fireEvent.change(input, { target: { value: 'Discard this' } })
    fireEvent.keyDown(input, { key: 'Escape' })

    expect(onRename).not.toHaveBeenCalled()
    expect(screen.getByText('Sales follow-up')).toBeTruthy()
  })

  it('shows the rename pencil before the conversation name on hover or focus', () => {
    render(<ConversationHeaderTitle title="Sales follow-up" onRename={vi.fn()} />)

    const button = screen.getByRole('button', { name: 'Rename conversation' })
    const pencil = button.querySelector('.lucide-pencil')
    const title = screen.getByText('Sales follow-up')

    expect(button).toHaveTextContent('Sales follow-up')
    expect(button).toHaveClass('group')
    expect(pencil).toHaveClass(
      'opacity-0',
      'group-hover:opacity-100',
      'group-focus-visible:opacity-100',
    )
    expect(pencil?.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('enters rename mode when the adjacent conversation menu requests it', () => {
    const { rerender } = render(
      <ConversationHeaderTitle title="Sales follow-up" onRename={vi.fn()} renameRequestNonce={0} />,
    )

    rerender(
      <ConversationHeaderTitle title="Sales follow-up" onRename={vi.fn()} renameRequestNonce={1} />,
    )

    expect(screen.getByRole('textbox', { name: 'Conversation name' })).toBeInTheDocument()
  })
})
