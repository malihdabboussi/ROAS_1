import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { EmailDomain } from '../../types/email.types'
import { AddEmailDomainDialog } from './AddEmailDomainDialog'
import { DeleteDomainDialog } from './DeleteDomainDialog'
import { DnsRecordsDialog } from './DnsRecordsDialog'

const mocks = vi.hoisted(() => ({
  addDomain: vi.fn(),
  removeDomain: vi.fn(),
  verifyDomain: vi.fn(),
}))

const domain: EmailDomain = {
  id: 'domain-1',
  user_id: 'user-1',
  domain: 'example.com',
  subdomain: 'mail',
  sendgrid_domain_id: 123,
  status: 'pending',
  dns_records: [
    { type: 'cname', host: 'mail.example.com', data: 'sendgrid.example.com', valid: false },
  ],
  is_default: false,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  verified_at: null,
  inbound_parse_enabled: false,
  inbound_parse_hostname: null,
  mx_verified: false,
  mx_verified_at: null,
}

vi.mock('../../providers/EmailDomainsProvider', () => ({
  useEmailDomains: () => ({
    addDomain: mocks.addDomain,
    domains: [domain],
    removeDomain: mocks.removeDomain,
    verifyDomain: mocks.verifyDomain,
  }),
}))

vi.mock('../../providers/SenderIdentitiesProvider', () => ({
  useSenderIdentities: () => ({ senderIdentities: [] }),
}))

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

describe('email domain dialog accessibility', () => {
  afterEach(cleanup)

  it('describes the add-domain flow and names its close action', () => {
    render(<AddEmailDomainDialog isOpen onClose={vi.fn()} />)

    const dialog = screen.getByRole('dialog', { name: 'Add Sending Domain' })
    expect(dialog.getAttribute('aria-describedby')).toBe(
      screen.getByText(/Authenticate your domain/).id,
    )
    expect(screen.getByRole('button', { name: 'Close add sending domain' })).toBeTruthy()
    expect(
      screen.getByRole('button', { name: 'Advanced options' }).getAttribute('aria-expanded'),
    ).toBe('false')
  })

  it('describes DNS records and gives copy actions explicit names', () => {
    render(<DnsRecordsDialog domain={domain} onClose={vi.fn()} />)

    const dialog = screen.getByRole('dialog', { name: 'DNS Records for mail.example.com' })
    expect(dialog.getAttribute('aria-describedby')).toBe(
      screen.getByText(/Add these DNS records/).id,
    )
    expect(screen.getByRole('button', { name: 'Close email DNS records' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Copy host mail' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Copy value sendgrid.example.com' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Copy host _dmarc' })).toBeTruthy()
  })

  it('describes deletion and connects the confirmation label', () => {
    render(<DeleteDomainDialog domain={domain} onClose={vi.fn()} />)

    const dialog = screen.getByRole('dialog', { name: 'Delete Domain' })
    expect(dialog.getAttribute('aria-describedby')).toBe(
      screen.getByText('Permanently remove this sending domain and its DNS records.').id,
    )
    expect(screen.getByRole('button', { name: 'Close delete sending domain' })).toBeTruthy()
    expect(screen.getByLabelText(/Type DELETE to confirm/)).toBeTruthy()
  })
})
