import { beforeEach, describe, expect, it, vi } from 'vitest'
import { backendGet, backendPost } from '@/lib/api/backend-client'
import {
  fetchAgencyClient,
  fetchAgencyClientCampaigns,
  fetchAgencyClients,
  updateAgencyWorkspaceEntity,
} from './agency-clients-api'

vi.mock('@/lib/api/backend-client', () => ({
  backendGet: vi.fn(),
  backendPost: vi.fn(),
}))

describe('agency clients API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads clients with bootstrap sync enabled', async () => {
    vi.mocked(backendGet).mockResolvedValue({ clients: [], sync_errors: [] })
    await fetchAgencyClients('Acme', true)
    expect(backendGet).toHaveBeenCalledWith(
      '/api/integrations/page-grader/agency/clients?q=Acme&sync=true',
    )
  })

  it('loads a client workspace and unwraps it', async () => {
    const workspace = { client: { id: 'client-1' } }
    vi.mocked(backendGet).mockResolvedValue({ workspace })
    await expect(fetchAgencyClient('client-1', false)).resolves.toBe(workspace)
    expect(backendGet).toHaveBeenCalledWith(
      '/api/integrations/page-grader/agency/clients/client-1?sync=false',
    )
  })

  it('scopes campaign requests by client', async () => {
    vi.mocked(backendGet).mockResolvedValue({ campaigns: [] })
    await fetchAgencyClientCampaigns('client 1', false)
    expect(backendGet).toHaveBeenCalledWith(
      '/api/integrations/page-grader/agency/client-campaigns?client_id=client+1&sync=false',
    )
  })

  it('writes shared entity updates through Page Grader', async () => {
    vi.mocked(backendPost).mockResolvedValue({ success: true })
    await updateAgencyWorkspaceEntity('client-1', {
      kind: 'campaign',
      entity_id: 'campaign-1',
      patch: { budget_amount: 5000 },
    })
    expect(backendPost).toHaveBeenCalledWith(
      '/api/integrations/page-grader/agency/clients/client-1/update',
      {
        kind: 'campaign',
        entity_id: 'campaign-1',
        patch: { budget_amount: 5000 },
      },
    )
  })
})
