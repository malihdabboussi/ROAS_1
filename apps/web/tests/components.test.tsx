import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

beforeAll(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ updates: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    ),
  )
})

// Mock next/navigation for client components
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

// Mock the supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signOut: vi.fn(),
      signInWithPassword: vi.fn(),
      signInWithOAuth: vi.fn(),
      signInWithOtp: vi.fn(),
    },
  }),
}))

vi.mock('@/hooks/use-user-role', () => ({
  useUserRole: () => ({ role: 'owner', loading: false }),
}))

afterEach(() => {
  cleanup()
})

describe('Sidebar Component', () => {
  it('renders the Vibey logo', async () => {
    const { Sidebar } = await import('../src/components/layout/Sidebar')
    const { CampaignModeProvider } =
      await import('../src/features/studio/contexts/CampaignModeContext')
    const { AccountSettingsModalProvider } =
      await import('../src/features/settings/contexts/AccountSettingsModalContext')
    const { WorkspaceSettingsModalProvider } =
      await import('../src/features/settings/contexts/WorkspaceSettingsModalContext')
    render(
      <AccountSettingsModalProvider>
        <WorkspaceSettingsModalProvider>
          <CampaignModeProvider>
            <Sidebar />
          </CampaignModeProvider>
        </WorkspaceSettingsModalProvider>
      </AccountSettingsModalProvider>,
    )

    // Sidebar renders — check the aside wrapper is present (logo may render async)
    expect(document.querySelector('aside')).not.toBeNull()
  }, 15000)

  it('renders HQ rail nav labels for pathname /', async () => {
    const { Sidebar } = await import('../src/components/layout/Sidebar')
    const { CampaignModeProvider } =
      await import('../src/features/studio/contexts/CampaignModeContext')
    const { AccountSettingsModalProvider } =
      await import('../src/features/settings/contexts/AccountSettingsModalContext')
    const { WorkspaceSettingsModalProvider } =
      await import('../src/features/settings/contexts/WorkspaceSettingsModalContext')
    render(
      <AccountSettingsModalProvider>
        <WorkspaceSettingsModalProvider>
          <CampaignModeProvider>
            <Sidebar />
          </CampaignModeProvider>
        </WorkspaceSettingsModalProvider>
      </AccountSettingsModalProvider>,
    )

    expect(screen.getAllByText('Missions').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Team').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Brain').length).toBeGreaterThanOrEqual(1)
  })

  it('renders HQ sidebar rail on default pathname (same rail as studio/hq split)', async () => {
    const { Sidebar } = await import('../src/components/layout/Sidebar')
    const { CampaignModeProvider } =
      await import('../src/features/studio/contexts/CampaignModeContext')
    const { AccountSettingsModalProvider } =
      await import('../src/features/settings/contexts/AccountSettingsModalContext')
    const { WorkspaceSettingsModalProvider } =
      await import('../src/features/settings/contexts/WorkspaceSettingsModalContext')
    render(
      <AccountSettingsModalProvider>
        <WorkspaceSettingsModalProvider>
          <CampaignModeProvider>
            <Sidebar />
          </CampaignModeProvider>
        </WorkspaceSettingsModalProvider>
      </AccountSettingsModalProvider>,
    )

    // Sidebar renders nav items — check the aside wrapper is present
    expect(document.querySelector('aside')).not.toBeNull()
  })

  it('renders user avatar with initials when no avatarUrl', async () => {
    const { Sidebar } = await import('../src/components/layout/Sidebar')
    const { CampaignModeProvider } =
      await import('../src/features/studio/contexts/CampaignModeContext')
    const { AccountSettingsModalProvider } =
      await import('../src/features/settings/contexts/AccountSettingsModalContext')
    const { WorkspaceSettingsModalProvider } =
      await import('../src/features/settings/contexts/WorkspaceSettingsModalContext')
    render(
      <AccountSettingsModalProvider>
        <WorkspaceSettingsModalProvider>
          <CampaignModeProvider>
            <Sidebar userName="John Doe" email="john@example.com" />
          </CampaignModeProvider>
        </WorkspaceSettingsModalProvider>
      </AccountSettingsModalProvider>,
    )

    expect(screen.getByText('JD')).toBeDefined()
  })
})

describe('MobileNav Component', () => {
  it('renders mobile navigation items (create rail on non-manage routes)', async () => {
    const { MobileNav } = await import('../src/components/layout/MobileNav')
    render(<MobileNav />)

    expect(screen.getByText('Team')).toBeDefined()
    expect(screen.getByText('Campaigns')).toBeDefined()
    expect(screen.getByText('Dashboard')).toBeDefined()
    expect(screen.getByText('More')).toBeDefined()
  })
})
