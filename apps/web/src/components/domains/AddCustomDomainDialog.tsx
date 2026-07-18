'use client'

import { useEffect, useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { customDomainsApi } from '@/lib/domains/custom-domains-api'
import {
  DOMAINS_TOAST_ERRORS,
  DOMAINS_TOAST_SUCCESS,
} from '@/lib/domains/domains-toast-errors.config'
import type { CustomDomain } from '@/lib/domains/domains.types'

export function AddCustomDomainDialog({
  isOpen,
  onClose,
  onDomainAdded,
}: {
  isOpen: boolean
  onClose: () => void
  onDomainAdded: (domain: CustomDomain) => void
}) {
  const [domainName, setDomainName] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setDomainName('')
    setIsAdding(false)
  }, [isOpen])

  const handleSubmit = async () => {
    if (!domainName) return
    setIsAdding(true)
    try {
      const result = await customDomainsApi.add(domainName)
      if (!result.success || !result.domain) {
        toast.error(result.error || DOMAINS_TOAST_ERRORS.ADD_DOMAIN_FAILED.userMessage)
        return
      }
      toast.success(DOMAINS_TOAST_SUCCESS.DOMAIN_ADDED.userMessage)
      onDomainAdded({
        ...result.domain,
        verification_records:
          result.verification_records ?? result.domain.verification_records ?? null,
      })
      onClose()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : DOMAINS_TOAST_ERRORS.ADD_DOMAIN_FAILED.userMessage,
      )
    } finally {
      setIsAdding(false)
    }
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
            <DialogPrimitive.Title>Add Custom Domain</DialogPrimitive.Title>
          </VisuallyHidden.Root>

          <div className="relative h-full w-full max-w-none sm:h-auto sm:max-h-[85vh] sm:max-w-lg">
            <div className="surface-card card-elevated rounded-spacing-4 wizard-container-border flex h-full flex-col overflow-hidden">
              <div className="px-spacing-4 sm:px-spacing-6 pt-spacing-4 pb-spacing-2">
                <div className="flex items-center justify-between">
                  <h2 className="title-h6">Add Custom Domain</h2>
                  <button
                    type="button"
                    aria-label="Close add custom domain"
                    onClick={onClose}
                    className="btn-icon-bare"
                    disabled={isAdding}
                  >
                    <X className="icon-xs" />
                  </button>
                </div>
                <DialogPrimitive.Description className="body-3 text-muted-foreground mt-spacing-1">
                  Add a domain you own, then verify DNS to connect it to funnels and presentations.
                </DialogPrimitive.Description>
              </div>

              <div className="px-spacing-6 py-spacing-4 space-y-spacing-4 flex-1 overflow-y-auto">
                <div className="space-y-spacing-2">
                  <label htmlFor="domain-name" className="body-3 text-foreground">
                    Domain Name *
                  </label>
                  <input
                    id="domain-name"
                    type="text"
                    className="input-glass w-full"
                    value={domainName}
                    onChange={(e) => setDomainName(e.target.value)}
                    placeholder="promo.example.com"
                    disabled={isAdding}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        void handleSubmit()
                      }
                    }}
                  />
                  <p className="body-4 text-muted-foreground">
                    Enter the full host (example: promo.example.com) without http:// or https://
                  </p>
                </div>
              </div>

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
                  disabled={isAdding || !domainName}
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
