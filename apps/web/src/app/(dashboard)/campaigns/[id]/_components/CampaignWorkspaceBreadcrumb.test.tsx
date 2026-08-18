import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Campaign } from '@/lib/campaigns'
import { CampaignWorkspaceBreadcrumb } from './CampaignWorkspaceBreadcrumb'

const mocks = vi.hoisted(() => ({
  setPageBreadcrumb: vi.fn(),
  fetchProgram: vi.fn(),
}))

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('@/components/shell/use-shell-store', () => ({
  useShellStore: Object.assign(
    (selector: (state: { setPageBreadcrumb: typeof mocks.setPageBreadcrumb }) => unknown) =>
      selector({ setPageBreadcrumb: mocks.setPageBreadcrumb }),
    {
      getState: () => ({
        setPageBreadcrumb: mocks.setPageBreadcrumb,
        pageBreadcrumbOwner: null,
      }),
    },
  ),
}))

vi.mock('@/lib/programs', () => ({
  fetchProgram: mocks.fetchProgram,
  programDisplayName: (program: { name: string; system_kind?: string | null }) =>
    program.system_kind === 'clients' ? 'Client Spaces' : program.name,
}))

function campaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: 'campaign-1',
    user_id: 'user-1',
    name: 'General',
    campaign_type: 'default',
    status: 'active',
    config: {},
    metrics: {},
    created_at: '',
    updated_at: '',
    ...overrides,
  }
}

describe('CampaignWorkspaceBreadcrumb', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('registers clickable Campaigns / client / campaign crumbs', () => {
    render(
      <CampaignWorkspaceBreadcrumb
        campaign={campaign()}
        client={{ id: 'client-1', name: 'Master Your Kraft' }}
      />,
    )

    expect(mocks.setPageBreadcrumb).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(Object),
      'Campaigns / Master Your Kraft / General',
    )
    render(<>{mocks.setPageBreadcrumb.mock.calls[0]?.[0]}</>)
    expect(screen.getByRole('link', { name: 'Campaigns' })).toHaveAttribute('href', '/campaigns')
    expect(screen.getByRole('link', { name: 'Master Your Kraft' })).toHaveAttribute(
      'href',
      '/clients/client-1',
    )
    expect(screen.getByText('General')).toBeInTheDocument()
  })

  it('registers Campaigns / program / campaign when the campaign sits under a program', async () => {
    mocks.fetchProgram.mockResolvedValue({
      id: 'program-1',
      name: 'Master Your Kraft',
      system_kind: null,
    })

    render(<CampaignWorkspaceBreadcrumb campaign={campaign({ program_id: 'program-1' })} />)

    await waitFor(() => {
      expect(mocks.setPageBreadcrumb).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(Object),
        'Campaigns / Master Your Kraft / General',
      )
    })
    const trail = mocks.setPageBreadcrumb.mock.calls.at(-1)?.[0]
    render(<>{trail}</>)
    expect(screen.getByRole('link', { name: 'Campaigns' })).toHaveAttribute('href', '/campaigns')
    expect(screen.getByRole('link', { name: 'Master Your Kraft' })).toHaveAttribute(
      'href',
      '/programs/program-1',
    )
  })
})
