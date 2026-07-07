'use client'

import { useState } from 'react'
import { Globe, MoreHorizontal, Shield, ShieldCheck, ShieldX } from 'lucide-react'
import { toast } from 'sonner'
import { EMAIL_ERRORS } from '../../config/email-errors.config'
import { EMAIL_MESSAGES } from '../../config/email-messages.config'
import { useEmailDomains } from '../../providers/EmailDomainsProvider'
import type { EmailDomain } from '../../types/email.types'
import { DeleteDomainDialog } from './DeleteDomainDialog'
import { DnsRecordsDialog } from './DnsRecordsDialog'

export function EmailDomainsTable() {
  const { domains, verifyDomain, setDefaultDomain } = useEmailDomains()
  const [dnsDialogDomain, setDnsDialogDomain] = useState<EmailDomain | null>(null)
  const [deleteDialogDomain, setDeleteDialogDomain] = useState<EmailDomain | null>(null)
  const [actionMenuDomainId, setActionMenuDomainId] = useState<string | null>(null)

  const handleVerify = async (domainId: string) => {
    const result = await verifyDomain(domainId)
    if (result.isValid) {
      toast.success(EMAIL_MESSAGES.SUCCESS_DOMAIN_VERIFIED.message)
    } else {
      toast.error(EMAIL_ERRORS.DNS_NOT_VERIFIED.userMessage)
    }
  }

  const statusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <span className="badge-glass badge-glass-green">Verified</span>
      case 'pending':
      case 'verifying':
        return <span className="badge-glass badge-glass-orange">Pending</span>
      case 'failed':
        return <span className="badge-glass badge-glass-red">Failed</span>
      default:
        return <span className="badge-glass">{status}</span>
    }
  }

  const statusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <ShieldCheck className="icon-sm text-green-500" />
      case 'failed':
        return <ShieldX className="icon-sm text-red-500" />
      default:
        return <Shield className="icon-sm text-orange-500" />
    }
  }

  return (
    <>
      <div className="surface-card border-border rounded-spacing-3 border">
        {domains.length === 0 ? (
          <div className="py-spacing-12 px-spacing-6 flex flex-col items-center justify-center">
            <Globe className="icon-lg text-muted-foreground mb-spacing-3" />
            <p className="body-1 text-foreground font-medium">No domains yet</p>
            <p className="body-3 text-muted-foreground mt-spacing-1 max-w-sm text-center">
              Add a sending domain to start sending emails. You'll need to verify DNS records.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile: card list */}
            <div className="divide-y divide-[var(--color-border)] md:hidden">
              {domains.map((domain) => {
                const domainName = domain.subdomain
                  ? `${domain.subdomain}.${domain.domain}`
                  : domain.domain
                return (
                  <div key={domain.id} className="flex items-center justify-between px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="gap-spacing-2 flex items-center">
                        {statusIcon(domain.status)}
                        <span className="body-2 text-foreground truncate font-medium">
                          {domainName}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 pl-6">
                        {statusBadge(domain.status)}
                        {domain.is_default && (
                          <span className="badge-glass badge-glass-blue">Default</span>
                        )}
                      </div>
                    </div>
                    <div className="relative flex-shrink-0">
                      <button
                        onClick={() =>
                          setActionMenuDomainId(actionMenuDomainId === domain.id ? null : domain.id)
                        }
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
                                  handleVerify(domain.id)
                                }}
                                className="rounded-spacing-1 px-spacing-3 py-spacing-2 body-3 hover:bg-hover-subtle w-full text-left transition-colors"
                              >
                                Verify Domain
                              </button>
                            )}
                            {domain.status === 'verified' && !domain.is_default && (
                              <button
                                onClick={async () => {
                                  setActionMenuDomainId(null)
                                  try {
                                    await setDefaultDomain(domain.id)
                                  } catch {
                                    toast.error(
                                      EMAIL_ERRORS.SET_DEFAULT_DOMAIN_FAILED?.userMessage ??
                                        'Failed to set default domain',
                                    )
                                  }
                                }}
                                className="rounded-spacing-1 px-spacing-3 py-spacing-2 body-3 hover:bg-hover-subtle w-full text-left transition-colors"
                              >
                                Set as Default
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setActionMenuDomainId(null)
                                setDeleteDialogDomain(domain)
                              }}
                              className="rounded-spacing-1 px-spacing-3 py-spacing-2 body-3 text-destructive hover:bg-hover-subtle w-full text-left transition-colors"
                            >
                              Remove Domain
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Desktop: table */}
            <table className="hidden w-full md:table">
              <thead>
                <tr className="border-border bg-muted/30 border-b">
                  <th className="px-spacing-4 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
                    Domain
                  </th>
                  <th className="px-spacing-4 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
                    Status
                  </th>
                  <th className="px-spacing-4 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
                    Default
                  </th>
                  <th className="px-spacing-4 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
                    Verified
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
                        {statusIcon(domain.status)}
                        <span className="body-2 text-foreground font-medium">
                          {domain.subdomain
                            ? `${domain.subdomain}.${domain.domain}`
                            : domain.domain}
                        </span>
                      </div>
                    </td>
                    <td className="px-spacing-4 py-spacing-3">{statusBadge(domain.status)}</td>
                    <td className="px-spacing-4 py-spacing-3">
                      {domain.is_default && (
                        <span className="badge-glass badge-glass-blue">Default</span>
                      )}
                    </td>
                    <td className="px-spacing-4 py-spacing-3">
                      <span className="body-3 text-muted-foreground">
                        {domain.verified_at
                          ? new Date(domain.verified_at).toLocaleDateString()
                          : '—'}
                      </span>
                    </td>
                    <td className="px-spacing-4 py-spacing-3 text-right">
                      <div className="relative inline-block">
                        <button
                          onClick={() =>
                            setActionMenuDomainId(
                              actionMenuDomainId === domain.id ? null : domain.id,
                            )
                          }
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
                                    handleVerify(domain.id)
                                  }}
                                  className="rounded-spacing-1 px-spacing-3 py-spacing-2 body-3 hover:bg-hover-subtle w-full text-left transition-colors"
                                >
                                  Verify Domain
                                </button>
                              )}
                              {domain.status === 'verified' && !domain.is_default && (
                                <button
                                  onClick={async () => {
                                    setActionMenuDomainId(null)
                                    try {
                                      await setDefaultDomain(domain.id)
                                    } catch {
                                      toast.error(
                                        EMAIL_ERRORS.SET_DEFAULT_DOMAIN_FAILED?.userMessage ??
                                          'Failed to set default domain',
                                      )
                                    }
                                  }}
                                  className="rounded-spacing-1 px-spacing-3 py-spacing-2 body-3 hover:bg-hover-subtle w-full text-left transition-colors"
                                >
                                  Set as Default
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setActionMenuDomainId(null)
                                  setDeleteDialogDomain(domain)
                                }}
                                className="rounded-spacing-1 px-spacing-3 py-spacing-2 body-3 text-destructive hover:bg-hover-subtle w-full text-left transition-colors"
                              >
                                Remove Domain
                              </button>
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

      <DnsRecordsDialog domain={dnsDialogDomain} onClose={() => setDnsDialogDomain(null)} />
      <DeleteDomainDialog domain={deleteDialogDomain} onClose={() => setDeleteDialogDomain(null)} />
    </>
  )
}
