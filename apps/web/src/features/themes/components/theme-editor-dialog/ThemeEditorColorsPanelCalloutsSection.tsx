'use client'

import { ColorPicker } from '@/components/ui/ColorPicker'
import type { UserThemeColors } from '../../types'

export interface ThemeEditorColorsPanelCalloutsSectionProps {
  colors: UserThemeColors
  handleColorChange: (key: keyof UserThemeColors, value: string) => void
}

export function ThemeEditorColorsPanelCalloutsSection({
  colors,
  handleColorChange,
}: ThemeEditorColorsPanelCalloutsSectionProps) {
  return (
    <div>
      <h3 className="body-1 mb-spacing-4 font-semibold text-[var(--color-foreground)]">
        Callout Colors
      </h3>
      <div className="space-y-spacing-4">
        <div className="gap-spacing-4 grid grid-cols-1 xl:grid-cols-2">
          <ColorPicker
            label="Info"
            description="Informational"
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
        <div className="gap-spacing-4 grid grid-cols-1 xl:grid-cols-2">
          <ColorPicker
            label="Warning"
            description="Warning callouts"
            value={colors.calloutWarning || '#f59e0b'}
            onChange={(v) => handleColorChange('calloutWarning', v)}
          />
          <ColorPicker
            label="Tip"
            description="Tip callouts"
            value={colors.calloutTip || '#06b6d4'}
            onChange={(v) => handleColorChange('calloutTip', v)}
          />
        </div>
      </div>
    </div>
  )
}
