import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ClientScopeSelector } from './ClientScopeSelector'

const mocks = vi.hoisted(() => ({
  setSelectedClientId: vi.fn(),
  selectedClientId: null as string | null,
  scope: null as { clientName: string } | null,
  clients: [
    { id: 'active-1', name: 'Active Client', status: 'active', pipeline_stage: 'active_happy' },
    { id: 'inactive-1', name: 'Inactive Client', status: 'inactive' },
    { id: 'blocked-1', name: 'Blocked Client', status: 'blocked' },
  ],
}))

vi.mock('@/lib/client-scope', () => ({
  useClientScope: () => ({
    clients: mocks.clients,
    selectedClientId: mocks.selectedClientId,
    scope: mocks.scope,
    loading: false,
    setSelectedClientId: mocks.setSelectedClientId,
  }),
}))

afterEach(() => {
  cleanup()
  mocks.setSelectedClientId.mockReset()
  mocks.selectedClientId = null
  mocks.scope = null
})

describe('ClientScopeSelector', () => {
  it('uses a scrollable list and hides inactive clients by default', () => {
    render(<ClientScopeSelector />)

    fireEvent.click(screen.getByRole('button', { name: 'Filter by client' }))

    expect(screen.getByPlaceholderText('Search clients')).toBeInTheDocument()
    expect(screen.getByText('Active Client')).toBeInTheDocument()
    expect(screen.queryByText('Inactive Client')).not.toBeInTheDocument()
    expect(screen.queryByText('Blocked Client')).not.toBeInTheDocument()
    expect(screen.getByText('Active Client').closest('.overflow-y-auto')).toBeInTheDocument()
  })

  it('finds an inactive client when searched', () => {
    render(<ClientScopeSelector />)

    fireEvent.click(screen.getByRole('button', { name: 'Filter by client' }))
    fireEvent.change(screen.getByPlaceholderText('Search clients'), {
      target: { value: 'Inactive' },
    })

    expect(screen.getByText('Inactive Client')).toBeInTheDocument()
    expect(screen.queryByText('Active Client')).not.toBeInTheDocument()
  })

  it('shows a compact selected count and pins the selected client below All clients', () => {
    mocks.selectedClientId = 'blocked-1'
    mocks.scope = { clientName: 'Blocked Client' }
    render(<ClientScopeSelector />)

    const trigger = screen.getByRole('button', { name: 'Client filter: Blocked Client' })
    expect(trigger).toHaveTextContent('1')
    expect(trigger).not.toHaveTextContent('Blocked Client')

    fireEvent.click(trigger)

    const clientButtons = screen
      .getAllByRole('button')
      .filter((button) =>
        ['All clients', 'Blocked Client', 'Active Client'].includes(
          button.textContent?.trim() ?? '',
        ),
      )
    expect(clientButtons.map((button) => button.textContent?.trim())).toEqual([
      'All clients',
      'Blocked Client',
      'Active Client',
    ])
  })
})
