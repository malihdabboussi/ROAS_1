'use client'

import { useCallback, useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { ImageIcon, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { backendPost } from '@/lib/api/backend-client'
import { MEDIA_TOAST_ERRORS } from '@/lib/config/media-toast-errors.config'
import type { MediaAsset } from '@/lib/services/media-api'

interface AddFromUrlModalProps {
  open: boolean
  onClose: () => void
  campaignId?: string
  onUploaded: () => void
}

export function AddFromUrlModal({ open, onClose, campaignId, onUploaded }: AddFromUrlModalProps) {
  const [url, setUrl] = useState('')
  const [previewError, setPreviewError] = useState(false)
  const [previewLoaded, setPreviewLoaded] = useState(false)
  const [uploading, setUploading] = useState(false)

  const reset = useCallback(() => {
    setUrl('')
    setPreviewError(false)
    setPreviewLoaded(false)
    setUploading(false)
  }, [])

  const handleClose = useCallback(() => {
    reset()
    onClose()
  }, [reset, onClose])

  const handleUrlChange = useCallback((value: string) => {
    setUrl(value)
    setPreviewError(false)
    setPreviewLoaded(false)
  }, [])

  const isValidUrl = url.trim().length > 0 && /^https?:\/\/.+/i.test(url.trim())

  const handleSave = useCallback(async () => {
    if (!isValidUrl) return
    setUploading(true)
    try {
      const result = await backendPost<{ success?: boolean; asset?: MediaAsset; url?: string }>(
        '/api/media/import-url',
        {
          url: url.trim(),
          ...(campaignId ? { campaign_id: campaignId } : {}),
          category: 'product',
        },
      )
      if (result.success === false) {
        throw new Error(MEDIA_TOAST_ERRORS.ADD_TO_LIBRARY_FAILED.userMessage)
      }
      toast.success('Added to library')
      onUploaded()
      handleClose()
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : MEDIA_TOAST_ERRORS.ADD_TO_LIBRARY_FAILED.userMessage,
      )
    } finally {
      setUploading(false)
    }
  }, [isValidUrl, url, campaignId, onUploaded, handleClose])

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(o) => {
        if (!o) handleClose()
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="z-modal-backdrop fixed inset-0" />
        <DialogPrimitive.Content className="z-modal-layer-3 fixed inset-0 flex items-center justify-center p-4">
          <VisuallyHidden.Root>
            <DialogPrimitive.Title>Add from URL</DialogPrimitive.Title>
            <DialogPrimitive.Description>
              Import an image from a public web address.
            </DialogPrimitive.Description>
          </VisuallyHidden.Root>
          <div className="surface-card card-elevated rounded-spacing-4 wizard-container-border w-full max-w-md overflow-hidden">
            <div className="px-spacing-5 pt-spacing-4 pb-spacing-3 flex items-center justify-between">
              <h3 className="title-h4 text-foreground">ADD FROM URL</h3>
              <button
                type="button"
                aria-label="Close URL import"
                onClick={handleClose}
                className="btn-icon-bare rounded-spacing-2"
              >
                <X className="icon-md" />
              </button>
            </div>

            <div className="px-spacing-5 pb-spacing-5 space-y-spacing-4">
              <label htmlFor="media-import-url" className="sr-only">
                Image URL
              </label>
              <input
                id="media-import-url"
                type="url"
                value={url}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="input-glass body-3 h-spacing-10 w-full rounded-lg px-3"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && isValidUrl && previewLoaded && !uploading)
                    void handleSave()
                }}
              />

              <div className="rounded-spacing-2 bg-muted/30 relative flex aspect-video w-full items-center justify-center overflow-hidden">
                {isValidUrl && !previewError ? (
                  <>
                    {!previewLoaded && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="icon-md text-muted-foreground animate-spin" />
                      </div>
                    )}
                    <img
                      src={url.trim()}
                      alt="Preview"
                      className={`h-full w-full object-contain transition-opacity ${previewLoaded ? 'opacity-100' : 'opacity-0'}`}
                      onLoad={() => setPreviewLoaded(true)}
                      onError={() => setPreviewError(true)}
                    />
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <ImageIcon className="text-muted-foreground/40 h-8 w-8" />
                    <p className="body-4 text-muted-foreground">
                      {previewError ? 'Could not load image' : 'Paste a URL to preview'}
                    </p>
                  </div>
                )}
              </div>

              <div className="gap-spacing-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleClose}
                  className="button-glass-neutral rounded-lg px-4 py-2 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={!isValidUrl || !previewLoaded || uploading}
                  className="button-glass-blue rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  {uploading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </span>
                  ) : (
                    'Add to Library'
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
