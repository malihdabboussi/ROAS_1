'use client'

import { useEffect, useState } from 'react'
import { Globe, MoreHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import {
  DOMAINS_TOAST_ERRORS,
  DOMAINS_TOAST_SUCCESS,
} from '@/lib/domains/domains-toast-errors.config'
import { customDomainsApi } from '@/lib/domains/custom-domains-api'
import type { CustomDomain, DomainStatus } from '@/lib/domains/domains.types'
import { CustomDomainDnsDialog } from './CustomDomainDnsDialog'
import { DeleteCustomDomainDialog } from './DeleteCustomDomainDialog'

function statusBadge(status: DomainStatus) {
  switch (status) {
    case 'verified':
      return <span className="badge-glass badge-glass-green">Verified</span>
    case 'dns_verified':
      return <span className="badge-glass badge-glass-blue">DNS Verified</span>
    case 'ssl_pending':
      return <span className="badge-glass badge-glass-orange">SSL Pending</span>
    case 'dns_verifying':
      return <span className="badge-glass badge-glass-orange">DNS Verifying</span>
    case 'ssl_failed':
    case 'error':
      return <span className="badge-glass badge-glass-red">Error</span>
    case 'pending':
    default:
      return <span className="badge-glass badge-glass-orange">Pending</span>
  }
}

export function CustomDomainsTable({
  domains,
  onDomainUpdated,
  onDomainDeleted,
  openDnsForDomain,
  onDnsAutoOpenConsumed,
}: {
  domains: CustomDomain[]
  onDomainUpdated: (update: {
    id: string
    status?: DomainStatus
    verification_records?: CustomDomain['verification_records']
  }) => void
  onDomainDeleted: (domainId: string) => void
  openDnsForDomain?: CustomDomain | null
  onDnsAutoOpenConsumed?: () => void
}) {
  const [dnsDialogDomain, setDnsDialogDomain] = useState<CustomDomain | null>(null)
  const [deleteDialogDomain, setDeleteDialogDomain] = useState<CustomDomain | null>(null)
  const [actionMenuDomainId, setActionMenuDomainId] = useState<string | null>(null)

  useEffect(() => {
    if (!openDnsForDomain) return
    setDnsDialogDomain(openDnsForDomain)
    onDnsAutoOpenConsumed?.()
  }, [openDnsForDomain?.id])

  const handleVerify = async (domainId: string) => {
    const result = await customDomainsApi.verify(domainId)
    if (result.success) {
      onDomainUpdated({
        id: domainId,
        status: result.status,
        verification_records: result.verification_records ?? null,
      })
      if (result.status === 'verified')
        toast.success(DOMAINS_TOAST_SUCCESS.DOMAIN_VERIFIED.userMessage)
      else toast.error(DOMAINS_TOAST_ERRORS.DNS_NOT_VERIFIED.userMessage)
      return
    }
    toast.error(result.error || DOMAINS_TOAST_ERRORS.VERIFICATION_FAILED.userMessage)
  }

  return (
    <>
      <div className="surface-card border-border rounded-spacing-3 border">
        {domains.length === 0 ? (
          <div className="py-spacing-12 px-spacing-6 flex flex-col items-center justify-center">
            <Globe className="icon-lg text-muted-foreground mb-spacing-3" />
            <p className="body-1 text-foreground font-medium">No domains yet</p>
            <p className="body-3 text-muted-foreground mt-spacing-1 max-w-sm text-center">
              Add a custom domain to publish funnels and presentations under your own URL.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile: card list */}
            <div className="divide-y divide-[var(--color-border)] md:hidden">
              {domains.map((domain) => (
                <div key={domain.id} className="flex items-center justify-between px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="gap-spacing-2 flex items-center">
                      <Globe className="icon-sm text-muted-foreground shrink-0" />
                      <span className="body-2 text-foreground truncate font-medium">
                        {domain.domain_name}
                      </span>
                    </div>
                    <div className="mt-1 pl-6">{statusBadge(domain.status)}</div>
                  </div>
                  <div className="relative flex-shrink-0">
                    <button
                      onClick={() =>
                        setActionMenuDomainId(actionMenuDomainId === domain.id ? null : domain.id)
                      }
                      aria-label="Domain actions"
                      title="Domain actions"
                      className="btn-icon-glass"
                    >
                      <MoreHorizontal className="icon-sm" />
                    </button>
                    {actionMenuDomainId === domain.id && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setActionMenuDomainId(null)}
                        />
                        <div className="z-dropdown rounded-spacing-2 border-border bg-card absolute right-0 top-full mt-1 w-48 overflow-hidden border shadow-lg">
                          <button
                            onClick={() => {
                              setActionMenuDomainId(null)
                              setDnsDialogDomain(domain)
                            }}
                            className="rounded-spacing-1 px-spacing-3 py-spacing-2 body-3 hover:bg-hover-subtle w-full text-left transition-colors"
                          >
                            View DNS Records
                          </button>
                          {domain.status !== 'verified' && (
                            <button
                              onClick={() => {
                                setActionMenuDomainId(null)
                                void handleVerify(domain.id)
                              }}
                              className="rounded-spacing-1 px-spacing-3 py-spacing-2 body-3 hover:bg-hover-subtle w-full text-left transition-colors"
                            >
                              Verify Domain
                            </button>
                          )}
                          {domain.domain_type !== 'generated' && (
                            <button
                              onClick={() => {
                                setActionMenuDomainId(null)
                                setDeleteDialogDomain(domain)
                              }}
                              className="rounded-spacing-1 px-spacing-3 py-spacing-2 body-3 text-destructive hover:bg-hover-subtle w-full text-left transition-colors"
                            >
                              Remove Domain
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: table */}
            <table className="hidden w-full md:table">
              <thead>
                <tr className="border-border bg-muted/30 border-b">
                  <th className="px-spacing-4 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
                    Domain
                  </th>
                  <th className="px-spacing-4 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
                    Type
                  </th>
                  <th className="px-spacing-4 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
                    Status
                  </th>
                  <th className="px-spacing-4 py-spacing-2 body-4 text-muted-foreground text-right font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {domains.map((domain) => (
                  <tr
                    key={domain.id}
                    className="border-border hover:bg-hover-subtle border-b transition-colors last:border-b-0"
                  >
                    <td className="px-spacing-4 py-spacing-3">
                      <div className="gap-spacing-2 flex items-center">
                        <Globe className="icon-sm text-muted-foreground" />
                        <span className="body-2 text-foreground font-medium">
                          {domain.domain_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-spacing-4 py-spacing-3">
                      <span className="body-3 text-muted-foreground">
                        {domain.domain_type === 'generated' ? 'Generated' : 'Custom'}
                      </span>
                    </td>
                    <td className="px-spacing-4 py-spacing-3">{statusBadge(domain.status)}</td>
                    <td className="px-spacing-4 py-spacing-3 text-right">
                      <div className="relative inline-block">
                        <button
                          onClick={() =>
                            setActionMenuDomainId(
                              actionMenuDomainId === domain.id ? null : domain.id,
                            )
                          }
                          aria-label="Domain actions"
                          title="Domain actions"
                          className="btn-icon-glass"
                        >
                          <MoreHorizontal className="icon-sm" />
                        </button>
                        {actionMenuDomainId === domain.id && (
                          <>
                            <div
                              className="fixed inset-0 z-40"
                              onClick={() => setActionMenuDomainId(null)}
                            />
                            <div className="z-dropdown rounded-spacing-2 border-border bg-card absolute right-0 top-full mt-1 w-48 overflow-hidden border shadow-lg">
                              <button
                                onClick={() => {
                                  setActionMenuDomainId(null)
                                  setDnsDialogDomain(domain)
                                }}
                                className="rounded-spacing-1 px-spacing-3 py-spacing-2 body-3 hover:bg-hover-subtle w-full text-left transition-colors"
                              >
                                View DNS Records
                              </button>
                              {domain.status !== 'verified' && (
                                <button
                                  onClick={() => {
                                    setActionMenuDomainId(null)
                                    void handleVerify(domain.id)
                                  }}
                                  className="rounded-spacing-1 px-spacing-3 py-spacing-2 body-3 hover:bg-hover-subtle w-full text-left transition-colors"
                                >
                                  Verify Domain
                                </button>
                              )}
                              {domain.domain_type !== 'generated' && (
                                <button
                                  onClick={() => {
                                    setActionMenuDomainId(null)
                                    setDeleteDialogDomain(domain)
                                  }}
                                  className="rounded-spacing-1 px-spacing-3 py-spacing-2 body-3 text-destructive hover:bg-hover-subtle w-full text-left transition-colors"
                                >
                                  Remove Domain
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      <CustomDomainDnsDialog
        domain={dnsDialogDomain}
        onClose={() => setDnsDialogDomain(null)}
        onDomainUpdated={onDomainUpdated}
      />

      <DeleteCustomDomainDialog
        domain={deleteDialogDomain}
        onClose={() => setDeleteDialogDomain(null)}
        onDeleted={(domainId) => {
          onDomainDeleted(domainId)
          setDeleteDialogDomain(null)
        }}
      />
    </>
  )
}
