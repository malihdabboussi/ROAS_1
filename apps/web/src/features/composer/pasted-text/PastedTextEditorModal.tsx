'use client'

import { useEffect, useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Trash2, X } from 'lucide-react'
import type { PastedTextBlock } from './pasted-text.types'

export function PastedTextEditorModal({
  block,
  open,
  onOpenChange,
  onSave,
  onRemove,
}: {
  block: PastedTextBlock | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (id: string, text: string) => void
  onRemove: (id: string) => void
}) {
  const [draft, setDraft] = useState('')

  useEffect(() => {
    if (open && block) {
      setDraft(block.text)
    }
  }, [open, block])

  if (!block) return null

  const handleSave = () => {
    onSave(block.id, draft)
    onOpenChange(false)
  }

  const handleRemove = () => {
    onRemove(block.id)
    onOpenChange(false)
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="z-modal-backdrop fixed inset-0" />
        <DialogPrimitive.Content
          className="z-modal-layer-3 p-spacing-4 fixed inset-0 flex items-center justify-center"
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <div
            className="surface-card wizard-container-border rounded-spacing-4 flex h-[min(90vh,820px)] w-full max-w-5xl flex-col overflow-hidden border bg-[var(--color-card)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-spacing-6 pt-spacing-4 pb-spacing-2 shrink-0">
              <div className="gap-spacing-3 flex items-start justify-between">
                <DialogPrimitive.Title className="title-h6 text-foreground">
                  Pasted text
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="sr-only">
                  Review or edit the text before using it in your message.
                </DialogPrimitive.Description>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="btn-icon-bare shrink-0"
                  aria-label="Close"
                >
                  <X className="icon-xs" />
                </button>
              </div>
            </div>

            <div className="px-spacing-6 py-spacing-3 flex min-h-0 flex-1 flex-col">
              <textarea
                aria-label="Pasted text content"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="body-2 text-foreground border-border bg-background min-h-0 flex-1 resize-none rounded-lg border p-4 focus:outline-none"
                autoFocus
              />
            </div>

            <div className="px-spacing-6 py-spacing-4 gap-spacing-2 flex shrink-0 items-center justify-between">
              <button
                type="button"
                onClick={handleRemove}
                className="button-secondary text-destructive gap-spacing-1 flex items-center"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="button-glass-green px-spacing-4 py-spacing-2 rounded-lg font-medium"
              >
                Save
              </button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
