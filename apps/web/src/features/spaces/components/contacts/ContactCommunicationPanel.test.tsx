import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ContactCommunicationPanel } from './ContactCommunicationPanel'

const panelMocks = vi.hoisted(() => ({
  fetchContactConversations: vi.fn(),
  fetchContactEmails: vi.fn(),
  sendContactEmail: vi.fn(),
  editorRenderCount: 0,
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}))

function MockEmailPreviewEditor({
  content,
  footer,
  onContentChange,
  placeholder,
}: {
  content: string
  footer?: ReactNode
  onContentChange: (html: string) => void
  placeholder?: string
}) {
  panelMocks.editorRenderCount += 1
  return (
    <div>
      <textarea
        aria-label={placeholder ?? 'Email body'}
        value={content}
        onChange={(event) => onContentChange(event.currentTarget.value)}
      />
      {footer}
    </div>
  )
}

vi.mock('@/components/artifacts', () => ({
  EmailPreviewEditor: MockEmailPreviewEditor,
}))

vi.mock('@/lib/properties/use-custom-fields', () => ({
  useCustomFields: () => ({ fields: [] }),
}))

vi.mock('../../services/contact-communications.service', () => ({
  fetchContactConversations: panelMocks.fetchContactConversations,
  fetchContactEmail: vi.fn(),
  fetchContactEmails: panelMocks.fetchContactEmails,
  linkConversationToContact: vi.fn(),
  sendContactEmail: panelMocks.sendContactEmail,
}))

vi.mock('sonner', () => ({
  toast: {
    error: panelMocks.toastError,
    success: panelMocks.toastSuccess,
  },
}))

const contact = {
  id: 'contact-1',
  first_name: 'Ada',
  last_name: 'Lovelace',
  email: 'ada@example.com',
} as never

function renderPanel() {
  let renderCount = 0
  const onLoaded = vi.fn()

  function Harness() {
    renderCount += 1
    return (
      <ContactCommunicationPanel
        contactId="contact-1"
        contact={contact}
        communicationTab="all"
        onLoaded={onLoaded}
      />
    )
  }

  render(<Harness />)
  return { getRenderCount: () => renderCount, onLoaded }
}

describe('ContactCommunicationPanel', () => {
  beforeEach(() => {
    panelMocks.fetchContactConversations.mockReset()
    panelMocks.fetchContactEmails.mockReset()
    panelMocks.sendContactEmail.mockReset()
    panelMocks.toastError.mockReset()
    panelMocks.toastSuccess.mockReset()
    panelMocks.editorRenderCount = 0

    panelMocks.fetchContactEmails.mockResolvedValue({ emails: [] })
    panelMocks.fetchContactConversations.mockResolvedValue({
      conversations: [],
      suggested_conversations: [],
    })
    panelMocks.sendContactEmail.mockResolvedValue({
      email: {
        id: 'email-1',
        subject: 'Launch note',
        html_body: '<p>Hello Ada</p>',
        status: 'sent',
        sent_at: '2026-06-28T09:00:00.000Z',
        created_at: '2026-06-28T09:00:00.000Z',
        events: [],
      },
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('opens the email composer and sends a contact email without render churn', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { getRenderCount, onLoaded } = renderPanel()

    await waitFor(() => expect(onLoaded).toHaveBeenCalledTimes(1))
    fireEvent.click(screen.getByRole('button', { name: 'Email' }))
    fireEvent.change(screen.getByPlaceholderText('Email subject'), {
      target: { value: 'Launch note' },
    })
    fireEvent.change(screen.getByLabelText('Write email body…'), {
      target: { value: '<p>Hello Ada</p>' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send email' }))

    await waitFor(() =>
      expect(panelMocks.sendContactEmail).toHaveBeenCalledWith('contact-1', {
        subject: 'Launch note',
        body: '<p>Hello Ada</p>',
      }),
    )
    expect(panelMocks.toastSuccess).toHaveBeenCalledWith('Email sent')
    expect(await screen.findByText('Launch note')).toBeTruthy()

    const renderLoopErrors = consoleErrorSpy.mock.calls.filter(([message]) =>
      String(message).match(/maximum update depth|too many re-renders/i),
    )
    expect(renderLoopErrors).toHaveLength(0)
    expect(getRenderCount()).toBeLessThan(40)
    expect(panelMocks.editorRenderCount).toBeLessThan(30)

    consoleErrorSpy.mockRestore()
  })
})
