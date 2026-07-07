'use client'

import type { RefObject } from 'react'
import { createPortal } from 'react-dom'
import { Palette } from 'lucide-react'
import type { Theme } from '@/features/themes/types'
import { ThemeSettingsThemeListDropdown } from './ThemeSettingsThemeListDropdown'

export interface ThemeSettingsEmptyStateProps {
  themes: Theme[]
  showSelector: boolean
  setShowSelector: (v: boolean) => void
  selectorRef: RefObject<HTMLDivElement | null>
  selectThemeButtonRef: RefObject<HTMLButtonElement | null>
  dropdownPos: { top: number; left: number; width: number } | null
  onCreateTheme: () => Promise<void>
  onSelectTheme: (theme: Theme) => void
}

export function ThemeSettingsEmptyState({
  themes,
  showSelector,
  setShowSelector,
  selectorRef,
  selectThemeButtonRef,
  dropdownPos,
  onCreateTheme,
  onSelectTheme,
}: ThemeSettingsEmptyStateProps) {
  return (
    <div className="space-y-spacing-4">
      <div className="card-glass rounded-spacing-3 p-spacing-8 border border-dashed border-[var(--color-border)] text-center">
        <Palette className="mb-spacing-3 mx-auto h-10 w-10 text-[var(--color-muted-foreground)]" />
        <h3 className="body-2 mb-spacing-2 font-medium text-[var(--color-foreground)]">
          No Theme Selected
        </h3>
        <p className="body-3 mb-spacing-4 text-[var(--color-muted-foreground)]">
          Select a theme to customize colors, fonts, and more.
        </p>
        <div className="relative inline-block" ref={selectorRef}>
          <button
            ref={selectThemeButtonRef}
            onClick={() => setShowSelector(!showSelector)}
            className="button-glass-accent px-spacing-4 py-spacing-2 rounded-spacing-2 body-3 font-medium"
          >
            Select Theme
          </button>
          {showSelector &&
            dropdownPos &&
            typeof document !== 'undefined' &&
            createPortal(
              <div
                data-theme-selector-dropdown
                className="surface-card rounded-spacing-3 p-spacing-2 fixed z-[99999] max-h-64 overflow-y-auto border border-[var(--color-border)] shadow-lg"
                style={{ top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width }}
              >
                <ThemeSettingsThemeListDropdown
                  themes={themes}
                  selectedThemeId={null}
                  onSelectTheme={(t) => {
                    onSelectTheme(t)
                    setShowSelector(false)
                  }}
                  onCreateTheme={async () => {
                    await onCreateTheme()
                    setShowSelector(false)
                  }}
                  showSelectionCheck={false}
                />
              </div>,
              document.body,
            )}
        </div>
      </div>
    </div>
  )
}
