import { Profiler } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import { fetchAllContacts, importContactsToCampaign } from '../../services/leads.service'
import { AllContactsModal } from './AllContactsModal'

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
  },
}))

vi.mock('../../services/leads.service', () => ({
  fetchAllContacts: vi.fn(),
  importContactsToCampaign: vi.fn(),
}))

vi.mock('@/components/contacts', () => ({
  AllContactsImportGhlDialog: () => null,
}))

const fetchAllContactsMock = vi.mocked(fetchAllContacts)
const importContactsToCampaignMock = vi.mocked(importContactsToCampaign)
const toastSuccessMock = vi.mocked(toast.success)

describe('AllContactsModal', () => {
  beforeEach(() => {
    fetchAllContactsMock.mockResolvedValue({
      contacts: [
        {
          id: 'contact-1',
          email: 'ada@example.com',
          first_name: 'Ada',
          last_name: 'Lovelace',
          phone: '555-0101',
          tags: ['vip'],
          contact_type: 'lead',
          contact_source: 'import',
          is_archived: false,
          created_at: '2026-06-30T00:00:00.000Z',
          updated_at: '2026-06-30T00:00:00.000Z',
          funnel_id: null,
          funnel_title: 'Launch Funnel',
          source_domain: null,
          page_slug: null,
        },
      ],
      total: 1,
      hasMore: false,
    })
    importContactsToCampaignMock.mockResolvedValue({ imported: 1 })
  })

  afterEach(() => {
    cleanup()
    document.body.innerHTML = ''
    vi.clearAllMocks()
  })

  it('loads contacts, links the selected rows to the campaign, and settles without render churn', async () => {
    const onClose = vi.fn()
    const onImported = vi.fn()
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    let commits = 0

    render(
      <Profiler id="all-contacts-modal" onRender={() => (commits += 1)}>
        <AllContactsModal
          campaignId="campaign-1"
          onClose={onClose}
          onImported={onImported}
        />
      </Profiler>,
    )

    expect(await screen.findByText('Ada Lovelace')).toBeTruthy()
    expect(screen.getByText('1 contacts total')).toBeTruthy()

    fireEvent.click(screen.getByText('Ada Lovelace'))
    fireEvent.click(screen.getByRole('button', { name: /Add to campaign/i }))

    await waitFor(() => {
      expect(importContactsToCampaignMock).toHaveBeenCalledWith('campaign-1', ['contact-1'])
    })
    expect(toastSuccessMock).toHaveBeenCalledWith('Added 1 contact to campaign')
    expect(onImported).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(commits).toBeLessThan(30)
    expect(consoleErrorSpy.mock.calls.flat().join('\n')).not.toMatch(
      /Maximum update depth|Too many re-renders/i,
    )

    consoleErrorSpy.mockRestore()
  })
})
