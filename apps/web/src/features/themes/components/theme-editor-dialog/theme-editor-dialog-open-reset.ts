import type { MutableRefObject } from 'react'
import { toast } from 'sonner'
import { THEME_ERRORS } from '../../config/theme-errors.config'
import { getThemeUsage } from '../../services/themes.service'
import type {
  BrandValues,
  BrandVoice,
  DesignSettings,
  SocialLinks,
  Theme,
  UserThemeColors,
} from '../../types'
import { DEFAULT_DESIGN_SETTINGS } from '../../types'
import { THEME_EDITOR_DEFAULT_COLORS } from './theme-editor-dialog.constants'
import type { ThemeEditorNavTab } from './theme-editor-dialog.types'

export interface ThemeEditorOpenResetCtx {
  logoDragDepth: MutableRefObject<number>
  setName: (v: string) => void
  setColors: (v: UserThemeColors) => void
  setLogoAssetId: (v: string | null) => void
  setLogoUrl: (v: string | null) => void
  setLogoAddMenuOpen: (v: boolean) => void
  setShowLogoLibraryPicker: (v: boolean) => void
  setIsDraggingLogoFile: (v: boolean) => void
  setFontHeading: (v: string | null) => void
  setFontBody: (v: string | null) => void
  setBrandVoice: (v: BrandVoice | null) => void
  setBrandValues: (v: BrandValues | null) => void
  setSocialLinks: (v: SocialLinks | null) => void
  setDesignSettings: (v: DesignSettings) => void
  setImageStylePrompt: (v: string | null) => void
  setActiveTab: (v: ThemeEditorNavTab) => void
  setUsageCount: (v: number | null) => void
}

export function runThemeEditorOpenReset(
  open: boolean,
  theme: Theme | undefined,
  ctx: ThemeEditorOpenResetCtx,
): void {
  if (!open) return
  ctx.setName(theme?.name ? (theme.is_system ? `${theme.name} (Copy)` : theme.name) : '')
  ctx.setColors(
    theme?.colors
      ? {
          ...THEME_EDITOR_DEFAULT_COLORS,
          ...theme.colors,
          slideBackground: theme.colors.slideBackground || theme.colors.pageBackground,
        }
      : THEME_EDITOR_DEFAULT_COLORS,
  )
  ctx.setLogoAssetId(theme?.logo_asset_id || null)
  ctx.setLogoUrl(theme?.logo_url ?? null)
  ctx.setLogoAddMenuOpen(false)
  ctx.setShowLogoLibraryPicker(false)
  ctx.logoDragDepth.current = 0
  ctx.setIsDraggingLogoFile(false)
  ctx.setFontHeading(theme?.font_heading || null)
  ctx.setFontBody(theme?.font_body || null)
  ctx.setBrandVoice(theme?.brand_voice || null)
  ctx.setBrandValues(theme?.brand_values || null)
  ctx.setSocialLinks(theme?.social_links || null)
  ctx.setDesignSettings(theme?.design_settings ?? DEFAULT_DESIGN_SETTINGS)
  ctx.setImageStylePrompt(theme?.image_style_prompt || null)
  ctx.setActiveTab('colors')
  ctx.setUsageCount(null)
  if (theme?.id)
    getThemeUsage(theme.id)
      .then((c) => ctx.setUsageCount(c))
      .catch((err) =>
        toast.error(
          err instanceof Error ? err.message : THEME_ERRORS.LOAD_THEME_USAGE_FAILED.userMessage,
        ),
      )
}
