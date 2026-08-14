import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { MessageReference } from '../../types'
import { ChatInputReferenceChips } from './chat-input-reference-chips'

afterEach(cleanup)

const references: MessageReference[] = [
  { kind: 'conversation', id: 'conversation-1', label: 'Hidden conversation' },
  {
    kind: 'conversation',
    id: 'conversation-1',
    label: 'Reply to assistant: Launch the client strategy',
    type: 'message:assistant-1',
  },
  { kind: 'artifact', id: 'artifact-local', label: 'Hidden local artifact' },
  { kind: 'artifact', id: 'artifact-cross', label: 'Cross artifact', campaign_id: 'campaign-1' },
  { kind: 'media', id: 'media-1', label: 'Media asset' },
  { kind: 'mission', id: 'mission-1', label: 'Mission item' },
]

describe('ChatInputReferenceChips', () => {
  it('renders visible reference chips and filters hidden kinds', () => {
    render(
      <ChatInputReferenceChips
        references={references}
        chipRowClassName="px-spacing-4"
        onRemove={vi.fn()}
      />,
    )

    expect(screen.queryByText('Hidden conversation')).toBeNull()
    expect(screen.getByText('Reply to assistant: Launch the client strategy')).toBeTruthy()
    expect(screen.queryByText('Hidden local artifact')).toBeNull()
    expect(screen.getByText('Cross artifact').className).toContain('max-w-36')
    expect(screen.getByText('Media asset')).toBeTruthy()
    expect(screen.getByText('Mission item')).toBeTruthy()
  })

  it('delegates chip removal with the selected reference', () => {
    const onRemove = vi.fn()
    render(
      <ChatInputReferenceChips
        references={references}
        chipRowClassName="px-spacing-4"
        onRemove={onRemove}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Remove Media asset' }))
    expect(onRemove).toHaveBeenCalledWith(expect.objectContaining({ kind: 'media', id: 'media-1' }))
  })

  it('renders nothing when no visible references remain', () => {
    const { container } = render(
      <ChatInputReferenceChips
        references={[references[0]!]}
        chipRowClassName="px-spacing-4"
        onRemove={vi.fn()}
      />,
    )

    expect(container.firstChild).toBeNull()
  })
})
