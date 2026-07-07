'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, X } from 'lucide-react'
import type { TreeNode } from '../tree/types'

interface DeleteArtifactModalProps {
  open: boolean
  onClose: () => void
  node: TreeNode | null
  onConfirm: () => void
  isDeleting: boolean
  errorMessage: string | null
  sequenceDeleteMode: 'keep_unsent' | 'remove_unsent'
  onSequenceDeleteModeChange: (mode: 'keep_unsent' | 'remove_unsent') => void
  campaignDeleteMode: 'keep_ads' | 'delete_all'
  onCampaignDeleteModeChange: (mode: 'keep_ads' | 'delete_all') => void
  adSetDeleteMode: 'keep_ads' | 'delete_all'
  onAdSetDeleteModeChange: (mode: 'keep_ads' | 'delete_all') => void
}

export function DeleteArtifactModal({
  open,
  onClose,
  node,
  onConfirm,
  isDeleting,
  errorMessage,
  sequenceDeleteMode,
  onSequenceDeleteModeChange,
  campaignDeleteMode,
  onCampaignDeleteModeChange,
  adSetDeleteMode,
  onAdSetDeleteModeChange,
}: DeleteArtifactModalProps) {
  const [confirmText, setConfirmText] = useState('')

  useEffect(() => {
    if (!open) setConfirmText('')
  }, [open])

  if (!open || !node) return null

  const nestedItems = node.children ?? []
  const hasNested = nestedItems.length > 0
  const isSequenceDelete = node.type === 'sequence'
  const isCampaignDelete = node.type === 'ad-campaign' && !!node.resourceId
  const isAdSetDelete = node.type === 'ad-set' && !!node.resourceId
  const isAdSetPublishedToMeta = isAdSetDelete && !!node.isPublishedToMeta
  const isUngroupedBulkDelete = node.id === 'ungrouped-ads'

  return (
    <>
      <div
        className="z-modal-backdrop fixed inset-0 bg-modal-overlay"
        onClick={isDeleting ? undefined : onClose}
      />
      <div className="z-modal-content fixed inset-0 flex items-center justify-center overflow-hidden p-2 sm:p-4 md:p-6">
        <div className="surface-card wizard-container-border rounded-spacing-4 relative flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="btn-icon-bare btn-close-absolute"
          >
            <span className="sr-only">Close</span>
            <X className="h-4 w-4" />
          </button>
          <div className="px-spacing-6 pt-spacing-6 pb-spacing-4 flex flex-col items-center text-center">
            <div className="bg-destructive/10 mb-spacing-3 flex h-12 w-12 items-center justify-center rounded-full">
              <AlertCircle className="text-destructive h-6 w-6" />
            </div>
            <h2 className="title-h6 text-foreground">Delete {node.label}?</h2>
            <p className="body-3 text-muted-foreground mt-spacing-2">This cannot be undone.</p>
            {hasNested && (
              <div className="body-3 text-muted-foreground mt-spacing-3 bg-muted/30 p-spacing-3 w-full rounded-lg text-left">
                <p className="text-foreground mb-spacing-2 font-medium">
                  The following will also be deleted:
                </p>
                <ul className="list-inside list-disc space-y-1">
                  {nestedItems.map((c) => (
                    <li key={c.id}>{c.label}</li>
                  ))}
                </ul>
              </div>
            )}
            {isSequenceDelete && (
              <div className="body-3 text-muted-foreground mt-spacing-3 bg-muted/30 p-spacing-3 w-full rounded-lg text-left">
                <p className="text-foreground mb-spacing-2 font-medium">
                  What should happen to unsent emails in this sequence?
                </p>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => onSequenceDeleteModeChange('keep_unsent')}
                    className={`w-full rounded px-3 py-2 text-left transition-colors ${
                      sequenceDeleteMode === 'keep_unsent'
                        ? 'bg-primary/15 text-foreground'
                        : 'hover:bg-muted/40'
                    }`}
                  >
                    Keep unsent emails
                  </button>
                  <button
                    type="button"
                    onClick={() => onSequenceDeleteModeChange('remove_unsent')}
                    className={`w-full rounded px-3 py-2 text-left transition-colors ${
                      sequenceDeleteMode === 'remove_unsent'
                        ? 'bg-primary/15 text-foreground'
                        : 'hover:bg-muted/40'
                    }`}
                  >
                    Remove all unsent emails
                  </button>
                </div>
              </div>
            )}
            {(isCampaignDelete || (isAdSetDelete && !isAdSetPublishedToMeta)) && hasNested && (
              <div className="mt-spacing-3 w-full">
                <p className="body-3 text-muted-foreground mb-spacing-2 text-center font-medium">
                  What should happen to the ads?
                </p>
                <div className="gap-spacing-2 flex">
                  <button
                    type="button"
                    onClick={() =>
                      isCampaignDelete
                        ? onCampaignDeleteModeChange('keep_ads')
                        : onAdSetDeleteModeChange('keep_ads')
                    }
                    className={`body-3 flex-1 rounded-lg border px-3 py-2.5 text-center font-medium outline-none transition-all [-webkit-tap-highlight-color:transparent] focus:outline-none focus-visible:outline-none ${
                      (isCampaignDelete ? campaignDeleteMode : adSetDeleteMode) === 'keep_ads'
                        ? 'card-glass-blue text-foreground'
                        : 'bg-muted/20 text-muted-foreground hover:bg-muted/40 border-transparent'
                    }`}
                  >
                    Keep ads
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      isCampaignDelete
                        ? onCampaignDeleteModeChange('delete_all')
                        : onAdSetDeleteModeChange('delete_all')
                    }
                    className={`body-3 flex-1 rounded-lg border px-3 py-2.5 text-center font-medium outline-none transition-all [-webkit-tap-highlight-color:transparent] focus:outline-none focus-visible:outline-none ${
                      (isCampaignDelete ? campaignDeleteMode : adSetDeleteMode) === 'delete_all'
                        ? 'card-glass-blue text-foreground'
                        : 'bg-muted/20 text-muted-foreground hover:bg-muted/40 border-transparent'
                    }`}
                  >
                    Delete all
                  </button>
                </div>
              </div>
            )}
            {isUngroupedBulkDelete && (
              <div className="body-3 text-muted-foreground mt-spacing-3 bg-muted/30 p-spacing-3 w-full rounded-lg text-left">
                <p className="text-foreground mb-spacing-2 font-medium">
                  This will permanently delete all {nestedItems.length} ungrouped ad
                  {nestedItems.length !== 1 ? 's' : ''}.
                </p>
              </div>
            )}
          </div>
          {hasNested && (
            <div className="px-spacing-6 py-spacing-4 space-y-spacing-4 flex-1 overflow-y-auto">
              <div>
                <label className="label-text text-foreground mb-spacing-2 block">
                  Type <span className="font-semibold">&quot;DELETE&quot;</span> to confirm
                </label>
                <input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Type DELETE here"
                  className="h-spacing-10 rounded-spacing-2 border-border bg-background px-spacing-3 body-2 placeholder:text-muted-foreground text-foreground w-full border outline-none disabled:opacity-50"
                  disabled={isDeleting}
                />
              </div>
            </div>
          )}
          {errorMessage && (
            <div className="px-spacing-6 pb-spacing-3">
              <p className="body-3 text-destructive rounded-spacing-2 bg-destructive/10 px-spacing-3 py-spacing-2">
                {errorMessage}
              </p>
            </div>
          )}
          <div className="gap-spacing-3 px-spacing-6 py-spacing-4 border-border flex border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="button-glass-neutral hover:bg-hover-subtle hover:text-foreground flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={(hasNested && confirmText.trim().toUpperCase() !== 'DELETE') || isDeleting}
              className="button-glass-destructive flex-1 rounded-lg px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
