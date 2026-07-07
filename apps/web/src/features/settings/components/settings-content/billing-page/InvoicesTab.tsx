'use client'

import type { Invoice } from '@/features/settings/types/billing.types'
import { formatDateLong } from './utils/billing-format'

export function InvoicesTab({ invoices, loading }: { invoices: Invoice[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-spacing-2 mt-spacing-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-secondary h-12 animate-pulse rounded" />
        ))}
      </div>
    )
  }

  if (invoices.length === 0) {
    return (
      <div className="py-spacing-8 text-center">
        <p className="body-2 text-muted-foreground">No invoices yet</p>
      </div>
    )
  }

  return (
    <div className="max-h-[280px] overflow-y-auto pr-1">
      {invoices.map((invoice, index) => {
        const isLast = index === invoices.length - 1
        const isUpcoming = invoice.status === 'draft'
        const amount = (invoice.amount_paid / 100).toFixed(2)

        return (
          <div
            key={invoice.stripe_invoice_id || `inv-${index}`}
            className={`py-spacing-2 flex items-center justify-between ${!isLast ? 'border-border border-b' : ''}`}
          >
            <div>
              <p className="body-2 text-foreground">
                {isUpcoming ? 'Upcoming invoice' : formatDateLong(invoice.created)}
              </p>
              {!isUpcoming && (
                <p className="body-3 text-muted-foreground mt-0.5">
                  {invoice.status === 'paid' ? 'Paid' : invoice.status} · ${amount}
                </p>
              )}
            </div>
            <button
              onClick={() => {
                if (invoice.hosted_invoice_url) window.open(invoice.hosted_invoice_url, '_blank')
              }}
              className="body-3 px-spacing-3 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-spacing-2 py-1.5 transition-colors"
            >
              View invoice
            </button>
          </div>
        )
      })}
    </div>
  )
}
