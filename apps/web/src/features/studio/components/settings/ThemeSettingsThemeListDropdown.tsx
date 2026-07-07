'use client'

import { Check, Plus } from 'lucide-react'
import type { Theme } from '@/features/themes/types'

export interface ThemeSettingsThemeListDropdownProps {
  themes: Theme[]
  selectedThemeId: string | null
  onSelectTheme: (theme: Theme) => void
  onCreateTheme: () => void | Promise<void>
  showSelectionCheck: boolean
}

export function ThemeSettingsThemeListDropdown({
  themes,
  selectedThemeId,
  onSelectTheme,
  onCreateTheme,
  showSelectionCheck,
}: ThemeSettingsThemeListDropdownProps) {
  return (
    <>
      <button
        type="button"
        onClick={() => void onCreateTheme()}
        className="gap-spacing-3 px-spacing-3 py-spacing-2 rounded-spacing-2 body-3 flex w-full items-center text-left transition-colors hover:bg-[var(--color-hover-subtle)]"
      >
        <div className="rounded-spacing-1 flex h-8 w-8 shrink-0 items-center justify-center border border-dashed border-[var(--color-border)]">
          <Plus className="h-4 w-4 text-[var(--color-muted-foreground)]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-[var(--color-foreground)]">Create theme</p>
          <p className="typo-caption text-[var(--color-muted-foreground)]">Custom</p>
        </div>
      </button>
      <div className="my-spacing-1 border-t border-[var(--color-border)]" />
      {themes.map((theme) => (
        <button
          key={theme.id}
          onClick={() => onSelectTheme(theme)}
          className="gap-spacing-3 px-spacing-3 py-spacing-2 rounded-spacing-2 body-3 flex w-full items-center text-left transition-colors hover:bg-[var(--color-hover-subtle)]"
        >
          <div className="rounded-spacing-1 grid h-8 w-8 shrink-0 grid-cols-2 grid-rows-2 overflow-hidden border border-[var(--color-border)]">
            <div style={{ background: theme.colors.primary }} />
            <div style={{ background: theme.colors.secondaryAccent1 }} />
            <div style={{ background: theme.colors.pageBackground }} />
            <div style={{ background: theme.colors.cardBackground }} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-[var(--color-foreground)]">{theme.name}</p>
            <p className="typo-caption text-[var(--color-muted-foreground)]">
              {theme.is_system ? 'System' : 'Custom'}
            </p>
          </div>
          {showSelectionCheck && theme.id === selectedThemeId && (
            <Check className="h-4 w-4 shrink-0 text-[var(--color-primary)]" />
          )}
        </button>
      ))}
    </>
  )
}
