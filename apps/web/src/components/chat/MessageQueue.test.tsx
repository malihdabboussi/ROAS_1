import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MessageQueue, type ChatQueueItem } from './MessageQueue'

const queuedItems: ChatQueueItem[] = [
  {
    id: 'queue-1',
    content: 'First queued message',
  },
  {
    id: 'queue-2',
    content: 'Second queued message',
  },
]

describe('MessageQueue', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders nothing when the queue is empty', () => {
    const { container } = render(
      <MessageQueue items={[]} onRemove={vi.fn()} onSendNow={vi.fn()} onEdit={vi.fn()} />,
    )

    expect(container.firstChild).toBeNull()
  })

  it('renders queued messages and delegates row editing', () => {
    const onEdit = vi.fn()

    render(
      <MessageQueue items={queuedItems} onRemove={vi.fn()} onSendNow={vi.fn()} onEdit={onEdit} />,
    )

    expect(screen.queryByText('Queued (2)')).not.toBeNull()
    fireEvent.click(screen.getByText('First queued message'))

    expect(onEdit).toHaveBeenCalledWith(queuedItems[0])
  })

  it('uses a native named button to open a queued message for editing', () => {
    const onEdit = vi.fn()
    render(
      <MessageQueue items={queuedItems} onRemove={vi.fn()} onSendNow={vi.fn()} onEdit={onEdit} />,
    )

    const editButton = screen.getByRole('button', { name: 'Edit First queued message' })
    expect(editButton.tagName).toBe('BUTTON')
    fireEvent.click(editButton)

    expect(onEdit).toHaveBeenCalledWith(queuedItems[0])
  })

  it('delegates send-now and remove actions without opening edit', () => {
    const onEdit = vi.fn()
    const onSendNow = vi.fn()
    const onRemove = vi.fn()

    render(
      <MessageQueue
        items={queuedItems}
        onRemove={onRemove}
        onSendNow={onSendNow}
        onEdit={onEdit}
      />,
    )

    fireEvent.click(screen.getAllByRole('button', { name: 'Send now' })[0]!)
    fireEvent.click(screen.getAllByRole('button', { name: 'Remove from queue' })[1]!)

    expect(onSendNow).toHaveBeenCalledWith('queue-1')
    expect(onRemove).toHaveBeenCalledWith('queue-2')
    expect(onEdit).not.toHaveBeenCalled()
  })
})
