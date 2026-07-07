import { beforeEach, describe, expect, it, vi } from 'vitest'
import { backendGet, backendPost } from '@/lib/api/backend-client'
import {
  fetchActiveCampaignContactsPage,
  fetchGhlContactsForImport,
  getCrmSyncStatus,
  importContactsToCampaign,
  importCrmContactsBatch,
  importCrmContactsInBatches,
  startCrmSync,
} from './crm-import-api'

vi.mock('@/lib/api/backend-client', () => ({
  backendGet: vi.fn(),
  backendPost: vi.fn(),
}))

const backendGetMock = vi.mocked(backendGet)
const backendPostMock = vi.mocked(backendPost)

describe('crm import api', () => {
  beforeEach(() => {
    backendGetMock.mockReset()
    backendPostMock.mockReset()
  })

  it('uses the existing GHL and CRM sync endpoints', async () => {
    backendGetMock
      .mockResolvedValueOnce({
        success: true,
        contacts: [{ id: 'ghl-1', email: 'ada@example.com' }],
      })
      .mockResolvedValueOnce({ id: 'sync-1', status: 'succeeded' })
    backendPostMock.mockResolvedValue({ jobId: 'job-1', status: 'running' })

    await expect(fetchGhlContactsForImport()).resolves.toEqual([
      { id: 'ghl-1', email: 'ada@example.com' },
    ])
    await expect(startCrmSync('gohighlevel')).resolves.toEqual({
      jobId: 'job-1',
      status: 'running',
    })
    await expect(getCrmSyncStatus('job 1')).resolves.toEqual({
      id: 'sync-1',
      status: 'succeeded',
    })

    expect(backendGetMock).toHaveBeenNthCalledWith(1, '/api/integrations/lhg/contacts')
    expect(backendPostMock).toHaveBeenCalledWith('/api/leads/crm-sync', {
      source: 'gohighlevel',
    })
    expect(backendGetMock).toHaveBeenNthCalledWith(2, '/api/leads/crm-sync/job%201')
  })

  it('uses the existing contact import and campaign-link endpoints', async () => {
    const contacts = [{ email: 'ada@example.com', first_name: 'Ada' }]
    backendPostMock
      .mockResolvedValueOnce({ imported: 1, skipped: 0, contact_ids: ['contact-1'] })
      .mockResolvedValueOnce({ imported: 1 })

    await expect(importCrmContactsBatch(contacts)).resolves.toEqual({
      imported: 1,
      skipped: 0,
      contact_ids: ['contact-1'],
    })
    await expect(importContactsToCampaign('campaign-1', ['contact-1'])).resolves.toEqual({
      imported: 1,
    })

    expect(backendPostMock).toHaveBeenNthCalledWith(1, '/api/leads/contacts/import-batch', {
      contacts,
    })
    expect(backendPostMock).toHaveBeenNthCalledWith(2, '/api/leads/campaign-import', {
      campaignId: 'campaign-1',
      contactIds: ['contact-1'],
    })
  })

  it('keeps ActiveCampaign contact page query behavior', async () => {
    backendGetMock.mockResolvedValue({
      contacts: [],
      total: 0,
      limit: 25,
      offset: 50,
    })

    await fetchActiveCampaignContactsPage({ limit: 25, offset: 50, search: 'ada' })

    expect(backendGetMock).toHaveBeenCalledWith(
      '/api/integrations/active-campaign/crm-import-contacts?limit=25&offset=50&search=ada',
    )
  })

  it('imports large CRM contact batches through the existing 5000-contact chunks', async () => {
    const contacts = Array.from({ length: 5001 }, (_, index) => ({
      email: `contact-${index}@example.com`,
    }))
    backendPostMock
      .mockResolvedValueOnce({ imported: 5000, skipped: 0, contact_ids: ['first'] })
      .mockResolvedValueOnce({ imported: 1, skipped: 1, contact_ids: ['second'] })

    await expect(importCrmContactsInBatches(contacts)).resolves.toEqual({
      imported: 5001,
      skipped: 1,
      contact_ids: ['first', 'second'],
    })
    expect(backendPostMock).toHaveBeenCalledTimes(2)
  })
})
