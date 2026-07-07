'use client'

import { useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { ChevronDown, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { EMAIL_ERRORS } from '../../config/email-errors.config'
import { EMAIL_MESSAGES } from '../../config/email-messages.config'
import { useEmailDomains } from '../../providers/EmailDomainsProvider'
import type { EmailDomain } from '../../types/email.types'

interface AddEmailDomainDialogProps {
  isOpen: boolean
  onClose: () => void
  onDomainAdded?: (domain: EmailDomain) => void
}

export function AddEmailDomainDialog({
  isOpen,
  onClose,
  onDomainAdded,
}: AddEmailDomainDialogProps) {
  const { addDomain } = useEmailDomains()
  const [domain, setDomain] = useState('')
  const [subdomain, setSubdomain] = useState('')
  const [customDkimSelector, setCustomDkimSelector] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [isAdding, setIsAdding] = useState(false)

  const handleSubmit = async () => {
    if (!domain) return
    setIsAdding(true)
    try {
      const result = await addDomain(
        domain,
        subdomain || undefined,
        customDkimSelector || undefined,
      )
      if (result.success && result.domain) {
        toast.success(EMAIL_MESSAGES.SUCCESS_DOMAIN_ADDED.message)
        onDomainAdded?.(result.domain)
        resetForm()
        onClose()
      } else {
        toast.error(result.error || EMAIL_ERRORS.ADD_DOMAIN_FAILED.userMessage)
      }
    } finally {
      setIsAdding(false)
    }
  }

  const resetForm = () => {
    setDomain('')
    setSubdomain('')
    setCustomDkimSelector('')
    setShowAdvanced(false)
  }

  return (
    <DialogPrimitive.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="z-modal-backdrop-above fixed inset-0" />
        <DialogPrimitive.Content className="z-modal-layer-4 sm:p-spacing-4 md:p-spacing-6 fixed inset-0 flex items-center justify-center overflow-hidden p-2">
          <VisuallyHidden.Root>
            <DialogPrimitive.Title>Add Sending Domain</DialogPrimitive.Title>
          </VisuallyHidden.Root>

          <div className="relative h-full w-full max-w-none sm:h-auto sm:max-h-[85vh] sm:max-w-lg">
            <div className="surface-card card-elevated rounded-spacing-4 wizard-container-border flex h-full flex-col overflow-hidden">
              {/* Header */}
              <div className="px-spacing-4 sm:px-spacing-6 pt-spacing-4 pb-spacing-2">
                <div className="flex items-center justify-between">
                  <h2 className="title-h6">Add Sending Domain</h2>
                  <button onClick={onClose} className="btn-icon-bare">
                    <X className="icon-xs" />
                  </button>
                </div>
                <p className="body-3 text-muted-foreground mt-spacing-1">
                  Authenticate your domain to send emails with better deliverability
                </p>
              </div>

              {/* Body */}
              <div className="px-spacing-6 py-spacing-4 space-y-spacing-4 flex-1 overflow-y-auto">
                <div className="space-y-spacing-2">
                  <label htmlFor="domain" className="body-3 text-foreground">
                    Domain Name *
                  </label>
                  <input
                    id="domain"
                    type="text"
                    className="input-glass w-full"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    placeholder="yourdomain.com"
                    disabled={isAdding}
                  />
                  <p className="body-4 text-muted-foreground">
                    Enter the domain you'll send emails from
                  </p>
                </div>

                <div className="space-y-spacing-2">
                  <label htmlFor="subdomain" className="body-3 text-foreground">
                    Subdomain (optional)
                  </label>
                  <input
                    id="subdomain"
                    type="text"
                    className="input-glass w-full"
                    value={subdomain}
                    onChange={(e) => setSubdomain(e.target.value)}
                    placeholder="mail"
                    disabled={isAdding}
                  />
                  <p className="body-4 text-muted-foreground">
                    Use a subdomain like "mail" or "em" if your main domain is already authenticated
                    elsewhere
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="gap-spacing-1 body-3 text-muted-foreground hover:text-foreground flex items-center transition-colors"
                >
                  <ChevronDown
                    className={`icon-xs transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
                  />
                  Advanced options
                </button>

                {showAdvanced && (
                  <div className="space-y-spacing-2">
                    <label htmlFor="dkim" className="body-3 text-foreground">
                      Custom DKIM Selector
                    </label>
                    <input
                      id="dkim"
                      type="text"
                      className="input-glass w-full"
                      value={customDkimSelector}
                      onChange={(e) => setCustomDkimSelector(e.target.value)}
                      placeholder="vo1"
                      maxLength={3}
                      disabled={isAdding}
                    />
                    <p className="body-4 text-muted-foreground">
                      3-character selector to avoid conflicts when domain is used by another
                      platform (Kit, Mailchimp, etc.)
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-spacing-6 py-spacing-4 border-border flex items-center justify-between border-t">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isAdding}
                  className="button-glass-neutral hover:bg-hover-subtle hover:text-foreground rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isAdding || !domain}
                  className="button-glass-accent rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  {isAdding ? (
                    <span className="gap-spacing-2 flex items-center">
                      <Loader2 className="icon-sm animate-spin" />
                      Adding...
                    </span>
                  ) : (
                    'Add Domain'
                  )}
                </button>
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
