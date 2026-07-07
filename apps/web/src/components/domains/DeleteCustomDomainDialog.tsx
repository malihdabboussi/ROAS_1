'use client'

import { useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { AlertTriangle, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  DOMAINS_TOAST_ERRORS,
  DOMAINS_TOAST_SUCCESS,
} from '@/lib/domains/domains-toast-errors.config'
import { customDomainsApi } from '@/lib/domains/custom-domains-api'
import type { CustomDomain } from '@/lib/domains/domains.types'

export function DeleteCustomDomainDialog({
  domain,
  onClose,
  onDeleted,
}: {
  domain: CustomDomain | null
  onClose: () => void
  onDeleted: (domainId: string) => void
}) {
  const [confirmText, setConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  if (!domain) return null

  const canDelete = confirmText === 'DELETE'
  const isGenerated = domain.domain_type === 'generated'

  const handleDelete = async () => {
    if (!canDelete || isGenerated) return
    setIsDeleting(true)
    try {
      await customDomainsApi.remove(domain.id)
      toast.success(DOMAINS_TOAST_SUCCESS.DOMAIN_REMOVED.userMessage)
      onDeleted(domain.id)
      setConfirmText('')
      onClose()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : DOMAINS_TOAST_ERRORS.DELETE_DOMAIN_FAILED.userMessage,
      )
    } finally {
      setIsDeleting(false)
    }
  }

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
            <DialogPrimitive.Title>Delete Domain</DialogPrimitive.Title>
          </VisuallyHidden.Root>

          <div className="relative h-full w-full max-w-none sm:h-auto sm:max-h-[85vh] sm:max-w-lg">
            <div className="surface-card card-elevated rounded-spacing-4 wizard-container-border flex h-full flex-col overflow-hidden">
              <div className="px-spacing-4 sm:px-spacing-6 pt-spacing-4 pb-spacing-2">
                <div className="flex items-center justify-between">
                  <div className="gap-spacing-2 flex items-center">
                    <AlertTriangle className="icon-sm text-destructive" />
                    <h2 className="title-h6">Delete Domain</h2>
                  </div>
                  <button onClick={onClose} className="btn-icon-bare">
                    <X className="icon-xs" />
                  </button>
                </div>
              </div>

              <div className="px-spacing-6 py-spacing-4 space-y-spacing-4 flex-1 overflow-y-auto">
                {isGenerated ? (
                  <p className="body-3 text-muted-foreground">
                    This is your generated subdomain and cannot be deleted.
                  </p>
                ) : (
                  <>
                    <p className="body-2 text-foreground">
                      Are you sure you want to delete <strong>{domain.domain_name}</strong>?
                    </p>
                    <p className="body-3 text-muted-foreground">
                      This will remove the domain from the domain provider and from Vibey. This
                      action cannot be undone.
                    </p>

                    <div className="space-y-spacing-2">
                      <label className="body-3 text-foreground">
                        Type <strong>DELETE</strong> to confirm
                      </label>
                      <input
                        type="text"
                        className="input-glass w-full"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        placeholder="DELETE"
                        disabled={isDeleting}
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="px-spacing-6 py-spacing-4 border-border flex items-center justify-between border-t">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isDeleting}
                  className="button-glass-neutral hover:bg-hover-subtle hover:text-foreground rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={!canDelete || isDeleting || isGenerated}
                  className="button-glass-destructive rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  {isDeleting ? (
                    <span className="gap-spacing-2 flex items-center">
                      <Loader2 className="icon-sm animate-spin" />
                      Deleting...
                    </span>
                  ) : (
                    'Delete Domain'
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
