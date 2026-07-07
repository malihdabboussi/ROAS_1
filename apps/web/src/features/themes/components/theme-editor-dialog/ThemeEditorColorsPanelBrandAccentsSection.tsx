'use client'

import type { RefObject } from 'react'
import { ChevronDown, FileText, Globe, Shuffle, Upload } from 'lucide-react'
import { ColorPicker } from '@/components/ui/ColorPicker'
import type { UserThemeColors } from '../../types'

export interface ThemeEditorColorsPanelBrandAccentsSectionProps {
  colors: UserThemeColors
  handleColorChange: (key: keyof UserThemeColors, value: string) => void
  handleShuffle: () => void
  showImportDropdown: boolean
  setShowImportDropdown: (v: boolean) => void
  importDropdownRef: RefObject<HTMLDivElement | null>
  setShowWebsiteImport: (v: boolean) => void
  setShowFileImport: (v: boolean) => void
}

export function ThemeEditorColorsPanelBrandAccentsSection({
  colors,
  handleColorChange,
  handleShuffle,
  showImportDropdown,
  setShowImportDropdown,
  importDropdownRef,
  setShowWebsiteImport,
  setShowFileImport,
}: ThemeEditorColorsPanelBrandAccentsSectionProps) {
  return (
    <div>
      <div className="gap-spacing-2 mb-spacing-4 flex items-center justify-between">
        <h3 className="body-1 font-semibold text-[var(--color-foreground)]">Your Brand Colors</h3>
        <div className="gap-spacing-2 flex shrink-0 items-center">
          <button
            type="button"
            onClick={handleShuffle}
            className="button-glass-blue gap-spacing-1 px-spacing-2 sm:px-spacing-3 py-spacing-2 body-3 flex items-center rounded-lg font-medium"
          >
            <Shuffle className="h-4 w-4" />
            <span className="hidden sm:inline">Shuffle</span>
          </button>
          <div className="relative" ref={importDropdownRef}>
            <button
              type="button"
              onClick={() => setShowImportDropdown(!showImportDropdown)}
              className="button-glass-blue gap-spacing-1 px-spacing-2 sm:px-spacing-3 py-spacing-2 body-3 flex items-center rounded-lg font-medium"
            >
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Import</span>
              <ChevronDown className="h-3 w-3" />
            </button>
            {showImportDropdown && (
              <div className="z-dropdown mt-spacing-1 rounded-spacing-2 surface-card p-spacing-2 absolute right-0 top-full w-48 overflow-hidden border border-[var(--color-border)] shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setShowWebsiteImport(true)
                    setShowImportDropdown(false)
                  }}
                  className="gap-spacing-2 px-spacing-2 py-spacing-2 rounded-spacing-1 body-3 flex w-full items-center text-left transition-colors hover:bg-[var(--color-hover-subtle)]"
                >
                  <Globe className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                  <span className="text-[var(--color-foreground)]">From Website</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowFileImport(true)
                    setShowImportDropdown(false)
                  }}
                  className="gap-spacing-2 px-spacing-2 py-spacing-2 rounded-spacing-1 body-3 flex w-full items-center text-left transition-colors hover:bg-[var(--color-hover-subtle)]"
                >
                  <FileText className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                  <span className="text-[var(--color-foreground)]">From File</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="space-y-spacing-4">
        <div className="gap-spacing-4 grid grid-cols-1 xl:grid-cols-2">
          <ColorPicker
            label="Primary accent"
            description="Main brand color (buttons, CTAs)"
            value={colors.primary}
            onChange={(v) => handleColorChange('primary', v)}
            allowGradient
          />
          <ColorPicker
            label="Text ON primary"
            description="Button text color"
            value={colors.primaryForeground}
            onChange={(v) => handleColorChange('primaryForeground', v)}
          />
        </div>
        <div className="gap-spacing-4 grid grid-cols-1 xl:grid-cols-2">
          <ColorPicker
            label="Secondary accent 1"
            description="Complementary color"
            value={colors.secondaryAccent1}
            onChange={(v) => handleColorChange('secondaryAccent1', v)}
            allowGradient
          />
          <ColorPicker
            label="Secondary accent 2"
            description="Additional accent"
            value={colors.secondaryAccent2}
            onChange={(v) => handleColorChange('secondaryAccent2', v)}
          />
        </div>
      </div>
    </div>
  )
}
