'use client'

import { ThemePreview } from '../ThemePreview'
import type { ThemeEditorDialogState } from './use-theme-editor-dialog-state'

export interface ThemeEditorDialogPreviewPanelProps {
  s: ThemeEditorDialogState
}

export function ThemeEditorDialogPreviewPanel({ s }: ThemeEditorDialogPreviewPanelProps) {
  return (
    <div className="surface-card hidden min-h-0 w-full flex-none flex-col overflow-hidden border-t border-[var(--color-border)] xl:flex xl:w-[min(100%,380px)] xl:border-l xl:border-t-0">
      <div className="px-spacing-4 py-spacing-3 flex-shrink-0 border-b border-[var(--color-border)]">
        <p className="body-3 font-semibold text-[var(--color-foreground)]">Live preview</p>
        <p className="typo-caption text-[var(--color-muted-foreground)]">
          Updates as you edit colors, fonts, and design settings.
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <ThemePreview
          colors={s.colors}
          designSettings={s.designSettings}
          fontHeading={s.fontHeading}
          fontBody={s.fontBody}
        />
      </div>
    </div>
  )
}
