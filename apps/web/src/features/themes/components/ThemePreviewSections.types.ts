import type { CSSProperties } from 'react'
import type { DesignSettings, UserThemeColors } from '@/lib/themes'

export type ThemePreviewSectionsProps = {
  scopeClass: string
  colors: UserThemeColors
  settings: DesignSettings
  blockCardStyles: CSSProperties
  buttonStyles: CSSProperties
  headingFont: CSSProperties
  bodyFont: CSSProperties
}

export type ThemePreviewStyleProps = Pick<
  ThemePreviewSectionsProps,
  'blockCardStyles' | 'buttonStyles' | 'headingFont' | 'bodyFont'
>
