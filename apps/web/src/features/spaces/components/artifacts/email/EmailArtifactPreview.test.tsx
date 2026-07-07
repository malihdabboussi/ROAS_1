import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { EmailArtifactPreview } from './EmailArtifactPreview'

const artifactApiMocks = vi.hoisted(() => ({
  fetchEmailArtifact: vi.fn(),
  updateEmailArtifact: vi.fn(),
}))

const exportMocks = vi.hoisted(() => ({
  exportEmailArtifactPdf: vi.fn(),
}))

const editorRenderCounts = vi.hoisted(() => ({
  editor: 0,
  title: 0,
  menu: 0,
  sendDialog: 0,
  reset() {
    this.editor = 0
    this.title = 0
    this.menu = 0
    this.sendDialog = 0
  },
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
  editorRenderCounts.editor += 1
  return (
    <textarea
      aria-label={placeholder ?? 'Email body'}
      value={content}
      onChange={(event) => onContentChange(event.currentTarget.value)}
    />
  )
}

function MockInlineEditableArtifactTitle({
  value,
  placeholder,
  onCommit,
}: {
  value: string
  placeholder: string
  onCommit: (next: string) => void | Promise<void>
}) {
  editorRenderCounts.title += 1
  return (
    <button type="button" onClick={() => void onCommit('Updated subject')}>
      {value || placeholder}
    </button>
  )
}

vi.mock('@/components/artifacts', () => ({
  EmailPreviewEditor: MockEmailPreviewEditor,
  InlineEditableArtifactTitle: MockInlineEditableArtifactTitle,
}))

vi.mock('@/features/studio/components/preview/EmailPreviewEditor', () => ({
  EmailPreviewEditor: MockEmailPreviewEditor,
}))

vi.mock('@/features/studio/components/preview/InlineEditableArtifactTitle', () => ({
  InlineEditableArtifactTitle: MockInlineEditableArtifactTitle,
}))

vi.mock('@/features/studio/services/artifact-preview.service', () => ({
  fetchEmailArtifact: artifactApiMocks.fetchEmailArtifact,
  updateEmailArtifact: artifactApiMocks.updateEmailArtifact,
}))

vi.mock('@/lib/artifacts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/artifacts')>()
  return {
    ...actual,
    ARTIFACT_INLINE_ERRORS: { SAVE_EMAIL: "Couldn't save email. Try again." },
    fetchEmailArtifact: artifactApiMocks.fetchEmailArtifact,
    updateEmailArtifact: artifactApiMocks.updateEmailArtifact,
  }
})

vi.mock('@/components/vibey/vibey-loading-orb', () => ({
  VibeyLoadingOrb: ({ text }: { text?: string }) => <div>{text}</div>,
}))

vi.mock('./EmailMenuDropdown', () => ({
  EmailMenuDropdown: ({
    email,
    onClose,
  }: {
    email: { id: string; subject: string | null }
    onClose: () => void
  }) => {
    editorRenderCounts.menu += 1
    return (
      <div data-testid="email-menu">
        <span>{email.subject}</span>
        <button type="button" onClick={onClose}>
          close menu
        </button>
      </div>
    )
  },
}))

vi.mock('./EmailArtifactSendDialog', () => ({
  EmailArtifactSendDialog: ({ open, subject }: { open: boolean; subject: string }) => {
    editorRenderCounts.sendDialog += 1
    return open ? <div data-testid="send-dialog">{subject}</div> : null
  },
}))

vi.mock('./export-email-artifact-pdf', () => ({
  exportEmailArtifactPdf: exportMocks.exportEmailArtifactPdf,
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

const baseEmail = {
  id: 'email-1',
  subject: 'Launch email',
  body: '<p>Hello there</p>',
  campaign_id: 'campaign-1',
  source_item_id: 'task-1',
  space_id: 'space-1',
}

let currentEmail = { ...baseEmail }

function renderPreview() {
  let renderCount = 0

  function Harness() {
    renderCount += 1
    return <EmailArtifactPreview emailId="email-1" />
  }

  render(<Harness />)
  return { getRenderCount: () => renderCount }
}

describe('EmailArtifactPreview', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    editorRenderCounts.reset()
    artifactApiMocks.fetchEmailArtifact.mockReset()
    artifactApiMocks.updateEmailArtifact.mockReset()
    exportMocks.exportEmailArtifactPdf.mockReset()
    currentEmail = { ...baseEmail }
    artifactApiMocks.fetchEmailArtifact.mockImplementation(() => Promise.resolve(currentEmail))
    artifactApiMocks.updateEmailArtifact.mockImplementation((_emailId, patch) => {
      currentEmail = { ...currentEmail, ...patch }
      return Promise.resolve(currentEmail)
    })
    exportMocks.exportEmailArtifactPdf.mockResolvedValue(undefined)
  })

  afterEach(() => {
    cleanup()
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('loads the current email and wires subject, body, menu, send, and export actions', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { getRenderCount } = renderPreview()

    expect(screen.getByText('Loading email draft...')).toBeTruthy()
    expect(await screen.findByText('Launch email')).toBeTruthy()
    expect(screen.getByLabelText<HTMLTextAreaElement>('Start writing your email...').value).toBe(
      '<p>Hello there</p>',
    )

    fireEvent.click(screen.getByText('Launch email'))
    await waitFor(() =>
      expect(artifactApiMocks.updateEmailArtifact).toHaveBeenCalledWith('email-1', {
        subject: 'Updated subject',
      }),
    )

    fireEvent.change(screen.getByLabelText('Start writing your email...'), {
      target: { value: '<p>Updated body</p>' },
    })
    expect(artifactApiMocks.updateEmailArtifact).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(1000)
    await waitFor(() =>
      expect(artifactApiMocks.updateEmailArtifact).toHaveBeenCalledWith('email-1', {
        body: '<p>Updated body</p>',
      }),
    )

    fireEvent.click(screen.getByLabelText('Email options'))
    expect(screen.getByTestId('email-menu')).toBeTruthy()

    fireEvent.click(screen.getByLabelText('Send email'))
    expect(screen.getByTestId('send-dialog').textContent).toContain('Updated subject')

    fireEvent.click(screen.getByLabelText('Download as PDF'))
    await waitFor(() =>
      expect(exportMocks.exportEmailArtifactPdf).toHaveBeenCalledWith(
        'Updated subject',
        '<p>Updated body</p>',
      ),
    )

    const renderLoopErrors = consoleErrorSpy.mock.calls.filter(([message]) =>
      String(message).match(/maximum update depth|too many re-renders/i),
    )
    expect(renderLoopErrors).toHaveLength(0)
    expect(getRenderCount()).toBeLessThan(20)
    expect(editorRenderCounts.editor).toBeLessThan(20)

    consoleErrorSpy.mockRestore()
  })
})
