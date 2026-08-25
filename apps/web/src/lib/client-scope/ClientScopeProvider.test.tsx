import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ClientScopeProvider, useClientScope } from './ClientScopeProvider'

const mocks = vi.hoisted(() => ({
  params: new URLSearchParams('client=client-2'),
  push: vi.fn(),
  replace: vi.fn(),
  fetchAgencyClients: vi.fn(),
  fetchAgencyClient: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/home/meetings',
  useRouter: () => ({ push: mocks.push, replace: mocks.replace }),
  useSearchParams: () => mocks.params,
}))

vi.mock('@/lib/org', () => ({
  useOrgStore: (selector: (state: { activeOrgId: string }) => unknown) =>
    selector({ activeOrgId: 'org-1' }),
}))

vi.mock('@/lib/agency-clients', () => ({
  fetchAgencyClients: mocks.fetchAgencyClients,
  fetchAgencyClient: mocks.fetchAgencyClient,
}))

function ScopeProbe() {
  const { scope } = useClientScope()
  return <div>{scope ? `${scope.campaignId}:${scope.spaceIds.join(',')}` : 'unscoped'}</div>
}

describe('ClientScopeProvider', () => {
  beforeEach(() => {
    mocks.params = new URLSearchParams('client=client-2')
    mocks.push.mockReset()
    mocks.replace.mockReset()
    mocks.fetchAgencyClients.mockReset()
    mocks.fetchAgencyClient.mockReset()
  })

  afterEach(cleanup)

  it('fails closed until the selected client mapping is available', async () => {
    let resolveClients!: (value: unknown) => void
    mocks.fetchAgencyClients.mockReturnValue(
      new Promise((resolve) => {
        resolveClients = resolve
      }),
    )
    mocks.fetchAgencyClient.mockReturnValue(new Promise(() => undefined))

    render(
      <ClientScopeProvider>
        <ScopeProbe />
      </ClientScopeProvider>,
    )

    expect(screen.getByLabelText('Loading client workspace')).toBeInTheDocument()
    expect(screen.queryByText('unscoped')).not.toBeInTheDocument()

    resolveClients({
      clients: [
        {
          id: 'client-2',
          name: 'Acme',
          status: 'active',
          mapping: { campaign_id: 'campaign-2', space_id: 'space-primary' },
        },
      ],
      sync_errors: [],
    })

    expect(await screen.findByText('campaign-2:space-primary')).toBeInTheDocument()
  })

  it('clears an invalid selection instead of revealing unscoped data under it', async () => {
    mocks.fetchAgencyClients.mockResolvedValue({ clients: [], sync_errors: [] })
    mocks.fetchAgencyClient.mockRejectedValue(new Error('Not found'))

    render(
      <ClientScopeProvider>
        <ScopeProbe />
      </ClientScopeProvider>,
    )

    expect(screen.getByLabelText('Loading client workspace')).toBeInTheDocument()
    await waitFor(() =>
      expect(mocks.push).toHaveBeenCalledWith('/home/meetings', { scroll: false }),
    )
    expect(await screen.findByText('unscoped')).toBeInTheDocument()
  })
})
