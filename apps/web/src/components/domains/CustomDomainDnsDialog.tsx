'use client'

import { useEffect, useMemo, useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { Check, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { customDomainsApi } from '@/lib/domains/custom-domains-api'
import {
  DOMAINS_TOAST_ERRORS,
  DOMAINS_TOAST_SUCCESS,
} from '@/lib/domains/domains-toast-errors.config'
import type { CustomDomain, DnsRecord, DomainStatus } from '@/lib/domains/domains.types'

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

export function CustomDomainDnsDialog({
  domain,
  onClose,
  onDomainUpdated,
}: {
  domain: CustomDomain | null
  onClose: () => void
  onDomainUpdated: (update: {
    id: string
    status?: DomainStatus
    verification_records?: DnsRecord[] | null
  }) => void
}) {
  const [activeDomain, setActiveDomain] = useState<CustomDomain | null>(domain)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [copiedValue, setCopiedValue] = useState<string | null>(null)

  useEffect(() => {
    setActiveDomain(domain)
  }, [domain?.id])

  useEffect(() => {
    if (!activeDomain) return
    setIsRefreshing(false)
    setIsVerifying(false)
    setCopiedValue(null)
  }, [activeDomain?.id])

  const dnsRecords = useMemo(() => activeDomain?.verification_records ?? [], [activeDomain])

  if (!activeDomain) return null

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedValue(text)
    toast.success(DOMAINS_TOAST_SUCCESS.COPIED.userMessage)
    setTimeout(() => setCopiedValue(null), 2000)
  }

  const handleRefreshRecords = async () => {
    setIsRefreshing(true)
    try {
      const result = await customDomainsApi.config(activeDomain.domain_name)
      if (!result.success) {
        toast.error(result.error || DOMAINS_TOAST_ERRORS.LOAD_DNS_FAILED.userMessage)
        return
      }
      setActiveDomain((prev) =>
        prev
          ? {
              ...prev,
              verification_records: result.verification_records ?? null,
              last_verification_check: new Date().toISOString(),
            }
          : prev,
      )
      onDomainUpdated({
        id: activeDomain.id,
        verification_records: result.verification_records ?? null,
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleVerify = async () => {
    setIsVerifying(true)
    try {
      const result = await customDomainsApi.verify(activeDomain.id)
      if (!result.success) {
        toast.error(result.error || DOMAINS_TOAST_ERRORS.VERIFICATION_FAILED.userMessage)
        return
      }
      setActiveDomain((prev) =>
        prev
          ? {
              ...prev,
              status: result.status,
              verification_records:
                result.verification_records ?? prev.verification_records ?? null,
              last_verification_check: new Date().toISOString(),
            }
          : prev,
      )
      onDomainUpdated({
        id: activeDomain.id,
        status: result.status,
        verification_records: result.verification_records ?? null,
      })
      if (result.status === 'verified') {
        toast.success(DOMAINS_TOAST_SUCCESS.DOMAIN_VERIFIED.userMessage)
      } else {
        toast.error(DOMAINS_TOAST_ERRORS.DNS_NOT_VERIFIED.userMessage)
      }
    } finally {
      setIsVerifying(false)
    }
  }

  const getHostPrefix = (record: DnsRecord, domainName: string) => {
    const name = record.name || ''
    const suffix = `.${domainName}`
    if (name === domainName) return '@'
    if (name.endsWith(suffix)) return name.slice(0, -suffix.length)
    return name
  }

  return (
    <DialogPrimitive.Root
      open={!!activeDomain}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="z-modal-backdrop-above fixed inset-0" />
        <DialogPrimitive.Content className="z-modal-layer-4 sm:p-spacing-4 md:p-spacing-6 fixed inset-0 flex items-center justify-center overflow-hidden p-2">
          <VisuallyHidden.Root>
            <DialogPrimitive.Title>
              DNS Records for {activeDomain.domain_name}
            </DialogPrimitive.Title>
          </VisuallyHidden.Root>

          <div className="relative h-full w-full max-w-none sm:h-auto sm:max-h-[85vh] sm:max-w-4xl">
            <div className="surface-card card-elevated rounded-spacing-4 wizard-container-border flex h-full flex-col overflow-hidden">
              <div className="px-spacing-4 sm:px-spacing-6 pt-spacing-4 pb-spacing-2">
                <div className="flex items-center justify-between">
                  <div className="gap-spacing-3 flex items-center">
                    <h2 className="title-h6">{activeDomain.domain_name}</h2>
                    {statusBadge(activeDomain.status)}
                  </div>
                  <button
                    type="button"
                    aria-label="Close DNS records"
                    onClick={onClose}
                    className="btn-icon-bare"
                  >
                    <X className="icon-xs" />
                  </button>
                </div>
                <DialogPrimitive.Description className="body-3 text-muted-foreground mt-spacing-1">
                  Add these DNS records to your domain provider to verify ownership.
                </DialogPrimitive.Description>
              </div>

              <div className="px-spacing-4 sm:px-spacing-6 py-spacing-4 space-y-spacing-6 flex-1 overflow-y-auto">
                {/* Mobile: stacked cards */}
                <div className="space-y-3 md:hidden">
                  {dnsRecords.length === 0 ? (
                    <p className="body-3 text-muted-foreground py-6 text-center">
                      No DNS records found yet.
                    </p>
                  ) : (
                    dnsRecords.map((record, index) => (
                      <div
                        key={index}
                        className="rounded-spacing-2 border-border space-y-2 border p-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="body-3 text-muted-foreground font-mono uppercase">
                            {record.type}
                          </span>
                          {activeDomain.status === 'verified' ? (
                            <span className="gap-spacing-1 tint-green inline-flex items-center">
                              <Check className="icon-xs" />
                              <span className="body-3">Valid</span>
                            </span>
                          ) : (
                            <span className="body-3 text-warning">Pending</span>
                          )}
                        </div>
                        <div>
                          <span className="body-4 text-muted-foreground block">Host</span>
                          <button
                            type="button"
                            aria-label={`Copy host ${getHostPrefix(record, activeDomain.domain_name)}`}
                            onClick={() =>
                              copyToClipboard(getHostPrefix(record, activeDomain.domain_name))
                            }
                            className="body-3 text-foreground block w-full truncate text-left font-mono"
                          >
                            {getHostPrefix(record, activeDomain.domain_name)}
                          </button>
                        </div>
                        <div>
                          <span className="body-4 text-muted-foreground block">Value</span>
                          <button
                            type="button"
                            aria-label={`Copy value ${record.value}`}
                            onClick={() => copyToClipboard(record.value)}
                            className="body-4 text-foreground block w-full break-all text-left font-mono"
                          >
                            {record.value}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Desktop: table */}
                <div className="rounded-spacing-2 border-border hidden overflow-hidden border md:block">
                  <table className="w-full">
                    <thead>
                      <tr className="border-border bg-muted/30 border-b">
                        <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
                          Type
                        </th>
                        <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
                          Host
                        </th>
                        <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
                          Value
                        </th>
                        <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {dnsRecords.map((record, index) => (
                        <tr key={index} className="border-border border-t">
                          <td className="px-spacing-3 py-spacing-2 body-3 text-muted-foreground font-mono uppercase">
                            {record.type}
                          </td>
                          <td className="px-spacing-3 py-spacing-2 body-3 text-muted-foreground overflow-hidden font-mono">
                            <button
                              type="button"
                              aria-label={`Copy host ${getHostPrefix(record, activeDomain.domain_name)}`}
                              className="hover:text-foreground block w-full cursor-pointer truncate text-left transition-colors"
                              onClick={() =>
                                copyToClipboard(getHostPrefix(record, activeDomain.domain_name))
                              }
                              title={
                                copiedValue === getHostPrefix(record, activeDomain.domain_name)
                                  ? 'Copied!'
                                  : 'Click to copy'
                              }
                            >
                              {getHostPrefix(record, activeDomain.domain_name)}
                            </button>
                          </td>
                          <td className="px-spacing-3 py-spacing-2 overflow-hidden">
                            <button
                              type="button"
                              aria-label={`Copy value ${record.value}`}
                              className="body-3 text-muted-foreground hover:text-foreground block w-full cursor-pointer truncate text-left font-mono transition-colors"
                              onClick={() => copyToClipboard(record.value)}
                              title={copiedValue === record.value ? 'Copied!' : 'Click to copy'}
                            >
                              {record.value}
                            </button>
                          </td>
                          <td className="px-spacing-3 py-spacing-2">
                            {activeDomain.status === 'verified' ? (
                              <span className="gap-spacing-1 tint-green inline-flex items-center">
                                <Check className="icon-xs" />
                                <span className="body-3">Valid</span>
                              </span>
                            ) : (
                              <span className="body-3 text-warning">Pending</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {dnsRecords.length === 0 && (
                        <tr className="border-border border-t">
                          <td
                            className="px-spacing-3 py-spacing-6 body-3 text-muted-foreground"
                            colSpan={4}
                          >
                            No DNS records found yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <p className="body-4 text-muted-foreground text-center">
                  DNS changes can take up to 24 hours to propagate
                </p>
              </div>

              <div className="px-spacing-4 sm:px-spacing-6 py-spacing-4 border-border flex flex-wrap items-center justify-between gap-2 border-t">
                <button
                  type="button"
                  onClick={onClose}
                  className="button-glass-neutral hover:bg-hover-subtle hover:text-foreground rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200"
                >
                  Close
                </button>
                <div className="gap-spacing-2 flex items-center">
                  <button
                    type="button"
                    onClick={handleRefreshRecords}
                    disabled={isRefreshing || isVerifying}
                    className="button-glass-neutral rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
                  >
                    {isRefreshing ? (
                      <span className="gap-spacing-2 flex items-center">
                        <Loader2 className="icon-sm animate-spin" />
                        <span className="hidden sm:inline">Refreshing...</span>
                      </span>
                    ) : (
                      'Refresh'
                    )}
                  </button>
                  {domain?.status !== 'verified' && (
                    <button
                      type="button"
                      onClick={handleVerify}
                      disabled={isVerifying || isRefreshing}
                      className="button-glass-accent rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
                    >
                      {isVerifying ? (
                        <span className="gap-spacing-2 flex items-center">
                          <Loader2 className="icon-sm animate-spin" />
                          <span className="hidden sm:inline">Verifying...</span>
                        </span>
                      ) : (
                        <span>
                          <span className="sm:hidden">Verify</span>
                          <span className="hidden sm:inline">Verify DNS Records</span>
                        </span>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
