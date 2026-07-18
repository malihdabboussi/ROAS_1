import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { backendGet } from '@/lib/api/backend-client'
import { customDomainsApi } from '@/lib/domains/custom-domains-api'
import type { CustomDomain } from '@/lib/domains/domains.types'
import { AddCustomDomainDialog } from './AddCustomDomainDialog'
import { ConnectCustomDomainModal } from './ConnectCustomDomainModal'
import { CustomDomainDnsDialog } from './CustomDomainDnsDialog'
import { DeleteCustomDomainDialog } from './DeleteCustomDomainDialog'

vi.mock('@/lib/domains/custom-domains-api', () => ({
  customDomainsApi: {
    add: vi.fn(),
    config: vi.fn(),
    remove: vi.fn(),
    verify: vi.fn(),
  },
}))

vi.mock('@/lib/api/backend-client', () => ({
  backendGet: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

const backendGetMock = vi.mocked(backendGet)

afterEach(() => {
  vi.clearAllMocks()
  cleanup()
})

function customDomain(overrides: Partial<CustomDomain> = {}): CustomDomain {
  return {
    id: 'domain-1',
    domain_name: 'promo.example.com',
    domain: 'promo.example.com',
    user_id: 'user-1',
    landing_page_id: null,
    funnel_id: null,
    status: 'pending',
    verification_records: [
      {
        type: 'CNAME',
        name: 'promo.example.com',
        value: 'cname.vercel-dns.com',
      },
    ],
    last_verification_check: null,
    error_message: null,
    created_at: '2026-06-22T00:00:00.000Z',
    updated_at: '2026-06-22T00:00:00.000Z',
    ...overrides,
  }
}

describe('custom domain shared dialogs', () => {
  it('adds a custom domain and forwards the normalized domain payload', async () => {
    vi.mocked(customDomainsApi.add).mockResolvedValue({
      success: true,
      domain: customDomain({ verification_records: null }),
      verification_records: [{ type: 'TXT', name: '_verify', value: 'token' }],
    })
    const onDomainAdded = vi.fn()
    const onClose = vi.fn()

    render(<AddCustomDomainDialog isOpen onClose={onClose} onDomainAdded={onDomainAdded} />)

    const dialog = screen.getByRole('dialog', { name: 'Add Custom Domain' })
    expect(dialog.getAttribute('aria-describedby')).toBe(
      screen.getByText(/Add a domain you own/).id,
    )
    expect(screen.getByRole('button', { name: 'Close add custom domain' })).toBeTruthy()

    fireEvent.change(screen.getByLabelText(/domain name/i), {
      target: { value: 'promo.example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^add domain$/i }))

    await waitFor(() => expect(customDomainsApi.add).toHaveBeenCalledWith('promo.example.com'))
    expect(onDomainAdded).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'domain-1',
        verification_records: [{ type: 'TXT', name: '_verify', value: 'token' }],
      }),
    )
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders DNS verification records for the active domain', () => {
    render(
      <CustomDomainDnsDialog domain={customDomain()} onClose={vi.fn()} onDomainUpdated={vi.fn()} />,
    )

    const dialog = screen.getByRole('dialog', { name: 'DNS Records for promo.example.com' })
    expect(dialog.getAttribute('aria-describedby')).toBe(
      screen.getByText(/Add these DNS records/).id,
    )
    expect(screen.getByRole('button', { name: 'Close DNS records' })).toBeTruthy()
    expect(screen.getByText('promo.example.com')).toBeTruthy()
    expect(screen.getAllByText('CNAME').length).toBeGreaterThan(0)
    expect(screen.getAllByText('cname.vercel-dns.com').length).toBeGreaterThan(0)
  })

  it('connects an existing verified custom domain', async () => {
    backendGetMock.mockResolvedValue({
      success: true,
      domains: [customDomain({ status: 'verified', domain_type: 'custom' })],
    })
    const onConnect = vi.fn().mockResolvedValue(undefined)

    render(
      <ConnectCustomDomainModal
        open
        onClose={vi.fn()}
        onConnect={onConnect}
        title="Connect custom domain"
      />,
    )

    const dialog = screen.getByRole('dialog', { name: 'Connect custom domain' })
    expect(dialog.getAttribute('aria-describedby')).toBe(
      screen.getByText('Pick a verified custom domain or add a new one.').id,
    )
    expect(screen.getByRole('button', { name: 'Close connect custom domain' })).toBeTruthy()
    const domainOption = await screen.findByRole('button', { name: 'promo.example.com' })
    expect(domainOption.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(domainOption)
    expect(domainOption.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: /^connect$/i }))

    await waitFor(() => expect(onConnect).toHaveBeenCalledWith('domain-1'))
  })

  it('describes and labels custom-domain deletion', () => {
    render(
      <DeleteCustomDomainDialog
        domain={customDomain({ domain_type: 'custom' })}
        onClose={vi.fn()}
        onDeleted={vi.fn()}
      />,
    )

    const dialog = screen.getByRole('dialog', { name: 'Delete Domain' })
    expect(dialog.getAttribute('aria-describedby')).toBe(
      screen.getByText('Permanently remove this custom domain.').id,
    )
    expect(screen.getByRole('button', { name: 'Close delete domain' })).toBeTruthy()
    expect(screen.getByLabelText(/Type DELETE to confirm/)).toBeTruthy()
  })
})
