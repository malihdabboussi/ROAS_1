import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FunnelCommentsChatView } from './FunnelCommentsChatView'
import { PresentationCommentsChatView } from './PresentationCommentsChatView'
import type { FunnelComment, PresentationComment } from '@/lib/artifacts/artifact-types'

vi.mock('./PresentationCommentComposer', () => ({
  PresentationCommentComposer: ({
    onSend,
    placeholder,
  }: {
    onSend: (text: string) => void
    placeholder?: string
  }) => (
    <button type="button" onClick={() => onSend('  New note  ')}>
      {placeholder}
    </button>
  ),
}))

const requestAnimationFrameMock = vi.fn((callback: FrameRequestCallback) => {
  callback(0)
  return 1
})

describe('comments chat views', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', requestAnimationFrameMock)
    HTMLElement.prototype.scrollTo = vi.fn()
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('renders and delegates presentation comment actions', () => {
    const comments: PresentationComment[] = [
      {
        id: 'presentation-open',
        presentation_id: 'presentation-1',
        slide_index: 1,
        body: 'Tighten this headline',
        author_name: 'Alice',
        created_at: '2026-06-21T00:00:00.000Z',
        resolved: false,
        save_status: 'saving',
      },
      {
        id: 'presentation-resolved',
        presentation_id: 'presentation-1',
        slide_index: null,
        body: 'Already fixed',
        author_name: 'Bob',
        created_at: '2026-06-21T00:01:00.000Z',
        resolved: true,
      },
    ]
    const onAddComment = vi.fn()
    const onResolveComment = vi.fn()
    const onSendCommentsToVibe = vi.fn()
    const onBack = vi.fn()

    render(
      <PresentationCommentsChatView
        presentationName="Investor Deck"
        comments={comments}
        onAddComment={onAddComment}
        onResolveComment={onResolveComment}
        onSendCommentsToVibe={onSendCommentsToVibe}
        onBack={onBack}
      />,
    )

    expect(screen.getByText('Investor Deck')).toBeTruthy()
    expect(screen.getByText('Alice')).toBeTruthy()
    expect(screen.getByText('Slide 2')).toBeTruthy()
    expect(screen.getByText('Tighten this headline')).toBeTruthy()
    expect(screen.queryByText('Already fixed')).toBeNull()
    expect(screen.getByText('1 resolved comment hidden')).toBeTruthy()
    expect(screen.getByText('Saving...')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Send to Pixel' })).toBeNull()

    fireEvent.click(screen.getByRole('checkbox', { name: /Alice/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Send to Pixel' }))
    expect(onSendCommentsToVibe).toHaveBeenCalledWith([comments[0]])

    fireEvent.click(screen.getByRole('button', { name: 'Resolve' }))
    expect(onResolveComment).toHaveBeenCalledWith('presentation-open', true)

    fireEvent.click(screen.getByRole('button', { name: 'Add a comment...' }))
    expect(onAddComment).toHaveBeenCalledWith('New note')

    fireEvent.click(screen.getByRole('button', { name: 'Back to conversation' }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('renders and delegates funnel comment actions', () => {
    const comments: FunnelComment[] = [
      {
        id: 'funnel-open',
        funnel_id: 'funnel-1',
        funnel_page_id: 'page-123456789',
        body: 'Move this CTA above the fold',
        author_name: 'Chris',
        created_at: '2026-06-21T00:00:00.000Z',
        resolved: false,
      },
      {
        id: 'funnel-resolved',
        funnel_id: 'funnel-1',
        funnel_page_id: null,
        body: 'Resolved funnel note',
        author_name: 'Dana',
        created_at: '2026-06-21T00:01:00.000Z',
        resolved: true,
      },
    ]
    const onAddComment = vi.fn()
    const onResolveComment = vi.fn()
    const onSendCommentsToVibe = vi.fn()

    render(
      <FunnelCommentsChatView
        funnelName="Launch Funnel"
        comments={comments}
        onAddComment={onAddComment}
        onResolveComment={onResolveComment}
        onSendCommentsToVibe={onSendCommentsToVibe}
        onBack={vi.fn()}
      />,
    )

    expect(screen.getByText('Launch Funnel')).toBeTruthy()
    expect(screen.getByText('Chris')).toBeTruthy()
    expect(screen.getByText('Page page-123')).toBeTruthy()
    expect(screen.getByText('Move this CTA above the fold')).toBeTruthy()
    expect(screen.queryByText('Resolved funnel note')).toBeNull()
    expect(screen.getByText('1 resolved comment hidden')).toBeTruthy()

    fireEvent.click(screen.getByRole('checkbox', { name: /Chris/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Send to Pixel' }))
    expect(onSendCommentsToVibe).toHaveBeenCalledWith([comments[0]])

    fireEvent.click(screen.getByRole('button', { name: 'Resolve' }))
    expect(onResolveComment).toHaveBeenCalledWith('funnel-open', true)

    fireEvent.click(screen.getByRole('button', { name: 'Add a comment...' }))
    expect(onAddComment).toHaveBeenCalledWith('New note')
  })

  it('renders the empty state when no comments are open', () => {
    render(
      <PresentationCommentsChatView
        presentationName="Investor Deck"
        comments={[
          {
            id: 'resolved',
            presentation_id: 'presentation-1',
            slide_index: null,
            body: 'Done',
            author_name: 'Alice',
            created_at: '2026-06-21T00:00:00.000Z',
            resolved: true,
          },
        ]}
        onAddComment={vi.fn()}
        onResolveComment={vi.fn()}
        onSendCommentsToVibe={vi.fn()}
        onBack={vi.fn()}
      />,
    )

    expect(screen.getByText('No open comments')).toBeTruthy()
    expect(screen.getByText('1 resolved comment hidden')).toBeTruthy()
  })
})
