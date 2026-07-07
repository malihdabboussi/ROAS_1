'use client'

import { useEffect } from 'react'
import { updateTheme } from '../../services/themes.service'
import type {
  BrandValues,
  BrandVoice,
  DesignSettings,
  SocialLinks,
  UserThemeColors,
} from '../../types'

export function useThemeEditorDialogAutoSave(params: {
  themeId: string | undefined
  open: boolean
  isForkingSystem: boolean
  colors: UserThemeColors
  name: string
  logoAssetId: string | null
  fontHeading: string | null
  fontBody: string | null
  brandVoice: BrandVoice | null
  brandValues: BrandValues | null
  socialLinks: SocialLinks | null
  designSettings: DesignSettings
  imageStylePrompt: string | null
  setIsSaving: (v: boolean) => void
}): void {
  const {
    themeId,
    open,
    isForkingSystem,
    colors,
    name,
    logoAssetId,
    fontHeading,
    fontBody,
    brandVoice,
    brandValues,
    socialLinks,
    designSettings,
    imageStylePrompt,
    setIsSaving,
  } = params

  useEffect(() => {
    if (!themeId || !open || isForkingSystem) return
    const timer = setTimeout(async () => {
      try {
        setIsSaving(true)
        await updateTheme(themeId, {
          colors,
          name,
          logo_asset_id: logoAssetId,
          font_heading: fontHeading,
          font_body: fontBody,
          brand_voice: brandVoice,
          brand_values: brandValues,
          social_links: socialLinks,
          design_settings: designSettings,
          image_style_prompt: imageStylePrompt,
        })
      } catch {
        /* silent */
      } finally {
        setIsSaving(false)
      }
    }, 2000)
    return () => clearTimeout(timer)
  }, [
    colors,
    name,
    logoAssetId,
    fontHeading,
    fontBody,
    brandVoice,
    brandValues,
    socialLinks,
    designSettings,
    imageStylePrompt,
    themeId,
    open,
    isForkingSystem,
    setIsSaving,
  ])
}
