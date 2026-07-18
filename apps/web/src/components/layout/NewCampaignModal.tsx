'use client'

import { useEffect, useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { X } from 'lucide-react'
import { IconPicker, type IconColorId } from '@/components/ui/IconPicker'

interface EditingCampaign {
  id: string
  name: string
  icon: string
  config: Record<string, unknown>
}

interface NewCampaignModalProps {
  open: boolean
  onClose: () => void
  onCreate: (name: string, icon: string) => void
  editingCampaign?: EditingCampaign | null
}

export function NewCampaignModal({
  open,
  onClose,
  onCreate,
  editingCampaign,
}: NewCampaignModalProps) {
  const [name, setName] = useState('')
  const [selectedIcon, setSelectedIcon] = useState('folder-kanban')
  const [selectedColor, setSelectedColor] = useState<string | undefined>(undefined)
  const isEditing = !!editingCampaign

  // Reset form when modal opens or editing campaign changes
  useEffect(() => {
    if (open) {
      if (editingCampaign) {
        setName(editingCampaign.name)
        setSelectedIcon(editingCampaign.icon || 'folder-kanban')
        setSelectedColor((editingCampaign.config?.icon_color as string) ?? undefined)
      } else {
        setName('')
        setSelectedIcon('folder-kanban')
        setSelectedColor(undefined)
      }
    }
  }, [open, editingCampaign])

  function handleSubmit() {
    const trimmed = name.trim()
    if (!trimmed) return
    onCreate(trimmed, selectedIcon)
    setName('')
    setSelectedIcon('folder-kanban')
    onClose()
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="bg-modal-overlay fixed inset-0 z-50" />
        <DialogPrimitive.Content className="surface-card border-border fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 overflow-visible rounded-2xl border shadow-2xl">
          <VisuallyHidden.Root>
            <DialogPrimitive.Description>
              Choose a name and icon for the campaign.
            </DialogPrimitive.Description>
          </VisuallyHidden.Root>
          {/* Header */}
          <div className="flex items-center justify-between px-6 pb-2 pt-6">
            <DialogPrimitive.Title className="text-foreground text-base font-semibold">
              {isEditing ? 'EDIT CAMPAIGN' : 'CREATE CAMPAIGN'}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              type="button"
              className="text-muted-foreground hover:bg-secondary hover:text-foreground flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
              aria-label="Close campaign dialog"
            >
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>

          {/* Body */}
          <div className="px-6 py-4">
            <form
              id="campaign-form"
              onSubmit={(e) => {
                e.preventDefault()
                handleSubmit()
              }}
            >
              <label
                htmlFor="campaign-name"
                className="body-2 text-foreground mb-2 block font-medium"
              >
                Campaign name
              </label>
              <div className="flex items-center gap-2">
                <IconPicker
                  value={selectedIcon}
                  color={selectedColor}
                  onChange={setSelectedIcon}
                  onColorChange={(id: IconColorId) => setSelectedColor(id)}
                  size="lg"
                />
                <input
                  id="campaign-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter the name"
                  autoFocus
                  className="input-glass h-10 flex-1 px-3 text-sm"
                />
              </div>
            </form>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="button-glass-neutral rounded-lg px-4 py-2 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="campaign-form"
              disabled={!name.trim()}
              className="button-glass-primary rounded-lg px-6 py-2 text-sm font-medium disabled:opacity-30"
            >
              {isEditing ? 'Save' : 'Create'}
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
