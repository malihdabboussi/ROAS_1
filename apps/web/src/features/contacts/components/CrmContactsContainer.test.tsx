import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CrmContactsContainer } from './CrmContactsContainer'
import type { CrmContactRow } from '../services/crm-contacts-api'
import { listCrmContacts, listCrmFunnels } from '../services/crm-contacts-api'

const pushMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}))

vi.mock('../services/crm-contacts-api', () => ({
  listCrmContacts: vi.fn(),
  listCrmFunnels: vi.fn(),
}))

const contactRow: CrmContactRow = {
  id: 'contact-1',
  email: 'ada@example.com',
  first_name: 'Ada',
  last_name: 'Lovelace',
  phone: '+1 555 0100',
  tags: ['Lead'],
  contact_type: 'lead',
  contact_type_source: null,
  contact_type_confidence: null,
  contact_type_set_at: null,
  contact_source: 'form',
  contact_source_detail: null,
  is_archived: false,
  business_name: null,
  website: null,
  address: null,
  city: null,
  state: null,
  country: null,
  created_at: '2026-06-01T12:00:00.000Z',
  updated_at: '2026-06-02T12:00:00.000Z',
  funnel_id: 'funnel-1',
  funnel_title: 'Launch Funnel',
  source_domain: 'example.com',
  page_slug: 'apply',
  latest_note_preview: null,
}

function setupApiMocks() {
  vi.mocked(listCrmContacts).mockResolvedValue({
    contacts: [contactRow],
    total: 1,
    hasMore: false,
  })
  vi.mocked(listCrmFunnels).mockResolvedValue({
    funnels: [{ id: 'funnel-1', title: 'Launch Funnel' }],
  })
}

function setActiveOrgForTest(id: string) {
  window.sessionStorage.setItem('vibey-active-org', JSON.stringify({ state: { activeOrgId: id } }))
}

describe('CrmContactsContainer', () => {
  beforeEach(() => {
    setupApiMocks()
    pushMock.mockClear()
    window.localStorage.clear()
    window.sessionStorage.clear()
    setActiveOrgForTest(`org-${crypto.randomUUID()}`)
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('loads contacts and routes row clicks to the contact detail page', async () => {
    render(<CrmContactsContainer />)

    expect(await screen.findByText('Ada Lovelace')).toBeDefined()
    expect(screen.getByText('ada@example.com')).toBeDefined()

    fireEvent.click(screen.getByText('Ada Lovelace').closest('button')!)

    expect(pushMock).toHaveBeenCalledWith('/contacts/contact-1')
    expect(listCrmContacts).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 50,
        offset: 0,
        sort: 'created_at.desc',
      }),
    )
  })

  it('routes status filter changes into the contact list query', async () => {
    render(<CrmContactsContainer />)
    await screen.findByText('Ada Lovelace')

    fireEvent.click(screen.getByRole('button', { name: 'Lead' }))

    await waitFor(() => {
      expect(listCrmContacts).toHaveBeenLastCalledWith(
        expect.objectContaining({
          contactType: 'lead',
          includeArchived: false,
        }),
      )
    })
  })

  it('toggles column visibility from the columns dropdown', async () => {
    render(<CrmContactsContainer />)
    await screen.findByText('Ada Lovelace')

    expect(screen.getByText('Phone')).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: 'Columns' }))
    fireEvent.click(screen.getByRole('button', { name: /Phone/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Columns' }))

    expect(screen.queryByText('Phone')).toBeNull()
  })

  it('opens and applies the filter drawer, then rerenders without state churn', async () => {
    const { rerender } = render(<CrmContactsContainer />)
    await screen.findByText('Ada Lovelace')

    fireEvent.click(screen.getByRole('button', { name: 'Filters' }))
    expect(await screen.findByText('Filters')).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
    await waitFor(() => expect(screen.queryByText('Filters')).toBeNull())

    rerender(<CrmContactsContainer />)
    expect(screen.getByText('Ada Lovelace')).toBeDefined()
  })
})
