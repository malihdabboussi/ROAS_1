'use client'

import { useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { AlertTriangle, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { EMAIL_ERRORS } from '../../config/email-errors.config'
import { EMAIL_MESSAGES } from '../../config/email-messages.config'
import { useEmailDomains } from '../../providers/EmailDomainsProvider'
import { useSenderIdentities } from '../../providers/SenderIdentitiesProvider'
import type { EmailDomain } from '../../types/email.types'

interface DeleteDomainDialogProps {
  domain: EmailDomain | null
  onClose: () => void
}

export function DeleteDomainDialog({ domain, onClose }: DeleteDomainDialogProps) {
  const { removeDomain } = useEmailDomains()
  const { senderIdentities } = useSenderIdentities()
  const [confirmText, setConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  if (!domain) return null

  const connectedSenders = senderIdentities.filter((s) => s.domain_id === domain.id)
  const fullDomain = domain.subdomain ? `${domain.subdomain}.${domain.domain}` : domain.domain
  const canDelete = confirmText === 'DELETE'

  const handleDelete = async () => {
    if (!canDelete) return
    setIsDeleting(true)
    try {
      await removeDomain(domain.id)
      toast.success(EMAIL_MESSAGES.SUCCESS_DOMAIN_DELETED.message)
      setConfirmText('')
      onClose()
    } catch {
      toast.error(EMAIL_ERRORS.DELETE_DOMAIN_FAILED.userMessage)
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
              {/* Header */}
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

              {/* Body */}
              <div className="px-spacing-6 py-spacing-4 space-y-spacing-4 flex-1 overflow-y-auto">
                <p className="body-2 text-foreground">
                  Are you sure you want to delete <strong>{fullDomain}</strong>?
                </p>
                <p className="body-3 text-muted-foreground">
                  This will remove the domain from SendGrid and delete all associated DNS records.
                  This action cannot be undone.
                </p>

                {connectedSenders.length > 0 && (
                  <div className="surface-bg border-border rounded-spacing-2 p-spacing-4 border">
                    <p className="body-3 text-foreground mb-spacing-2 font-medium">
                      Connected sender identities ({connectedSenders.length}):
                    </p>
                    <ul className="space-y-spacing-1">
                      {connectedSenders.map((s) => (
                        <li
                          key={s.id}
                          className="body-3 text-muted-foreground gap-spacing-2 flex items-center"
                        >
                          <span className="bg-muted-foreground h-1.5 w-1.5 flex-shrink-0 rounded-full" />
                          {s.from_email}
                        </li>
                      ))}
                    </ul>
                    <p className="body-4 text-destructive mt-spacing-2">
                      These sender identities will also be deleted.
                    </p>
                  </div>
                )}

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
              </div>

              {/* Footer */}
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
                  disabled={!canDelete || isDeleting}
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
