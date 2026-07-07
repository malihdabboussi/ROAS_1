'use client'

import { ChevronDown, Copy, ExternalLink, Plus } from 'lucide-react'
import type { StripePaymentLink } from '@/features/studio/services/analytics.service'
import { NEW_BTN_CLASS } from '../constants'
import { fmtPrice } from '../utils/financeFormatters'

interface Props {
  linksOpen: boolean
  setLinksOpen: (value: boolean | ((v: boolean) => boolean)) => void
  paymentLinks: StripePaymentLink[]
  objectsLoading: boolean
  setShowNewLinkModal: (open: boolean) => void
  hideNewButton?: boolean
  filterQuery?: string
}

export function PaymentLinksSection({
  linksOpen,
  setLinksOpen,
  paymentLinks,
  objectsLoading,
  setShowNewLinkModal,
  hideNewButton = false,
  filterQuery = '',
}: Props) {
  const fq = filterQuery.trim().toLowerCase()
  const linksFiltered = fq
    ? paymentLinks.filter((l) => l.url.toLowerCase().includes(fq))
    : paymentLinks

  return (
    <div className="card-glass p-5">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setLinksOpen((v) => !v)}
          className="flex items-center gap-2"
        >
          <ChevronDown
            className={`text-muted-foreground h-4 w-4 transition-transform ${linksOpen ? '' : '-rotate-90'}`}
          />
          <div className="text-left">
            <p className="body-2 text-foreground font-semibold">
              {`Payment Links (${linksFiltered.length}${fq && paymentLinks.length !== linksFiltered.length ? ` / ${paymentLinks.length}` : ''})`}
            </p>
            <p className="body-4 text-muted-foreground mt-0.5">
              Shareable checkout links tagged to this campaign
            </p>
          </div>
        </button>
        {!hideNewButton ? (
          <button type="button" onClick={() => setShowNewLinkModal(true)} className={NEW_BTN_CLASS}>
            <Plus className="h-3.5 w-3.5" /> New Link
          </button>
        ) : null}
      </div>

      {linksOpen && (
        <div className="mt-4">
          {objectsLoading ? (
            <p className="body-4 text-muted-foreground">Loading...</p>
          ) : paymentLinks.length === 0 ? (
            <p className="body-4 text-muted-foreground">No payment links yet.</p>
          ) : linksFiltered.length === 0 ? (
            <p className="body-4 text-muted-foreground">No payment links match your search.</p>
          ) : (
            <div className="space-y-2">
              {linksFiltered.map((link) => (
                <div
                  key={link.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-surface-subtle px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="body-3 text-foreground truncate font-medium">{link.url}</p>
                    {link.line_items?.data[0]?.price && (
                      <p className="body-4 text-muted-foreground mt-0.5">
                        {fmtPrice(link.line_items.data[0].price)}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void navigator.clipboard.writeText(link.url)}
                      className="btn-icon-glass rounded-spacing-2"
                      title="Copy link"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-icon-glass rounded-spacing-2"
                      title="Open link"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
