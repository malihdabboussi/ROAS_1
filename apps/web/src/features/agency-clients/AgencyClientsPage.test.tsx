import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchAgencyClients } from '@/lib/agency-clients'
import { AgencyClientsPage } from './AgencyClientsPage'

vi.mock('@/lib/agency-clients', () => ({ fetchAgencyClients: vi.fn() }))

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />,
}))

vi.mock('@/components/vibey/vibey-loading-orb', () => ({
  VibeyLoadingOrb: () => <span>Loading clients</span>,
}))

const client = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Clogged Club',
  display_name: 'Clogged Club',
  status: 'active',
  pipeline_stage: 'active',
  mapping: null,
}

describe('AgencyClientsPage', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(cleanup)

  it('shows unmapped clients before the background Brain mapping pass completes', async () => {
    const neverFinishes = new Promise<never>(() => undefined)
    vi.mocked(fetchAgencyClients)
      .mockResolvedValueOnce({ clients: [client], sync_errors: [] } as never)
      .mockReturnValueOnce(neverFinishes)

    render(<AgencyClientsPage />)

    expect(await screen.findByText('Clogged Club')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Portal' })).toHaveAttribute(
      'href',
      '/clients?surface=portal',
    )
    expect(screen.queryByText('Loading clients')).not.toBeInTheDocument()
    await waitFor(() => {
      expect(fetchAgencyClients).toHaveBeenNthCalledWith(1, '', false)
      expect(fetchAgencyClients).toHaveBeenNthCalledWith(2, '', true)
    })
  })
})
