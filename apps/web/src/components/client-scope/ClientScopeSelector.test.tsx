import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ClientScopeSelector } from './ClientScopeSelector'

const mocks = vi.hoisted(() => ({
  setSelectedClientId: vi.fn(),
  clients: [
    { id: 'active-1', name: 'Active Client', status: 'active', pipeline_stage: 'active_happy' },
    { id: 'inactive-1', name: 'Inactive Client', status: 'inactive' },
    { id: 'blocked-1', name: 'Blocked Client', status: 'blocked' },
  ],
}))

vi.mock('@/lib/client-scope', () => ({
  useClientScope: () => ({
    clients: mocks.clients,
    selectedClientId: null,
    scope: null,
    loading: false,
    setSelectedClientId: mocks.setSelectedClientId,
  }),
}))

afterEach(() => {
  cleanup()
  mocks.setSelectedClientId.mockReset()
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
})
