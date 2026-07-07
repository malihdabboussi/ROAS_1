import { beforeEach, describe, expect, it, vi } from 'vitest'
import { backendGet } from '@/lib/api/backend-client'
import { fetchContacts } from '../contacts-view.service'

vi.mock('@/lib/api/backend-client', () => ({
  backendGet: vi.fn(),
  backendPatch: vi.fn(),
  backendPost: vi.fn(),
}))

const backendGetMock = vi.mocked(backendGet)

describe('fetchContacts scope handling', () => {
  beforeEach(() => {
    backendGetMock.mockReset()
    backendGetMock.mockResolvedValue({ contacts: [], total: 0, hasMore: false })
  })

  it('includes campaignId when scoped to a campaign', async () => {
    await fetchContacts({ campaignId: 'campaign-1', limit: 50 })

    const url = String(backendGetMock.mock.calls[0]?.[0])
    expect(url).toContain('/api/leads/crm/list?')
    expect(url).toContain('campaignId=campaign-1')
  })

  it('omits campaignId entirely for the all-org-contacts scope', async () => {
    await fetchContacts({ campaignId: null, limit: 50 })

    const url = String(backendGetMock.mock.calls[0]?.[0])
    expect(url).toContain('/api/leads/crm/list?')
    expect(url).not.toContain('campaignId')
  })
})
