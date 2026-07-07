'use client'

import type { RefObject } from 'react'
import type { UserThemeColors } from '../../types'
import { ThemeEditorColorsPanelBackgroundsSection } from './ThemeEditorColorsPanelBackgroundsSection'
import { ThemeEditorColorsPanelBrandAccentsSection } from './ThemeEditorColorsPanelBrandAccentsSection'
import { ThemeEditorColorsPanelCalloutsSection } from './ThemeEditorColorsPanelCalloutsSection'
import { ThemeEditorColorsPanelTextSection } from './ThemeEditorColorsPanelTextSection'

export interface ThemeEditorColorsPanelProps {
  colors: UserThemeColors
  handleColorChange: (key: keyof UserThemeColors, value: string) => void
  handleShuffle: () => void
  showImportDropdown: boolean
  setShowImportDropdown: (v: boolean) => void
  importDropdownRef: RefObject<HTMLDivElement | null>
  setShowWebsiteImport: (v: boolean) => void
  setShowFileImport: (v: boolean) => void
}

export function ThemeEditorColorsPanel({
  colors,
  handleColorChange,
  handleShuffle,
  showImportDropdown,
  setShowImportDropdown,
  importDropdownRef,
  setShowWebsiteImport,
  setShowFileImport,
}: ThemeEditorColorsPanelProps) {
  return (
    <div className="space-y-spacing-6 max-w-xl">
      <ThemeEditorColorsPanelBrandAccentsSection
        colors={colors}
        handleColorChange={handleColorChange}
        handleShuffle={handleShuffle}
        showImportDropdown={showImportDropdown}
        setShowImportDropdown={setShowImportDropdown}
        importDropdownRef={importDropdownRef}
        setShowWebsiteImport={setShowWebsiteImport}
        setShowFileImport={setShowFileImport}
      />
      <div className="border-t border-[var(--color-border)]" />
      <ThemeEditorColorsPanelTextSection colors={colors} handleColorChange={handleColorChange} />
      <div className="border-t border-[var(--color-border)]" />
      <ThemeEditorColorsPanelBackgroundsSection
        colors={colors}
        handleColorChange={handleColorChange}
      />
      <div className="border-t border-[var(--color-border)]" />
      <ThemeEditorColorsPanelCalloutsSection
        colors={colors}
        handleColorChange={handleColorChange}
      />
    </div>
  )
}
