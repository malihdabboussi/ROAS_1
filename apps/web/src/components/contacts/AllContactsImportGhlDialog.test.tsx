import { Profiler } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import {
  fetchGhlContactsForImport,
  getCrmSyncStatus,
  importContactsToCampaign,
  importCrmContactsBatch,
  startCrmSync,
} from '@/lib/contacts'
import { AllContactsImportGhlDialog } from './AllContactsImportGhlDialog'

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

vi.mock('@/lib/contacts', () => ({
  fetchGhlContactsForImport: vi.fn(),
  getCrmSyncStatus: vi.fn(),
  importContactsToCampaign: vi.fn(),
  importCrmContactsBatch: vi.fn(),
  startCrmSync: vi.fn(),
}))

const fetchGhlContactsForImportMock = vi.mocked(fetchGhlContactsForImport)
const getCrmSyncStatusMock = vi.mocked(getCrmSyncStatus)
const importContactsToCampaignMock = vi.mocked(importContactsToCampaign)
const importCrmContactsBatchMock = vi.mocked(importCrmContactsBatch)
const startCrmSyncMock = vi.mocked(startCrmSync)
const toastSuccessMock = vi.mocked(toast.success)

describe('AllContactsImportGhlDialog', () => {
  beforeEach(() => {
    fetchGhlContactsForImportMock.mockResolvedValue([
      {
        id: 'ghl-1',
        email: 'ADA@EXAMPLE.COM ',
        firstName: ' Ada ',
        lastName: ' Lovelace ',
        phone: ' 555-0101 ',
      },
      {
        id: 'ghl-2',
        email: 'grace@example.com',
        name: 'Grace Hopper',
        phone: '',
      },
    ])
    importCrmContactsBatchMock.mockResolvedValue({
      imported: 1,
      skipped: 0,
      contact_ids: ['contact-1'],
    })
    importContactsToCampaignMock.mockResolvedValue({ imported: 1 })
    startCrmSyncMock.mockResolvedValue({ jobId: 'job-1', status: 'running' })
    getCrmSyncStatusMock.mockResolvedValue({
      id: 'sync-1',
      user_id: 'user-1',
      source: 'gohighlevel',
      status: 'succeeded',
      job_id: 'job-1',
      total_remote: 2,
      fetched: 2,
      imported: 2,
      skipped: 0,
      last_error: null,
      started_at: '2026-06-30T00:00:00.000Z',
      completed_at: '2026-06-30T00:00:03.000Z',
      created_at: '2026-06-30T00:00:00.000Z',
      updated_at: '2026-06-30T00:00:03.000Z',
    })
  })

  afterEach(() => {
    cleanup()
    document.body.innerHTML = ''
    vi.clearAllMocks()
  })

  it('loads GHL contacts, filters, imports selected rows, and settles without render churn', async () => {
    const onImported = vi.fn()
    const onClose = vi.fn()
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    let commits = 0

    render(
      <Profiler id="ghl-import-dialog" onRender={() => (commits += 1)}>
        <AllContactsImportGhlDialog
          open
          onClose={onClose}
          onImported={onImported}
          campaignId="campaign-1"
        />
      </Profiler>,
    )

    expect(await screen.findByText('Ada Lovelace')).toBeTruthy()
    expect(screen.getByText('Grace Hopper')).toBeTruthy()

    fireEvent.change(screen.getByPlaceholderText('Search…'), {
      target: { value: 'ada' },
    })

    expect(screen.getByText('Ada Lovelace')).toBeTruthy()
    expect(screen.queryByText('Grace Hopper')).toBeNull()

    fireEvent.click(screen.getByText('Ada Lovelace'))
    fireEvent.click(screen.getByRole('button', { name: 'Import selected (1)' }))

    await waitFor(() => {
      expect(importCrmContactsBatchMock).toHaveBeenCalledWith([
        {
          email: 'ada@example.com',
          first_name: 'Ada',
          last_name: 'Lovelace',
          phone: '555-0101',
          contact_source: 'import',
          contact_source_detail: 'gohighlevel',
        },
      ])
    })
    expect(importContactsToCampaignMock).toHaveBeenCalledWith('campaign-1', ['contact-1'])
    expect(onImported).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(toastSuccessMock).toHaveBeenCalledWith('Imported 1 contact')
    expect(commits).toBeLessThan(30)
    expect(consoleErrorSpy.mock.calls.flat().join('\n')).not.toMatch(
      /Maximum update depth|Too many re-renders/i,
    )

    consoleErrorSpy.mockRestore()
  })

  it('starts a background account sync and refreshes after a successful poll', async () => {
    const onImported = vi.fn()

    render(
      <AllContactsImportGhlDialog
        open
        onClose={vi.fn()}
        onImported={onImported}
        campaignId="campaign-1"
      />,
    )

    await screen.findByText('Ada Lovelace')
    fireEvent.click(screen.getByRole('button', { name: 'Sync entire account' }))

    await waitFor(() => {
      expect(startCrmSyncMock).toHaveBeenCalledWith('gohighlevel')
      expect(getCrmSyncStatusMock).toHaveBeenCalledWith('job-1')
      expect(onImported).toHaveBeenCalledTimes(1)
    })
    expect(toastSuccessMock).toHaveBeenCalledWith(
      'Sync complete: 2 imported, 0 skipped (2 contacts processed)',
    )
  })
})
