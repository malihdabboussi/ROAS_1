import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { EmailArtifactSendDialog } from './EmailArtifactSendDialog'

const dialogMocks = vi.hoisted(() => ({
  backendGet: vi.fn(),
  fetchContacts: vi.fn(),
  listSenderIdentities: vi.fn(),
  openWorkspaceSettings: vi.fn(),
  sendCampaignEmailArtifact: vi.fn(),
  sendContactEmail: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}))

vi.mock('@/lib/api/backend-client', () => ({
  backendGet: dialogMocks.backendGet,
}))

vi.mock('@/lib/contacts/contacts-api', () => ({
  fetchContacts: dialogMocks.fetchContacts,
}))

vi.mock('@/lib/email', () => ({
  senderIdentitiesApi: {
    list: dialogMocks.listSenderIdentities,
  },
}))

vi.mock('@/lib/settings', () => ({
  useWorkspaceSettingsModal: () => ({
    openWorkspaceSettings: dialogMocks.openWorkspaceSettings,
  }),
}))

vi.mock('@/features/spaces/services/contact-communications.service', () => ({
  sendContactEmail: dialogMocks.sendContactEmail,
}))

vi.mock('@/lib/artifacts', () => ({
  sendCampaignEmailArtifact: dialogMocks.sendCampaignEmailArtifact,
}))

vi.mock('@/components/vibey/vibey-loading-orb', () => ({
  VibeyLoadingOrb: () => <div>Loading send options</div>,
}))

vi.mock('@/features/spaces/components/cells/date-picker/SpacesScheduleDateTimeModal', () => ({
  SpacesScheduleDateTimeModal: ({ open }: { open: boolean }) =>
    open ? <div data-testid="schedule-modal" /> : null,
}))

vi.mock('sonner', () => ({
  toast: {
    error: dialogMocks.toastError,
    success: dialogMocks.toastSuccess,
  },
}))

const email = {
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
} as const

function renderDialog() {
  let renderCount = 0
  const onClose = vi.fn()
  const onSent = vi.fn()

  function Harness() {
    renderCount += 1
    return (
      <EmailArtifactSendDialog
        email={email}
        subject="Launch email"
        body="<p>Hello</p>"
        open
        onClose={onClose}
        onSent={onSent}
      />
    )
  }

  render(<Harness />)

  return {
    getRenderCount: () => renderCount,
    onClose,
    onSent,
  }
}

describe('EmailArtifactSendDialog', () => {
  beforeEach(() => {
    dialogMocks.backendGet.mockReset()
    dialogMocks.fetchContacts.mockReset()
    dialogMocks.listSenderIdentities.mockReset()
    dialogMocks.openWorkspaceSettings.mockReset()
    dialogMocks.sendCampaignEmailArtifact.mockReset()
    dialogMocks.sendContactEmail.mockReset()
    dialogMocks.toastError.mockReset()
    dialogMocks.toastSuccess.mockReset()

    dialogMocks.listSenderIdentities.mockResolvedValue({
      senderIdentities: [
        {
          id: 'identity-1',
          email: 'sender@example.com',
          display_name: 'Sender',
          is_default: true,
          is_verified: true,
        },
      ],
    })
    dialogMocks.fetchContacts.mockResolvedValue({
      data: [
        {
          id: 'contact-1',
          first_name: 'Ada',
          last_name: 'Lovelace',
          email: 'ada@example.com',
        },
      ],
    })
    dialogMocks.backendGet.mockImplementation((url: string) => {
      if (url === '/api/email-campaigns/providers') {
        return Promise.resolve({
          success: true,
          providers: [
            {
              provider: 'mailchimp',
              display_name: 'Mailchimp',
              supports_broadcast: true,
            },
          ],
        })
      }
      if (url.startsWith('/api/email-campaigns/provider-senders')) {
        return Promise.resolve({
          success: true,
          senders: [{ id: 'sender-1', name: 'Marketing', email: 'marketing@example.com' }],
        })
      }
      if (url.startsWith('/api/email-campaigns/provider-audiences')) {
        return Promise.resolve({
          success: true,
          lists: [{ id: 'list-1', name: 'Launch List' }],
          segments: [{ id: 'segment-1', name: 'VIP Segment' }],
        })
      }
      return Promise.reject(new Error(`Unexpected URL: ${url}`))
    })
    dialogMocks.sendCampaignEmailArtifact.mockResolvedValue({
      success: true,
      send_type: 'broadcast',
      provider: 'mailchimp',
    })
    dialogMocks.sendContactEmail.mockResolvedValue(undefined)
  })

  afterEach(() => {
    cleanup()
  })

  it('sends the current email to selected contacts and provider lists without render churn', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { getRenderCount, onClose, onSent } = renderDialog()

    expect(await screen.findByText('People')).toBeTruthy()

    const peopleInput = screen.getByPlaceholderText('Search contacts...')
    fireEvent.focus(peopleInput)
    fireEvent.click(await screen.findByText('Ada Lovelace'))
    expect(screen.getByText('ada@example.com')).toBeTruthy()

    fireEvent.click(screen.getByLabelText('Add list'))
    await waitFor(() => expect(screen.getByPlaceholderText('Search lists...')).toBeTruthy())
    const listInput = screen.getByPlaceholderText('Search lists...')
    fireEvent.focus(listInput)
    fireEvent.click(await screen.findByText('Launch List'))

    fireEvent.click(screen.getByRole('button', { name: 'Send email' }))

    await waitFor(() =>
      expect(dialogMocks.sendContactEmail).toHaveBeenCalledWith('contact-1', {
        subject: 'Launch email',
        body: '<p>Hello</p>',
        from_identity_id: 'identity-1',
      }),
    )
    expect(dialogMocks.sendCampaignEmailArtifact).toHaveBeenCalledWith({
      email_id: 'email-1',
      provider: 'mailchimp',
      list_id: 'list-1',
      segment_id: undefined,
      from_email: 'marketing@example.com',
      from_name: 'Marketing',
      schedule_date: undefined,
    })
    expect(dialogMocks.toastSuccess).toHaveBeenCalledWith('Email send started')
    expect(onSent).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)

    const renderLoopErrors = consoleErrorSpy.mock.calls.filter(([message]) =>
      String(message).match(/maximum update depth|too many re-renders/i),
    )
    expect(renderLoopErrors).toHaveLength(0)
    expect(getRenderCount()).toBeLessThan(40)

    consoleErrorSpy.mockRestore()
  })
})
