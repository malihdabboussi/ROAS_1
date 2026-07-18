import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Invoice } from '@/features/settings/types/billing.types'
import { InvoicesTab } from './InvoicesTab'

function invoiceFixture(overrides: Partial<Invoice> = {}): Invoice {
  return {
    stripe_invoice_id: 'invoice-1',
    amount_paid: 4900,
    amount_due: 0,
    currency: 'usd',
    status: 'paid',
    hosted_invoice_url: 'https://billing.example.com/invoice-1',
    created: 1_767_225_600,
    ...overrides,
  }
}

describe('InvoicesTab', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('only offers invoice viewing when Stripe supplied a destination', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

    render(
      <InvoicesTab
        loading={false}
        invoices={[
          invoiceFixture(),
          invoiceFixture({ stripe_invoice_id: 'invoice-2', hosted_invoice_url: null }),
        ]}
      />,
    )

    const viewButtons = screen.getAllByRole('button', { name: 'View invoice' })
    expect(viewButtons).toHaveLength(1)

    fireEvent.click(viewButtons[0]!)
    expect(openSpy).toHaveBeenCalledWith(
      'https://billing.example.com/invoice-1',
      '_blank',
      'noopener,noreferrer',
    )
  })
})
