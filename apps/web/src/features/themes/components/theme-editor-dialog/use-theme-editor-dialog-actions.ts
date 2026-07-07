'use client'

import { useCallback, type Dispatch, type SetStateAction } from 'react'
import { createTheme, deleteTheme, updateTheme } from '../../services/themes.service'
import type {
  BrandValues,
  BrandVoice,
  DesignSettings,
  SocialLinks,
  Theme,
  UserThemeColors,
} from '../../types'

export function useThemeEditorDialogActions(params: {
  name: string
  colors: UserThemeColors
  logoAssetId: string | null
  fontHeading: string | null
  fontBody: string | null
  brandVoice: BrandVoice | null
  brandValues: BrandValues | null
  socialLinks: SocialLinks | null
  designSettings: DesignSettings
  imageStylePrompt: string | null
  setColors: Dispatch<SetStateAction<UserThemeColors>>
  setIsSubmitting: (v: boolean) => void
  isEditMode: boolean
  theme: Theme | undefined
  onSave: (savedTheme?: Theme) => void
  onClose: () => void
}) {
  const {
    name,
    colors,
    logoAssetId,
    fontHeading,
    fontBody,
    brandVoice,
    brandValues,
    socialLinks,
    designSettings,
    imageStylePrompt,
    setColors,
    setIsSubmitting,
    isEditMode,
    theme,
    onSave,
    onClose,
  } = params

  const handleColorChange = useCallback(
    (key: keyof UserThemeColors, value: string) => setColors((prev) => ({ ...prev, [key]: value })),
    [setColors],
  )

  const handleShuffle = useCallback(() => {
    const rndHex = () =>
      '#' +
      Math.floor(Math.random() * 16777215)
        .toString(16)
        .padStart(6, '0')
    setColors({
      primary: rndHex(),
      primaryForeground: '#FFFFFF',
      secondaryAccent1: rndHex(),
      secondaryAccent2: rndHex(),
      heading: '#0F0F0F',
      body: '#5C5C5C',
      pageBackground: '#FAFAFA',
      cardBackground: '#FFFFFF',
      border: '#E0E0E0',
      input: '#F5F5F5',
    })
  }, [setColors])

  const handleSave = useCallback(async () => {
    if (!name.trim()) return
    setIsSubmitting(true)
    try {
      const body = {
        name: name.trim(),
        colors,
        logo_asset_id: logoAssetId,
        font_heading: fontHeading,
        font_body: fontBody,
        brand_voice: brandVoice,
        brand_values: brandValues,
        social_links: socialLinks,
        design_settings: designSettings,
        image_style_prompt: imageStylePrompt,
        status: 'complete' as const,
      }
      let savedTheme: Theme
      if (isEditMode) {
        savedTheme = await updateTheme(theme!.id, body)
      } else {
        savedTheme = await createTheme({
          ...body,
          colors: body.colors as unknown as Record<string, string>,
        })
      }
      onSave(savedTheme)
      onClose()
    } catch {
      /* silent */
    } finally {
      setIsSubmitting(false)
    }
  }, [
    name,
    colors,
    logoAssetId,
    fontHeading,
    fontBody,
    brandVoice,
    brandValues,
    socialLinks,
    designSettings,
    imageStylePrompt,
    setIsSubmitting,
    isEditMode,
    theme,
    onSave,
    onClose,
  ])

  const handleDelete = useCallback(async () => {
    if (!theme?.id || theme.is_system) return
    if (!confirm(`Delete theme "${theme.name}"? This cannot be undone.`)) return
    try {
      await deleteTheme(theme.id)
      onSave()
      onClose()
    } catch {
      /* silent */
    }
  }, [theme, onSave, onClose])

  return { handleColorChange, handleShuffle, handleSave, handleDelete }
}
