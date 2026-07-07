'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { useEffect, useRef, useState } from 'react'

export function FlowRenameDialog({
  open,
  initialName,
  confirming,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  initialName: string
  confirming?: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (name: string) => void | Promise<void>
}) {
  const [draft, setDraft] = useState(initialName)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) setDraft(initialName)
  }, [open, initialName])

  useEffect(() => {
    if (!open) return
    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [open])

  const trimmed = draft.trim()
  const canConfirm = trimmed.length > 0 && trimmed !== initialName.trim()

  const handleConfirm = async () => {
    if (!canConfirm || confirming) return
    await onConfirm(trimmed)
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="z-modal-backdrop-above fixed inset-0" />
        <DialogPrimitive.Content className="z-modal-layer-4 p-spacing-4 fixed inset-0 flex items-center justify-center">
          <div className="surface-card wizard-container-border rounded-spacing-4 p-spacing-6 w-full max-w-md">
            <div className="space-y-spacing-2">
              <DialogPrimitive.Title className="title-h6">Rename flow</DialogPrimitive.Title>
              <DialogPrimitive.Description className="body-2 text-muted-foreground">
                Choose a name for this loop.
              </DialogPrimitive.Description>
            </div>

            <div className="mt-spacing-4">
              <input
                ref={inputRef}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void handleConfirm()
                }}
                disabled={confirming}
                className="input-glass h-spacing-10 body-3 text-foreground w-full"
                aria-label="Flow name"
              />
            </div>

            <div className="mt-spacing-6 gap-spacing-2 flex items-center justify-end">
              <DialogPrimitive.Close asChild>
                <button
                  type="button"
                  disabled={confirming}
                  className="button-glass-neutral rounded-spacing-2 px-spacing-3 py-spacing-2 body-3 disabled:opacity-50"
                >
                  Cancel
                </button>
              </DialogPrimitive.Close>
              <button
                type="button"
                onClick={() => void handleConfirm()}
                disabled={!canConfirm || confirming}
                className="button-glass-primary rounded-spacing-2 px-spacing-3 py-spacing-2 body-3 disabled:opacity-50"
              >
                {confirming ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
