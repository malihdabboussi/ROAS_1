'use client'

import type { RefObject } from 'react'
import { ChevronDown, FileText, Globe, Shuffle, Upload } from 'lucide-react'
import { ColorPicker } from '@/components/ui/ColorPicker'
import { TextColorPicker } from '@/features/themes/components/TextColorPicker'
import type { UserThemeColors } from '@/features/themes/types'

export interface ThemeSettingsColorsPanelProps {
  colors: UserThemeColors
  handleColorChange: (key: keyof UserThemeColors, val: string) => void
  handleShuffle: () => void
  showImportDropdown: boolean
  setShowImportDropdown: (v: boolean) => void
  importDropdownRef: RefObject<HTMLDivElement | null>
  setShowWebsiteImport: (v: boolean) => void
  setShowFileImport: (v: boolean) => void
}

export function ThemeSettingsColorsPanel({
  colors,
  handleColorChange,
  handleShuffle,
  showImportDropdown,
  setShowImportDropdown,
  importDropdownRef,
  setShowWebsiteImport,
  setShowFileImport,
}: ThemeSettingsColorsPanelProps) {
  return (
    <div>
      <div className="space-y-spacing-6">
        <div>
          <div className="gap-spacing-2 mb-spacing-4 @[560px]:flex-row @[560px]:items-center @[560px]:justify-between flex flex-col">
            <h3 className="body-1 font-semibold text-[var(--color-foreground)]">
              Your Brand Colors
            </h3>
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
            <div className="gap-spacing-4 @[520px]:grid-cols-2 grid grid-cols-1">
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
            <div className="gap-spacing-4 @[520px]:grid-cols-2 grid grid-cols-1">
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

        <div className="border-t border-[var(--color-border)]" />

        <div>
          <h3 className="body-1 mb-spacing-4 font-semibold text-[var(--color-foreground)]">
            Text Colors
          </h3>
          <div className="gap-spacing-4 @[520px]:grid-cols-2 grid grid-cols-1">
            <TextColorPicker
              type="heading"
              mainColor={colors.heading}
              variants={{
                headingH2: colors.headingH2,
                headingH3: colors.headingH3,
                headingH4: colors.headingH4,
              }}
              onMainColorChange={(v) => handleColorChange('heading', v)}
              onVariantChange={(k, c) => handleColorChange(k as keyof UserThemeColors, c || '')}
            />
            <TextColorPicker
              type="body"
              mainColor={colors.body}
              variants={{ bodyLg: colors.bodyLg, bodySm: colors.bodySm }}
              onMainColorChange={(v) => handleColorChange('body', v)}
              onVariantChange={(k, c) => handleColorChange(k as keyof UserThemeColors, c || '')}
            />
          </div>
        </div>

        <div className="border-t border-[var(--color-border)]" />

        <div>
          <h3 className="body-1 mb-spacing-4 font-semibold text-[var(--color-foreground)]">
            Backgrounds & Elements
          </h3>
          <div className="space-y-spacing-4">
            <div className="gap-spacing-4 @[520px]:grid-cols-2 grid grid-cols-1">
              <ColorPicker
                label="Page background"
                description="Full page background color"
                value={colors.pageBackground}
                onChange={(v) => handleColorChange('pageBackground', v)}
                allowGradient
              />
              <ColorPicker
                label="Slide background"
                description="Presentation slides and sections"
                value={colors.slideBackground ?? colors.pageBackground}
                onChange={(v) => handleColorChange('slideBackground', v)}
              />
            </div>
            <div className="gap-spacing-4 @[520px]:grid-cols-2 grid grid-cols-1">
              <ColorPicker
                label="Block background"
                description="Content blocks and containers"
                value={colors.cardBackground}
                onChange={(v) => handleColorChange('cardBackground', v)}
              />
            </div>
            <div className="gap-spacing-4 @[520px]:grid-cols-2 grid grid-cols-1">
              <ColorPicker
                label="Borders"
                description="Lines, dividers, outlines"
                value={colors.border}
                onChange={(v) => handleColorChange('border', v)}
              />
              <ColorPicker
                label="Form inputs"
                description="Text fields, selects, textareas"
                value={colors.input}
                onChange={(v) => handleColorChange('input', v)}
              />
            </div>
          </div>
        </div>

        <div className="border-t border-[var(--color-border)]" />

        <div>
          <h3 className="body-1 mb-spacing-4 font-semibold text-[var(--color-foreground)]">
            Callout Colors
          </h3>
          <div className="space-y-spacing-4">
            <div className="gap-spacing-4 @[520px]:grid-cols-2 grid grid-cols-1">
              <ColorPicker
                label="Info"
                description="Informational callouts"
                value={colors.calloutInfo || '#3b82f6'}
                onChange={(v) => handleColorChange('calloutInfo', v)}
              />
              <ColorPicker
                label="Success"
                description="Success callouts"
                value={colors.calloutSuccess || '#22c55e'}
                onChange={(v) => handleColorChange('calloutSuccess', v)}
              />
            </div>
            <div className="gap-spacing-4 @[520px]:grid-cols-2 grid grid-cols-1">
              <ColorPicker
                label="Warning"
                description="Warning callouts"
                value={colors.calloutWarning || '#f59e0b'}
                onChange={(v) => handleColorChange('calloutWarning', v)}
              />
              <ColorPicker
                label="Question"
                description="Question callouts"
                value={colors.calloutQuestion || colors.primary}
                onChange={(v) => handleColorChange('calloutQuestion', v)}
              />
            </div>
            <div className="gap-spacing-4 @[520px]:grid-cols-2 grid grid-cols-1">
              <ColorPicker
                label="Tip"
                description="Tip callouts"
                value={colors.calloutTip || '#06b6d4'}
                onChange={(v) => handleColorChange('calloutTip', v)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
