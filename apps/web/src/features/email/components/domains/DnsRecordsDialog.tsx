'use client'

import { useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { Check, ExternalLink, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { EMAIL_ERRORS } from '../../config/email-errors.config'
import { EMAIL_MESSAGES } from '../../config/email-messages.config'
import { useEmailDomains } from '../../providers/EmailDomainsProvider'
import type { EmailDnsRecord, EmailDomain } from '../../types/email.types'

interface DnsRecordsDialogProps {
  domain: EmailDomain | null
  onClose: () => void
}

export function DnsRecordsDialog({ domain, onClose }: DnsRecordsDialogProps) {
  const { domains, verifyDomain } = useEmailDomains()
  const [isVerifying, setIsVerifying] = useState(false)
  const [copiedValue, setCopiedValue] = useState<string | null>(null)

  if (!domain) return null

  const activeDomain = domains.find((row) => row.id === domain.id) || domain
  const dnsRecords = activeDomain.dns_records || []
  const fullDomain = activeDomain.subdomain
    ? `${activeDomain.subdomain}.${activeDomain.domain}`
    : activeDomain.domain

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedValue(text)
    toast.success(EMAIL_MESSAGES.SUCCESS_COPIED.message)
    setTimeout(() => setCopiedValue(null), 2000)
  }

  const handleVerify = async () => {
    setIsVerifying(true)
    try {
      const result = await verifyDomain(activeDomain.id)
      if (result.isValid) {
        toast.success(EMAIL_MESSAGES.SUCCESS_DOMAIN_VERIFIED.message)
      } else {
        toast.error(EMAIL_ERRORS.DNS_SOME_NOT_VERIFIED.userMessage)
      }
    } finally {
      setIsVerifying(false)
    }
  }

  const getRecordPurpose = (host: string) => {
    if (host.includes('domainkey') || host.startsWith('s1.') || host.startsWith('s2.'))
      return 'DKIM'
    if (host.startsWith('em') || host.includes('sendgrid')) return 'SPF/Tracking'
    return 'Email Auth'
  }

  const getHostPrefix = (host: string, domainStr: string) => {
    const suffix = `.${domainStr}`
    if (host.endsWith(suffix)) return host.slice(0, -suffix.length)
    return host
  }

  const statusBadge =
    activeDomain.status === 'verified' ? (
      <span className="badge-glass badge-glass-green">Verified</span>
    ) : activeDomain.status === 'failed' ? (
      <span className="badge-glass badge-glass-red">Failed</span>
    ) : (
      <span className="badge-glass badge-glass-orange">Pending</span>
    )

  return (
    <DialogPrimitive.Root
      open={!!domain}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="z-modal-backdrop-above fixed inset-0" />
        <DialogPrimitive.Content className="z-modal-layer-4 sm:p-spacing-4 md:p-spacing-6 fixed inset-0 flex items-center justify-center overflow-hidden p-2">
          <VisuallyHidden.Root>
            <DialogPrimitive.Title>DNS Records for {fullDomain}</DialogPrimitive.Title>
          </VisuallyHidden.Root>

          <div className="relative h-full w-full max-w-none sm:h-auto sm:max-h-[85vh] sm:max-w-4xl">
            <div className="surface-card card-elevated rounded-spacing-4 wizard-container-border flex h-full flex-col overflow-hidden">
              {/* Header */}
              <div className="px-spacing-4 sm:px-spacing-6 pt-spacing-4 pb-spacing-2">
                <div className="flex items-center justify-between">
                  <div className="gap-spacing-3 flex items-center">
                    <h2 className="title-h6">{fullDomain}</h2>
                    {statusBadge}
                  </div>
                  <button
                    type="button"
                    aria-label="Close email DNS records"
                    onClick={onClose}
                    className="btn-icon-bare"
                  >
                    <X className="icon-xs" />
                  </button>
                </div>
                <DialogPrimitive.Description className="body-3 text-muted-foreground mt-spacing-1">
                  Add these DNS records to your domain provider to verify ownership
                </DialogPrimitive.Description>
              </div>

              {/* Body */}
              <div className="px-spacing-6 py-spacing-4 space-y-spacing-6 flex-1 overflow-y-auto">
                <div className="rounded-spacing-2 border-border overflow-hidden border">
                  <table className="w-full">
                    <thead>
                      <tr className="border-border bg-muted/30 border-b">
                        <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
                          Type
                        </th>
                        <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
                          Purpose
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
                      {dnsRecords.map((record: EmailDnsRecord, index: number) => (
                        <tr key={index} className="border-border border-t">
                          <td className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground font-mono uppercase">
                            {record.type}
                          </td>
                          <td className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground">
                            {getRecordPurpose(record.host)}
                          </td>
                          <td className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground overflow-hidden font-mono">
                            <button
                              type="button"
                              aria-label={`Copy host ${getHostPrefix(record.host, activeDomain.domain)}`}
                              className="hover:text-foreground block w-full cursor-pointer truncate text-left transition-colors"
                              onClick={() =>
                                copyToClipboard(getHostPrefix(record.host, activeDomain.domain))
                              }
                              title={
                                copiedValue === getHostPrefix(record.host, activeDomain.domain)
                                  ? 'Copied!'
                                  : 'Click to copy'
                              }
                            >
                              {getHostPrefix(record.host, activeDomain.domain)}
                            </button>
                          </td>
                          <td className="px-spacing-3 py-spacing-2 overflow-hidden">
                            <button
                              type="button"
                              aria-label={`Copy value ${record.data}`}
                              className="body-4 text-muted-foreground hover:text-foreground block w-full cursor-pointer truncate text-left font-mono transition-colors"
                              onClick={() => copyToClipboard(record.data)}
                              title={copiedValue === record.data ? 'Copied!' : 'Click to copy'}
                            >
                              {record.data}
                            </button>
                          </td>
                          <td className="px-spacing-3 py-spacing-2">
                            {record.valid ? (
                              <span className="gap-spacing-1 tint-green inline-flex items-center">
                                <Check className="icon-xs" />
                                <span className="body-4">Valid</span>
                              </span>
                            ) : (
                              <span className="body-4 text-warning">Pending</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {/* DMARC Record */}
                      <tr className="border-border border-t">
                        <td className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground font-mono uppercase">
                          TXT
                        </td>
                        <td className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground">
                          DMARC
                        </td>
                        <td className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground overflow-hidden font-mono">
                          <button
                            type="button"
                            aria-label="Copy host _dmarc"
                            className="hover:text-foreground block w-full cursor-pointer truncate text-left transition-colors"
                            onClick={() => copyToClipboard('_dmarc')}
                          >
                            _dmarc
                          </button>
                        </td>
                        <td className="px-spacing-3 py-spacing-2 overflow-hidden">
                          <button
                            type="button"
                            aria-label="Copy value v=DMARC1; p=none;"
                            className="body-4 text-muted-foreground hover:text-foreground block w-full cursor-pointer truncate text-left font-mono transition-colors"
                            onClick={() => copyToClipboard('v=DMARC1; p=none;')}
                          >
                            v=DMARC1; p=none;
                          </button>
                        </td>
                        <td className="px-spacing-3 py-spacing-2">
                          <span className="body-4 text-muted-foreground">—</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <p className="body-4 text-muted-foreground text-center">
                  DNS changes can take up to 48 hours to propagate
                </p>

                <div className="flex justify-center">
                  <a
                    href="https://docs.sendgrid.com/ui/account-and-settings/how-to-set-up-domain-authentication"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="gap-spacing-1 body-3 text-primary flex items-center hover:underline"
                  >
                    <span>SendGrid DNS Setup Guide</span>
                    <ExternalLink className="icon-xs" />
                  </a>
                </div>
              </div>

              {/* Footer */}
              <div className="px-spacing-6 py-spacing-4 border-border flex items-center justify-between border-t">
                <button
                  type="button"
                  onClick={onClose}
                  className="button-glass-neutral hover:bg-hover-subtle hover:text-foreground rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200"
                >
                  Close
                </button>
                {activeDomain.status !== 'verified' && (
                  <button
                    type="button"
                    onClick={handleVerify}
                    disabled={isVerifying}
                    className="button-glass-accent rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
                  >
                    {isVerifying ? (
                      <span className="gap-spacing-2 flex items-center">
                        <Loader2 className="icon-sm animate-spin" />
                        Verifying...
                      </span>
                    ) : (
                      'Verify DNS Records'
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
