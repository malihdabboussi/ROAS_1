import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { StandaloneEmailDeliverablePreview } from './StandaloneEmailDeliverablePreview'

const previewMocks = vi.hoisted(() => ({
  fetchEmailArtifact: vi.fn(),
  updateEmailArtifact: vi.fn(),
  editorRenderCount: 0,
}))

function MockEmailPreviewEditor({
  content,
  onContentChange,
  placeholder,
}: {
  content: string
  onContentChange: (html: string) => void
  placeholder?: string
}) {
  previewMocks.editorRenderCount += 1
  return (
    <textarea
      aria-label={placeholder ?? 'Email body'}
      value={content}
      onChange={(event) => onContentChange(event.currentTarget.value)}
    />
  )
}

vi.mock('@/components/artifacts', () => ({
  EmailPreviewEditor: MockEmailPreviewEditor,
}))

vi.mock('@/lib/artifacts', () => ({
  fetchEmailArtifact: previewMocks.fetchEmailArtifact,
  updateEmailArtifact: previewMocks.updateEmailArtifact,
}))

const baseEmail = {
  id: 'email-1',
  subject: 'Launch email',
  body: '<p>Hello</p>',
  status: 'draft',
  campaign_id: 'campaign-1',
  space_id: 'space-1',
  source_item_id: 'task-1',
  user_id: 'user-1',
  created_by: 'user-1',
  created_at: '2026-06-28T08:00:00.000Z',
  updated_at: '2026-06-28T08:00:00.000Z',
}

let currentEmail = { ...baseEmail }

function renderPreview() {
  let renderCount = 0

  function Harness() {
    renderCount += 1
    return <StandaloneEmailDeliverablePreview emailId="email-1" />
  }

  render(<Harness />)
  return { getRenderCount: () => renderCount }
}

describe('StandaloneEmailDeliverablePreview', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    previewMocks.fetchEmailArtifact.mockReset()
    previewMocks.updateEmailArtifact.mockReset()
    previewMocks.editorRenderCount = 0
    currentEmail = { ...baseEmail }
    previewMocks.fetchEmailArtifact.mockResolvedValue(currentEmail)
    previewMocks.updateEmailArtifact.mockImplementation((_emailId, patch) => {
      currentEmail = { ...currentEmail, ...patch }
      return Promise.resolve(currentEmail)
    })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('loads and debounced-saves subject and body without render churn', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { getRenderCount } = renderPreview()

    expect(await screen.findByDisplayValue('Launch email')).toBeTruthy()
    expect(screen.getByLabelText<HTMLTextAreaElement>('Start writing your email...').value).toBe(
      '<p>Hello</p>',
    )

    fireEvent.change(screen.getByDisplayValue('Launch email'), {
      target: { value: 'Updated subject' },
    })
    vi.advanceTimersByTime(800)
    await waitFor(() =>
      expect(previewMocks.updateEmailArtifact).toHaveBeenCalledWith('email-1', {
        subject: 'Updated subject',
        body: '<p>Hello</p>',
      }),
    )

    fireEvent.change(screen.getByLabelText('Start writing your email...'), {
      target: { value: '<p>Updated body</p>' },
    })
    vi.advanceTimersByTime(800)
    await waitFor(() =>
      expect(previewMocks.updateEmailArtifact).toHaveBeenCalledWith('email-1', {
        subject: 'Updated subject',
        body: '<p>Updated body</p>',
      }),
    )

    const renderLoopErrors = consoleErrorSpy.mock.calls.filter(([message]) =>
      String(message).match(/maximum update depth|too many re-renders/i),
    )
    expect(renderLoopErrors).toHaveLength(0)
    expect(getRenderCount()).toBeLessThan(30)
    expect(previewMocks.editorRenderCount).toBeLessThan(30)

    consoleErrorSpy.mockRestore()
  })
})
