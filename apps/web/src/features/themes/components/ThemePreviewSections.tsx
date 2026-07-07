import { ThemePreviewSettingsSections } from './ThemePreviewSettingsSections'
import { ThemePreviewShowcaseSections } from './ThemePreviewShowcaseSections'
import type { ThemePreviewSectionsProps } from './ThemePreviewSections.types'

export function ThemePreviewSections({
  scopeClass,
  colors,
  settings,
  blockCardStyles,
  buttonStyles,
  headingFont,
  bodyFont,
}: ThemePreviewSectionsProps) {
  return (
    <div
      className={`${scopeClass} p-spacing-4 h-full overflow-y-auto`}
      // Theme preview intentionally applies user-selected theme CSS vars/styles.
      style={{ background: 'var(--color-page-background)' }}
    >
      <ThemePreviewShowcaseSections
        colors={colors}
        blockCardStyles={blockCardStyles}
        buttonStyles={buttonStyles}
        headingFont={headingFont}
        bodyFont={bodyFont}
      />
      <ThemePreviewSettingsSections
        settings={settings}
        blockCardStyles={blockCardStyles}
        buttonStyles={buttonStyles}
        headingFont={headingFont}
        bodyFont={bodyFont}
      />
    </div>
  )
}
