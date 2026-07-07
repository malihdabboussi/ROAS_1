'use client'

import type { RefObject } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown } from 'lucide-react'
import type { Theme, UserThemeColors } from '@/features/themes/types'
import { ThemeSettingsThemeListDropdown } from './ThemeSettingsThemeListDropdown'

export interface ThemeSettingsHeaderProps {
  colors: UserThemeColors
  name: string
  setName: (v: string) => void
  selectedTheme: Theme
  isSaving: boolean
  isEditingThemeName: boolean
  setIsEditingThemeName: (v: boolean) => void
  themeNameInputRef: RefObject<HTMLInputElement | null>
  themes: Theme[]
  showSelector: boolean
  setShowSelector: (v: boolean) => void
  selectorRef: RefObject<HTMLDivElement | null>
  changeButtonRef: RefObject<HTMLButtonElement | null>
  dropdownPos: { top: number; left: number; width: number } | null
  onCreateTheme: () => void | Promise<void>
  onSelectTheme: (theme: Theme) => void
}

export function ThemeSettingsHeader({
  colors,
  name,
  setName,
  selectedTheme,
  isSaving,
  isEditingThemeName,
  setIsEditingThemeName,
  themeNameInputRef,
  themes,
  showSelector,
  setShowSelector,
  selectorRef,
  changeButtonRef,
  dropdownPos,
  onCreateTheme,
  onSelectTheme,
}: ThemeSettingsHeaderProps) {
  return (
    <div className="gap-spacing-3 p-spacing-3 card-glass rounded-spacing-2 @[560px]:flex-row @[560px]:items-center @[560px]:justify-between flex flex-col border border-[var(--color-border)]">
      <div className="gap-spacing-3 flex min-w-0 flex-1 items-center">
        <div className="rounded-spacing-1 grid h-10 w-10 shrink-0 grid-cols-2 grid-rows-2 overflow-hidden border border-[var(--color-border)]">
          <div style={{ background: colors.primary }} />
          <div style={{ background: colors.secondaryAccent1 }} />
          <div style={{ background: colors.pageBackground }} />
          <div style={{ background: colors.cardBackground }} />
        </div>
        <div className="min-w-0 flex-1">
          {isEditingThemeName && !selectedTheme.is_system ? (
            <input
              ref={themeNameInputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setIsEditingThemeName(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setIsEditingThemeName(false)
                if (e.key === 'Escape') {
                  setName(selectedTheme?.name || '')
                  setIsEditingThemeName(false)
                }
              }}
              className="body-2 rounded-spacing-1 px-spacing-1 w-full min-w-0 border border-[var(--color-border)] bg-transparent py-0 font-medium text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none"
            />
          ) : (
            <p
              onClick={() => !selectedTheme.is_system && setIsEditingThemeName(true)}
              className={`body-2 truncate font-medium text-[var(--color-foreground)] ${!selectedTheme.is_system ? 'cursor-pointer hover:text-[var(--color-primary)]' : ''}`}
            >
              {selectedTheme.name}
            </p>
          )}
          <p className="typo-caption text-[var(--color-muted-foreground)]">
            {selectedTheme.is_system ? 'System theme' : 'Custom theme'}
            {isSaving && ' · Saving...'}
          </p>
        </div>
      </div>
      <div className="relative" ref={selectorRef}>
        <button
          ref={changeButtonRef}
          onClick={() => setShowSelector(!showSelector)}
          className="button-glass-neutral px-spacing-3 py-spacing-2 rounded-spacing-2 body-3 gap-spacing-1 flex items-center font-medium"
        >
          Change <ChevronDown className="h-3 w-3" />
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
                selectedThemeId={selectedTheme.id}
                onSelectTheme={onSelectTheme}
                onCreateTheme={onCreateTheme}
                showSelectionCheck
              />
            </div>,
            document.body,
          )}
      </div>
    </div>
  )
}
