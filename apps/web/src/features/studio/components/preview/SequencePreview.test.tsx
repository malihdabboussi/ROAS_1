import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { SequencePreview } from './SequencePreview'

const serviceMocks = vi.hoisted(() => ({
  createSequenceEmail: vi.fn(),
  fetchSequence: vi.fn(),
  updateSequence: vi.fn(),
  updateSequenceEmail: vi.fn(),
}))

const childRenderCounts = vi.hoisted(() => ({
  editor: 0,
  title: 0,
  menu: 0,
}))

vi.mock('../../services/artifact-preview.service', () => serviceMocks)

vi.mock('./EmailPreviewEditor', () => ({
  EmailPreviewEditor: ({
    content,
    onContentChange,
    placeholder,
  }: {
    content: string
    onContentChange: (html: string) => void
    placeholder?: string
  }) => {
    childRenderCounts.editor += 1
    return (
      <textarea
        aria-label={placeholder ?? 'Email body'}
        value={content}
        onChange={(event) => onContentChange(event.currentTarget.value)}
      />
    )
  },
}))

vi.mock('./InlineEditableArtifactTitle', () => ({
  InlineEditableArtifactTitle: ({
    value,
    placeholder,
  }: {
    value: string
    placeholder: string
    onCommit: (next: string) => void | Promise<void>
  }) => {
    childRenderCounts.title += 1
    return <span>{value || placeholder}</span>
  },
}))

vi.mock('./StudioSequenceMenuDropdown', () => ({
  StudioSequenceMenuDropdown: () => {
    childRenderCounts.menu += 1
    return <div data-testid="sequence-menu" />
  },
}))

const baseSequence = {
  id: 'sequence-1',
  user_id: 'user-1',
  campaign_id: 'campaign-1',
  space_id: null,
  name: 'Launch Sequence',
  status: 'draft' as const,
  trigger: {},
  config: {},
  metrics: {},
  created_at: '2026-06-01T00:00:00.000Z',
  updated_at: '2026-06-01T00:00:00.000Z',
  sequence_emails: [
    {
      id: 'email-1',
      sequence_id: 'sequence-1',
      subject: 'Welcome A',
      body: '<p>Welcome body</p>',
      delay_hours: 0,
      order_index: 0,
      status: 'draft' as const,
      created_at: '2026-06-01T00:00:00.000Z',
    },
    {
      id: 'email-2',
      sequence_id: 'sequence-1',
      subject: 'Follow-up B',
      body: '<p>Follow-up body</p>',
      delay_hours: 24,
      order_index: 1,
      status: 'ready' as const,
      created_at: '2026-06-01T00:00:00.000Z',
    },
  ],
}

const sequenceWithAddedEmail = {
  ...baseSequence,
  sequence_emails: [
    ...baseSequence.sequence_emails,
    {
      id: 'email-3',
      sequence_id: 'sequence-1',
      subject: 'New email',
      body: '',
      delay_hours: 48,
      order_index: 2,
      status: 'draft' as const,
      created_at: '2026-06-01T00:00:00.000Z',
    },
  ],
}

describe('SequencePreview', () => {
  beforeEach(() => {
    serviceMocks.createSequenceEmail.mockReset()
    serviceMocks.fetchSequence.mockReset()
    serviceMocks.updateSequence.mockReset()
    serviceMocks.updateSequenceEmail.mockReset()
    serviceMocks.updateSequenceEmail.mockResolvedValue({})
    childRenderCounts.editor = 0
    childRenderCounts.title = 0
    childRenderCounts.menu = 0
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('loads, navigates, adds an email, and stays render-stable', async () => {
    serviceMocks.fetchSequence
      .mockResolvedValueOnce(baseSequence)
      .mockResolvedValueOnce(sequenceWithAddedEmail)
    serviceMocks.createSequenceEmail.mockResolvedValue({
      id: 'email-3',
      sequence_id: 'sequence-1',
      order_index: 2,
    })

    render(<SequencePreview sequenceId="sequence-1" />)

    expect(await screen.findByText('Launch Sequence')).toBeTruthy()
    expect(screen.getByText('Welcome A')).toBeTruthy()
    expect((screen.getByLabelText('Start writing your email...') as HTMLTextAreaElement).value).toBe(
      '<p>Welcome body</p>',
    )

    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(await screen.findByText('Follow-up B')).toBeTruthy()
    expect((screen.getByLabelText('Start writing your email...') as HTMLTextAreaElement).value).toBe(
      '<p>Follow-up body</p>',
    )

    fireEvent.click(screen.getByText('Add email'))

    await waitFor(() => {
      expect(serviceMocks.createSequenceEmail).toHaveBeenCalledWith('sequence-1')
      expect(serviceMocks.fetchSequence).toHaveBeenCalledTimes(2)
    })
    expect(await screen.findByText('New email')).toBeTruthy()
    expect((screen.getByLabelText('Start writing your email...') as HTMLTextAreaElement).value).toBe(
      '',
    )

    expect(childRenderCounts.editor).toBeLessThan(20)
    expect(childRenderCounts.title).toBeLessThan(40)
    expect(childRenderCounts.menu).toBe(0)
  })
})
