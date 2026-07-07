import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Profiler } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { DmMessage } from '../services/dm.service'
import { HumanDMMessageBubble } from './HumanDMMessageBubble'

const mocks = vi.hoisted(() => ({
  attachmentPreview: vi.fn(({ documents }: { documents: Array<{ filename: string }> }) => (
    <div data-testid="attachment-previews">
      {documents.map((doc) => doc.filename).join(',')}
    </div>
  )),
}))

vi.mock('@/components/chat/ChatAttachmentPreviewsAdapter', () => ({
  ChatAttachmentPreviews: mocks.attachmentPreview,
}))

function buildMessage(overrides: Partial<DmMessage> = {}): DmMessage {
  return {
    id: 'message-1',
    conversation_id: 'dm-1',
    sender_id: 'user-1',
    content: 'Original message',
    content_blocks: null,
    metadata: {
      attachments: [
        'https://cdn.example.com/uploads/photo.png?token=1',
        'https://cdn.example.com/uploads/report.pdf',
      ],
    },
    edited_at: '2026-06-23T12:03:00.000Z',
    created_at: '2026-06-23T12:00:00.000Z',
    updated_at: '2026-06-23T12:03:00.000Z',
    ...overrides,
  }
}

async function flushAsyncWork() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe('HumanDMMessageBubble', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renders attachments, supports edit/delete actions, and settles without render loops', async () => {
    const onEdit = vi.fn().mockResolvedValue(undefined)
    const onDelete = vi.fn().mockResolvedValue(undefined)
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    let commits = 0

    try {
      render(
        <Profiler id="human-dm-message-bubble" onRender={() => commits++}>
          <HumanDMMessageBubble
            message={buildMessage()}
            isOwn
            senderName="Maya"
            avatarUrl={null}
            showHeader
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </Profiler>,
      )

      expect(screen.getByText('Maya')).toBeTruthy()
      expect(screen.getByText('Original message')).toBeTruthy()
      expect(screen.getByText('(edited)')).toBeTruthy()
      expect(screen.getByTestId('attachment-previews').textContent).toBe('photo.png,report.pdf')

      fireEvent.click(screen.getByLabelText('Edit message'))
      const editInput = screen.getByDisplayValue('Original message')
      fireEvent.change(editInput, { target: { value: 'Updated message' } })
      fireEvent.click(screen.getByText('Save'))
      await waitFor(() => expect(onEdit).toHaveBeenCalledWith('message-1', 'Updated message'))
      await flushAsyncWork()

      fireEvent.click(screen.getByLabelText('Delete message'))
      await waitFor(() => expect(onDelete).toHaveBeenCalledWith('message-1'))

      const maximumDepthErrors = consoleError.mock.calls.filter((call) =>
        call.some((part) => String(part).includes('Maximum update depth')),
      )
      expect(maximumDepthErrors).toHaveLength(0)
      expect(commits).toBeLessThan(15)
    } finally {
      consoleError.mockRestore()
    }
  })
})
