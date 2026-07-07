import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LinkPreview, SpaceItemActivity } from '../../services/spaces.service'
import { TaskActivityComment } from './TaskActivityComment'

const serviceMocks = vi.hoisted(() => ({
  deleteItemComment: vi.fn(),
  updateItemComment: vi.fn(),
}))

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

vi.mock('../../services/spaces.service', () => ({
  deleteItemComment: serviceMocks.deleteItemComment,
  updateItemComment: serviceMocks.updateItemComment,
}))

vi.mock('./LinkPreviewCard', () => ({
  LinkPreviewCard: ({
    onPreview,
    preview,
  }: {
    onPreview?: () => void
    preview: LinkPreview
  }) => (
    <button type="button" onClick={onPreview}>
      Preview {preview.title}
    </button>
  ),
}))

const preview: LinkPreview = {
  url: 'https://example.com/report.pdf',
  provider: 'generic',
  title: 'Report PDF',
  description: 'Report description',
  imageUrl: null,
  iconUrl: null,
  siteName: 'Example',
  mimeType: 'application/pdf',
}

const entry: SpaceItemActivity = {
  id: 'activity-1',
  space_id: 'space-1',
  org_id: 'org-1',
  item_id: 'task-1',
  user_id: 'user-1',
  event_type: 'comment',
  payload: {
    message:
      '<p>Hello <span class="entity-chip" data-entity-kind="task" data-entity-id="task-2">Task 2</span></p><p>https://example.com/report.pdf</p>',
    previews: [preview],
  },
  created_at: '2026-06-30T08:00:00.000Z',
}

const updatedEntry: SpaceItemActivity = {
  ...entry,
  payload: {
    message: 'Updated comment',
    previews: [preview],
  },
}

describe('TaskActivityComment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    serviceMocks.updateItemComment.mockResolvedValue(updatedEntry)
    serviceMocks.deleteItemComment.mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi.fn(() => Promise.resolve()),
      },
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('edits, deletes, copies, sends to agent, opens previews, and handles entity chip clicks', async () => {
    const onDeleted = vi.fn()
    const onOpenDeliverablePreview = vi.fn()
    const onOpenTaskById = vi.fn()
    const onSendToAgent = vi.fn()
    const onUpdated = vi.fn()
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { rerender } = render(
      <TaskActivityComment
        spaceId="space-1"
        itemId="task-1"
        entry={entry}
        metaLabel="Jordan"
        currentUserId="user-1"
        canEdit
        formatRelativeTime={() => 'just now'}
        onOpenDeliverablePreview={onOpenDeliverablePreview}
        onOpenTaskById={onOpenTaskById}
        onSendToAgent={onSendToAgent}
        onUpdated={onUpdated}
        onDeleted={onDeleted}
      />,
    )

    expect(screen.getByText('Jordan')).toBeInTheDocument()
    expect(screen.getByText('just now')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Task 2'))
    expect(onOpenTaskById).toHaveBeenCalledWith('task-2')

    fireEvent.click(screen.getByRole('button', { name: 'Preview Report PDF' }))
    expect(onOpenDeliverablePreview).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Report PDF',
        file_url: 'https://example.com/report.pdf',
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Copy comment' }))
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      'Hello Task 2https://example.com/report.pdf',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Send to agent' }))
    expect(onSendToAgent).toHaveBeenCalledWith({ html: entry.payload.message })

    fireEvent.click(screen.getByRole('button', { name: 'Edit comment' }))
    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'Updated comment' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(serviceMocks.updateItemComment).toHaveBeenCalledWith(
        'space-1',
        'task-1',
        'activity-1',
        'Updated comment',
      ),
    )
    expect(onUpdated).toHaveBeenCalledWith(updatedEntry)

    fireEvent.click(screen.getByRole('button', { name: 'Delete comment' }))
    await waitFor(() =>
      expect(serviceMocks.deleteItemComment).toHaveBeenCalledWith(
        'space-1',
        'task-1',
        'activity-1',
      ),
    )
    expect(onDeleted).toHaveBeenCalledWith('activity-1')

    rerender(
      <TaskActivityComment
        spaceId="space-1"
        itemId="task-1"
        entry={{ ...entry, payload: { ...entry.payload, message: '<p>Next</p>' } }}
        metaLabel="Jordan"
        currentUserId="user-1"
        canEdit
        formatRelativeTime={() => 'just now'}
        onUpdated={onUpdated}
        onDeleted={onDeleted}
      />,
    )
    expect(screen.getByText('Next')).toBeInTheDocument()
    expect(
      consoleError.mock.calls.some((call) =>
        call.some((part) => String(part).includes('Maximum update depth')),
      ),
    ).toBe(false)
    consoleError.mockRestore()
  })
})
