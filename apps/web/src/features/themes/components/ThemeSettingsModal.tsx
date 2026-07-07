'use client'

import type { Theme } from '@/features/themes/types'
import { ThemeEditorDialog } from './ThemeEditorDialog'

interface ThemeSettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  theme: Theme | null
  onThemeChange: (themeId: string | null) => void
}

/**
 * Theme Editor Modal — legacy layout: left tabs + right preview + create theme
 *
 * Uses ThemeEditorDialog (split layout: all tabs on left, live preview on right).
 * When theme is null: create new theme. When theme exists: edit.
 */
export function ThemeSettingsModal({
  open,
  onOpenChange,
  theme,
  onThemeChange,
}: ThemeSettingsModalProps) {
  return (
    <ThemeEditorDialog
      open={open}
      onClose={() => onOpenChange(false)}
      onSave={(savedTheme) => {
        if (savedTheme) onThemeChange(savedTheme.id)
      }}
      theme={theme ?? undefined}
    />
  )
}
