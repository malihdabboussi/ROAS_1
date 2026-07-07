'use client'

import { useEffect, useState, type KeyboardEvent } from 'react'
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

  if (!open) return null

  function handleSubmit() {
    const trimmed = name.trim()
    if (!trimmed) return
    onCreate(trimmed, selectedIcon)
    setName('')
    setSelectedIcon('folder-kanban')
    onClose()
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
    if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-modal-overlay" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="surface-card w-full max-w-md overflow-visible rounded-2xl border border-[var(--color-border)] shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 pb-2 pt-6">
            <h2 className="text-base font-semibold text-[var(--color-foreground)]">
              {isEditing ? 'EDIT PROJECT' : 'CREATE PROJECT'}
            </h2>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-secondary)] hover:text-[var(--color-foreground)]"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
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
              <label className="body-2 mb-2 block font-medium text-[var(--color-foreground)]">
                Project name
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
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={handleKeyDown}
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
        </div>
      </div>
    </>
  )
}
