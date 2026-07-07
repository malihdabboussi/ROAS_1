'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import type { ThemeEditorDialogProps } from './theme-editor-dialog/theme-editor-dialog.types'
import { ThemeEditorDialogMainColumn } from './theme-editor-dialog/ThemeEditorDialogMainColumn'
import { ThemeEditorDialogModals } from './theme-editor-dialog/ThemeEditorDialogModals'
import { ThemeEditorDialogPreviewPanel } from './theme-editor-dialog/ThemeEditorDialogPreviewPanel'
import { useThemeEditorDialogState } from './theme-editor-dialog/use-theme-editor-dialog-state'

export function ThemeEditorDialog({ open, onClose, onSave, theme }: ThemeEditorDialogProps) {
  const s = useThemeEditorDialogState({ open, theme, onClose, onSave })

  if (!open) return null

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose()
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[100002] bg-modal-overlay" />
        <DialogPrimitive.Content className="md:p-spacing-4 fixed inset-0 z-[100003] flex items-center justify-center overflow-hidden p-0 sm:p-2">
          <VisuallyHidden.Root>
            <DialogPrimitive.Title>Theme Editor</DialogPrimitive.Title>
          </VisuallyHidden.Root>

          <div
            className="surface-card wizard-container-border sm:rounded-spacing-3 relative flex h-full w-full max-w-none flex-col overflow-hidden rounded-none sm:h-auto sm:max-h-[90vh] xl:h-[90vh] xl:max-w-[1280px] xl:flex-row"
            onClick={(e) => e.stopPropagation()}
          >
            <ThemeEditorDialogMainColumn s={s} onClose={onClose} />
            <ThemeEditorDialogPreviewPanel s={s} />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
      <ThemeEditorDialogModals s={s} />
    </DialogPrimitive.Root>
  )
}
