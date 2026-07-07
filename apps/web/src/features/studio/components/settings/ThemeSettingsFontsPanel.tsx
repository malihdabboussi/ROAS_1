'use client'

import { FontPicker, FontWeightPicker } from '@/features/themes/components/FontPicker'

export interface ThemeSettingsFontsPanelProps {
  fontHeading: string | null
  setFontHeading: (v: string | null) => void
  fontHeadingWeight: string
  setFontHeadingWeight: (v: string) => void
  fontBody: string | null
  setFontBody: (v: string | null) => void
  fontBodyWeight: string
  setFontBodyWeight: (v: string) => void
}

export function ThemeSettingsFontsPanel({
  fontHeading,
  setFontHeading,
  fontHeadingWeight,
  setFontHeadingWeight,
  fontBody,
  setFontBody,
  fontBodyWeight,
  setFontBodyWeight,
}: ThemeSettingsFontsPanelProps) {
  return (
    <div>
      <div className="space-y-spacing-6 sm:space-y-spacing-8">
        <h3 className="body-1 font-semibold text-[var(--color-foreground)]">Fonts</h3>
        <div className="space-y-spacing-3">
          <label className="body-3 block font-medium text-[var(--color-muted-foreground)]">
            Headings
          </label>
          <FontPicker value={fontHeading} onChange={setFontHeading} />
          <FontWeightPicker value={fontHeadingWeight} onChange={setFontHeadingWeight} />
        </div>
        <div className="space-y-spacing-3">
          <label className="body-3 block font-medium text-[var(--color-muted-foreground)]">
            Body
          </label>
          <FontPicker value={fontBody} onChange={setFontBody} />
          <FontWeightPicker value={fontBodyWeight} onChange={setFontBodyWeight} />
        </div>
      </div>
    </div>
  )
}
