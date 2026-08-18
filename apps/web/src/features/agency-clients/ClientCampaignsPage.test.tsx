import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchAgencyClientCampaigns } from '@/lib/agency-clients'
import { ClientCampaignsPage } from './ClientCampaignsPage'

vi.mock('@/lib/agency-clients', () => ({ fetchAgencyClientCampaigns: vi.fn() }))

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('@/components/shell/ShellBreadcrumb', () => ({
  ShellBreadcrumb: () => null,
}))

vi.mock('@/components/shell/ShellHeaderAction', () => ({
  ShellHeaderAction: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

const campaign = {
  id: '22222222-2222-2222-2222-222222222222',
  client_id: '11111111-1111-1111-1111-111111111111',
  name: 'Evergreen Leads',
  status: 'active',
  platform_status: 'active',
  start_date: null,
  end_date: null,
  event_date: '2026-08-20',
  budget_amount: 5000,
  budget_type: 'monthly',
  currency: '$',
  next_action: null,
  roas_space_id: null,
  clients: { id: '11111111-1111-1111-1111-111111111111', name: 'Clogged Club' },
}

describe('ClientCampaignsPage', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(cleanup)

  it('shows campaigns before the background Space mapping pass completes', async () => {
    const neverFinishes = new Promise<never>(() => undefined)
    vi.mocked(fetchAgencyClientCampaigns)
      .mockResolvedValueOnce({ campaigns: [campaign] } as never)
      .mockReturnValueOnce(neverFinishes)

    render(<ClientCampaignsPage />)

    expect(await screen.findByText('Evergreen Leads')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'CLIENT CAMPAIGNS' })).toHaveClass('sr-only')
    expect(screen.queryByText('Agency workspace')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Portal' })).toHaveAttribute(
      'href',
      '/client-campaigns?surface=portal&portal_path=/campaigns',
    )
    expect(screen.queryByRole('status', { name: 'Loading campaigns...' })).not.toBeInTheDocument()
    await waitFor(() => {
      expect(fetchAgencyClientCampaigns).toHaveBeenNthCalledWith(1, undefined, false)
      expect(fetchAgencyClientCampaigns).toHaveBeenNthCalledWith(2, undefined, true)
    })
  })
})
