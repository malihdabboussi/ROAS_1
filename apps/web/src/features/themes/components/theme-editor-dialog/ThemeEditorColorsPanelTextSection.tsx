'use client'

import type { UserThemeColors } from '../../types'
import { TextColorPicker } from '../TextColorPicker'

export interface ThemeEditorColorsPanelTextSectionProps {
  colors: UserThemeColors
  handleColorChange: (key: keyof UserThemeColors, value: string) => void
}

export function ThemeEditorColorsPanelTextSection({
  colors,
  handleColorChange,
}: ThemeEditorColorsPanelTextSectionProps) {
  return (
    <div>
      <h3 className="body-1 mb-spacing-4 font-semibold text-[var(--color-foreground)]">
        Text Colors
      </h3>
      <div className="gap-spacing-4 grid grid-cols-1 xl:grid-cols-2">
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
  )
}
