'use client'

import { ColorPicker } from '@/components/ui/ColorPicker'
import type { UserThemeColors } from '../../types'

export interface ThemeEditorColorsPanelBackgroundsSectionProps {
  colors: UserThemeColors
  handleColorChange: (key: keyof UserThemeColors, value: string) => void
}

export function ThemeEditorColorsPanelBackgroundsSection({
  colors,
  handleColorChange,
}: ThemeEditorColorsPanelBackgroundsSectionProps) {
  return (
    <div>
      <h3 className="body-1 mb-spacing-4 font-semibold text-[var(--color-foreground)]">
        Backgrounds & Elements
      </h3>
      <div className="space-y-spacing-4">
        <div className="gap-spacing-4 grid grid-cols-1 xl:grid-cols-2">
          <ColorPicker
            label="Page background"
            description="Full page background"
            value={colors.pageBackground}
            onChange={(v) => handleColorChange('pageBackground', v)}
            allowGradient
          />
          <ColorPicker
            label="Slide background"
            description="Presentation slides"
            value={colors.slideBackground ?? colors.pageBackground}
            onChange={(v) => handleColorChange('slideBackground', v)}
          />
        </div>
        <div className="gap-spacing-4 grid grid-cols-1 xl:grid-cols-2">
          <ColorPicker
            label="Block background"
            description="Content blocks"
            value={colors.cardBackground}
            onChange={(v) => handleColorChange('cardBackground', v)}
          />
        </div>
        <div className="gap-spacing-4 grid grid-cols-1 xl:grid-cols-2">
          <ColorPicker
            label="Borders"
            description="Lines, dividers"
            value={colors.border}
            onChange={(v) => handleColorChange('border', v)}
          />
          <ColorPicker
            label="Form inputs"
            description="Text fields, selects"
            value={colors.input}
            onChange={(v) => handleColorChange('input', v)}
          />
        </div>
      </div>
    </div>
  )
}
