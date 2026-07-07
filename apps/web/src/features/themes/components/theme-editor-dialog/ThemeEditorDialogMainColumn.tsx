'use client'

import { ThemeEditorDialogFooter } from './ThemeEditorDialogFooter'
import { ThemeEditorDialogHeader } from './ThemeEditorDialogHeader'
import { ThemeEditorDialogDesktopNav, ThemeEditorDialogMobileNav } from './ThemeEditorDialogNav'
import { ThemeEditorDialogTabPanels } from './ThemeEditorDialogTabPanels'
import type { ThemeEditorDialogState } from './use-theme-editor-dialog-state'

export interface ThemeEditorDialogMainColumnProps {
  s: ThemeEditorDialogState
  onClose: () => void
}

export function ThemeEditorDialogMainColumn({ s, onClose }: ThemeEditorDialogMainColumnProps) {
  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden border-[var(--color-border)] xl:border-r">
      <ThemeEditorDialogHeader
        name={s.name}
        setName={s.setName}
        usageCount={s.usageCount}
        isSaving={s.isSaving}
      />

      <ThemeEditorDialogMobileNav activeTab={s.activeTab} setActiveTab={s.setActiveTab} />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <ThemeEditorDialogDesktopNav activeTab={s.activeTab} setActiveTab={s.setActiveTab} />
        <ThemeEditorDialogTabPanels s={s} />
      </div>

      <ThemeEditorDialogFooter
        isEditMode={s.isEditMode}
        theme={s.theme}
        onClose={onClose}
        isSubmitting={s.isSubmitting}
        name={s.name}
        handleSave={s.handleSave}
        handleDelete={s.handleDelete}
        isForkingSystem={s.isForkingSystem}
      />
    </div>
  )
}
