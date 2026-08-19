'use client'

import type { Theme } from '../../types'

export interface ThemeEditorDialogFooterProps {
  isEditMode: boolean
  theme: Theme | undefined
  onClose: () => void
  isSubmitting: boolean
  name: string
  handleSave: () => void | Promise<void>
  handleDelete: () => void | Promise<void>
  isForkingSystem: boolean
}

export function ThemeEditorDialogFooter({
  isEditMode,
  theme,
  onClose,
  isSubmitting,
  name,
  handleSave,
  handleDelete,
  isForkingSystem,
}: ThemeEditorDialogFooterProps) {
  return (
    <div className="px-spacing-4 sm:px-spacing-6 py-spacing-3 flex-shrink-0 border-t border-[var(--color-border)]">
      <div className="gap-spacing-3 flex flex-col-reverse items-stretch justify-between sm:flex-row sm:items-center">
        {isEditMode && !theme?.is_system ? (
          <button
            type="button"
            onClick={handleDelete}
            className="text-destructive rounded-lg px-4 py-2 text-sm font-medium transition-colors hover:bg-red-500/10"
          >
            Delete
          </button>
        ) : (
          <div className="hidden sm:block" />
        )}
        <div className="gap-spacing-2 flex w-full sm:w-auto">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="button-glass-neutral hidden flex-1 rounded-lg px-4 py-2 text-sm font-medium sm:block sm:flex-initial"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting || !name.trim()}
            className="button-glass-accent flex-1 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 sm:flex-initial"
          >
            {isSubmitting ? 'Saving...' : isForkingSystem ? 'Save to My Themes' : 'Save theme'}
          </button>
        </div>
      </div>
    </div>
  )
}
