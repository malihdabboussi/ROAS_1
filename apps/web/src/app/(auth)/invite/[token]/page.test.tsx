import { Profiler, type MouseEvent, type ReactNode } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import OrgInviteAcceptPage from './page'

const mocks = vi.hoisted(() => ({
  token: 'invite-token',
  searchParams: new URLSearchParams(),
  replace: vi.fn(),
  getUser: vi.fn(),
  signInWithOAuth: vi.fn(),
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  getInvitationByToken: vi.fn(),
  acceptInvitationAndBootstrap: vi.fn(),
  fetchMemberships: vi.fn(),
  setActiveOrg: vi.fn(),
  reportClientError: vi.fn(),
  clearOrgSensitiveState: vi.fn(),
}))

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    onClick,
    ...props
  }: {
    href: string
    children: ReactNode
    onClick?: (event: MouseEvent<HTMLAnchorElement>) => void
    [key: string]: unknown
  }) => (
    <a href={href} onClick={onClick} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('next/navigation', () => ({
  useParams: () => ({ token: mocks.token }),
  useRouter: () => ({ replace: mocks.replace }),
  useSearchParams: () => mocks.searchParams,
}))

vi.mock('@/components/auth/auth-orb-shell', () => ({
  AuthOrbShell: ({ children }: { children: ReactNode }) => (
    <div data-testid="auth-orb-shell">{children}</div>
  ),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: mocks.getUser,
      signInWithOAuth: mocks.signInWithOAuth,
      signUp: mocks.signUp,
      signInWithPassword: mocks.signInWithPassword,
    },
  }),
}))

vi.mock('@/lib/org', () => ({
  orgService: {
    getInvitationByToken: mocks.getInvitationByToken,
    acceptInvitationAndBootstrap: mocks.acceptInvitationAndBootstrap,
  },
  useOrgStore: () => ({
    fetchMemberships: mocks.fetchMemberships,
    setActiveOrg: mocks.setActiveOrg,
  }),
}))

vi.mock('@/lib/log-client-error', () => ({
  reportClientError: mocks.reportClientError,
}))

vi.mock('@/lib/utils/clear-org-state', () => ({
  clearOrgSensitiveState: mocks.clearOrgSensitiveState,
}))

function invitationFixture() {
  return {
    id: 'invite-1',
    org_id: 'org-1',
    email: 'mira@example.com',
    role: 'admin',
    status: 'pending',
    expires_at: '2099-01-01T00:00:00.000Z',
    created_at: '2026-06-30T00:00:00.000Z',
    organizations: {
      id: 'org-1',
      name: 'Acme Org',
      slug: 'acme',
      avatar_url: null,
      account_type: 'team',
      status: 'active',
      owner_id: 'user-owner',
      created_at: '2026-06-30T00:00:00.000Z',
    },
  }
}

describe('OrgInviteAcceptPage', () => {
  beforeEach(() => {
    mocks.token = 'invite-token'
    mocks.searchParams = new URLSearchParams()
    mocks.getUser.mockResolvedValue({ data: { user: null } })
    mocks.getInvitationByToken.mockResolvedValue({
      success: true,
      invitation: invitationFixture(),
    })
    mocks.acceptInvitationAndBootstrap.mockResolvedValue({
      success: true,
      org_id: 'org-1',
      role: 'admin',
      requires_machine_setup: false,
    })
    mocks.fetchMemberships.mockResolvedValue(undefined)
    mocks.signUp.mockResolvedValue({
      data: {
        session: { access_token: 'token' },
        user: { identities: [{ id: 'identity-1' }], email_confirmed_at: null },
      },
      error: null,
    })
    localStorage.clear()
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('renders the signed-out invite form and settles without render churn', async () => {
    let commits = 0

    render(
      <Profiler id="org-invite-accept" onRender={() => (commits += 1)}>
        <OrgInviteAcceptPage />
      </Profiler>,
    )

    await screen.findByText('Acme Org')

    expect(screen.getByRole('heading', { name: 'ORGANIZATION INVITE' })).toBeInTheDocument()
    expect(screen.getByText('admin')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign up with Google' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('you@domain.com')).toBeInTheDocument()
    await waitFor(() => expect(commits).toBeLessThan(20))
  })

  it('creates an email account and bootstraps the accepted org invite', async () => {
    render(<OrgInviteAcceptPage />)

    await screen.findByText('Acme Org')

    fireEvent.change(screen.getByPlaceholderText('you@domain.com'), {
      target: { value: 'mira@example.com' },
    })
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'safe-password' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))

    await waitFor(() => expect(mocks.signUp).toHaveBeenCalled())
    await waitFor(() =>
      expect(mocks.acceptInvitationAndBootstrap).toHaveBeenCalledWith('invite-token'),
    )
    expect(mocks.fetchMemberships).toHaveBeenCalled()
    expect(mocks.setActiveOrg).toHaveBeenCalledWith('org-1')
    expect(mocks.clearOrgSensitiveState).toHaveBeenCalled()
    expect(mocks.replace).toHaveBeenCalledWith('/home')
  })

  it('auto-bootstraps a logged-in user when returning from auth callback', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mocks.searchParams = new URLSearchParams('bootstrap=1')

    render(<OrgInviteAcceptPage />)

    await waitFor(() =>
      expect(mocks.acceptInvitationAndBootstrap).toHaveBeenCalledWith('invite-token'),
    )
    expect(mocks.fetchMemberships).toHaveBeenCalled()
    expect(mocks.setActiveOrg).toHaveBeenCalledWith('org-1')
    expect(mocks.clearOrgSensitiveState).toHaveBeenCalled()
    expect(mocks.replace).toHaveBeenCalledWith('/home')
  })

  it('shows a recoverable error when invite acceptance is rejected', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mocks.acceptInvitationAndBootstrap.mockResolvedValue({
      success: false,
      org_id: '',
      role: '',
    })

    render(<OrgInviteAcceptPage />)

    await screen.findByText('Acme Org')
    fireEvent.click(screen.getByRole('button', { name: 'Accept Invitation' }))

    expect(await screen.findByRole('heading', { name: 'INVITATION ERROR' })).toBeInTheDocument()
    expect(
      screen.getByText("I couldn't accept that invitation. Try again in a moment."),
    ).toBeInTheDocument()
    expect(mocks.replace).not.toHaveBeenCalled()
  })
})
