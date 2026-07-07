'use client'

import { useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { ADS_TOAST_ERRORS } from '../../config/ads-toast-errors.config'
import { createMetaPixel } from '../../services/artifact-preview.service'

interface CreateMetaPixelDialogProps {
  isOpen: boolean
  adAccountId: string
  onClose: () => void
  onCreated: (pixel: { id: string; name?: string }) => void
}

export function CreateMetaPixelDialog({
  isOpen,
  adAccountId,
  onClose,
  onCreated,
}: CreateMetaPixelDialogProps) {
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)

  const handleSubmit = async () => {
    if (!name.trim()) return
    setCreating(true)
    try {
      const pixel = await createMetaPixel(adAccountId, { name: name.trim() })
      onCreated(pixel)
      setName('')
      onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('already exists')) {
        toast.error(ADS_TOAST_ERRORS.PIXEL_ALREADY_EXISTS.userMessage)
      } else if (msg.includes('Multiple pixels')) {
        toast.error(ADS_TOAST_ERRORS.PIXEL_MULTIPLE_EXIST.userMessage)
      } else if (msg.includes('permission') || msg.includes('Insufficient')) {
        toast.error(ADS_TOAST_ERRORS.PIXEL_PERMISSION_DENIED.userMessage)
      } else if (msg.includes('Invalid')) {
        toast.error(ADS_TOAST_ERRORS.PIXEL_INVALID_NAME.userMessage)
      } else {
        toast.error(msg.trim() || ADS_TOAST_ERRORS.PIXEL_CREATE_FAILED.userMessage)
      }
    } finally {
      setCreating(false)
    }
  }

  return (
    <DialogPrimitive.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          setName('')
          onClose()
        }
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="z-modal-backdrop-above fixed inset-0" />
        <DialogPrimitive.Content className="z-modal-layer-4 sm:p-spacing-4 md:p-spacing-6 fixed inset-0 flex items-center justify-center overflow-hidden p-2">
          <VisuallyHidden.Root>
            <DialogPrimitive.Title>Create Meta Pixel</DialogPrimitive.Title>
          </VisuallyHidden.Root>

          <div className="relative h-full w-full max-w-none sm:h-auto sm:max-h-[85vh] sm:max-w-md">
            <div className="surface-card card-elevated rounded-spacing-4 wizard-container-border flex h-full flex-col overflow-hidden">
              <div className="px-spacing-4 sm:px-spacing-6 pt-spacing-4 pb-spacing-2">
                <div className="flex items-center justify-between">
                  <h2 className="title-h6">Create Meta Pixel</h2>
                  <button onClick={onClose} className="btn-icon-bare">
                    <X className="icon-xs" />
                  </button>
                </div>
                <p className="body-3 text-muted-foreground mt-spacing-1">
                  Create a new tracking pixel for this ad account
                </p>
              </div>

              <div className="px-spacing-6 py-spacing-4 space-y-spacing-4 flex-1 overflow-y-auto">
                <div className="space-y-spacing-2">
                  <label htmlFor="pixel-name" className="body-3 text-foreground">
                    Pixel Name *
                  </label>
                  <input
                    id="pixel-name"
                    type="text"
                    className="input-glass w-full"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && name.trim()) void handleSubmit()
                    }}
                    placeholder="e.g. My Website Pixel"
                    disabled={creating}
                    autoFocus
                  />
                  <p className="body-4 text-muted-foreground">
                    Give your pixel a descriptive name to identify it later
                  </p>
                </div>
              </div>

              <div className="px-spacing-6 py-spacing-4 border-border flex items-center justify-between border-t">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={creating}
                  className="button-glass-neutral hover:bg-hover-subtle hover:text-foreground rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={creating || !name.trim()}
                  className="button-glass-accent rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  {creating ? (
                    <span className="gap-spacing-2 flex items-center">
                      <Loader2 className="icon-sm animate-spin" />
                      Creating...
                    </span>
                  ) : (
                    'Create Pixel'
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
