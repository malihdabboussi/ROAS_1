'use client'

import { useEffect, useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { X } from 'lucide-react'
import { IconPicker, type IconColorId } from '@/components/ui/IconPicker'
import { pickNewProgramColorId } from '@/lib/programs'

export function NewProgramModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean
  onClose: () => void
  onCreate: (name: string, icon: string, iconColor?: string) => void | Promise<void>
}) {
  const [name, setName] = useState('')
  const [selectedIcon, setSelectedIcon] = useState('layers')
  const [selectedColor, setSelectedColor] = useState<string>(() => pickNewProgramColorId())
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setName('')
    setSelectedIcon('layers')
    setSelectedColor(pickNewProgramColorId())
    setSubmitting(false)
  }, [open])

  async function handleSubmit() {
    const trimmed = name.trim()
    if (!trimmed || submitting) return
    setSubmitting(true)
    try {
      await onCreate(trimmed, selectedIcon, selectedColor)
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="z-modal-backdrop bg-modal-overlay fixed inset-0" />
        <DialogPrimitive.Content
          className="surface-card border-border z-modal-content fixed left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 overflow-visible rounded-2xl border shadow-2xl"
          onPointerDownOutside={(event) => {
            const target = event.target
            if (target instanceof Element && target.closest('[data-icon-picker-popup]')) {
              event.preventDefault()
            }
          }}
          onFocusOutside={(event) => {
            const target = event.target
            if (target instanceof Element && target.closest('[data-icon-picker-popup]')) {
              event.preventDefault()
            }
          }}
          onInteractOutside={(event) => {
            const target = event.target
            if (target instanceof Element && target.closest('[data-icon-picker-popup]')) {
              event.preventDefault()
            }
          }}
        >
          <VisuallyHidden.Root>
            <DialogPrimitive.Description>
              Name your program so campaigns and spaces stay grouped.
            </DialogPrimitive.Description>
          </VisuallyHidden.Root>
          <div className="flex items-center justify-between px-6 pb-2 pt-6">
            <DialogPrimitive.Title className="text-foreground text-base font-semibold">
              CREATE PROGRAM
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              type="button"
              className="text-muted-foreground hover:bg-secondary hover:text-foreground flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
              aria-label="Close program dialog"
            >
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>

          <div className="px-6 py-4">
            <form
              id="program-form"
              onSubmit={(e) => {
                e.preventDefault()
                void handleSubmit()
              }}
            >
              <label
                htmlFor="program-name"
                className="body-2 text-foreground mb-2 block font-medium"
              >
                Program name
              </label>
              <div className="flex items-center gap-2">
                <IconPicker
                  value={selectedIcon}
                  color={selectedColor}
                  onChange={setSelectedIcon}
                  onColorChange={(id: IconColorId) => setSelectedColor(id)}
                  size="lg"
                  popupZIndexClass="z-modal-layer-4"
                />
                <input
                  id="program-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Clients, Ops, Launch…"
                  autoFocus
                  className="input-glass h-10 flex-1 px-3 text-sm"
                />
              </div>
            </form>
          </div>

          <div className="flex items-center justify-end gap-2 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="button-glass-neutral px-4 py-2"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="program-form"
              className="button-glass-accent px-4 py-2"
              disabled={!name.trim() || submitting}
            >
              {submitting ? 'Creating…' : 'Create'}
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
