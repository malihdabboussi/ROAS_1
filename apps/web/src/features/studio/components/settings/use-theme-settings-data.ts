'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { toast } from 'sonner'
import {
  createTheme,
  getTheme,
  listThemes,
  updateTheme,
} from '@/features/themes/services/themes.service'
import type {
  BrandValues,
  BrandVoice,
  DesignSettings,
  SocialLinks,
  Theme,
  UserThemeColors,
} from '@/features/themes/types'
import { DEFAULT_DESIGN_SETTINGS } from '@/features/themes/types'
import { MEDIA_TOAST_ERRORS } from '@/lib/config/media-toast-errors.config'
import type { MediaAsset } from '@/lib/services/media-api'
import { shuffleThemeColors } from './theme-settings-color-shuffle'
import { uploadImageToMedia } from './theme-settings-media'
import { DEFAULT_COLORS } from './theme-settings.constants'
import type { ThemeSettingsProps } from './theme-settings.types'

export type ThemeImageRow = {
  asset_id: string
  url?: string
  name: string
  description: string
}

export function useThemeSettingsData({
  value,
  onChange,
}: Pick<ThemeSettingsProps, 'value' | 'onChange'>) {
  const [themes, setThemes] = useState<Theme[]>([])
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingTheme, setIsLoadingTheme] = useState(false)
  const [colors, setColors] = useState<UserThemeColors>(DEFAULT_COLORS)
  const [name, setName] = useState('')
  const [fontHeading, setFontHeading] = useState<string | null>(null)
  const [fontHeadingWeight, setFontHeadingWeight] = useState('600')
  const [fontBody, setFontBody] = useState<string | null>(null)
  const [fontBodyWeight, setFontBodyWeight] = useState('400')
  const [brandVoice, setBrandVoice] = useState<BrandVoice | null>(null)
  const [brandValues, setBrandValues] = useState<BrandValues | null>(null)
  const [socialLinks, setSocialLinks] = useState<SocialLinks | null>(null)
  const [designSettings, setDesignSettings] = useState<DesignSettings>(DEFAULT_DESIGN_SETTINGS)
  const [imageStylePrompt, setImageStylePrompt] = useState<string | null>(null)
  const [logoAssetId, setLogoAssetId] = useState<string | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [headshotImages, setHeadshotImages] = useState<ThemeImageRow[]>([])
  const [productImages, setProductImages] = useState<ThemeImageRow[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const silentDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadThemes = useCallback(async (silent = false) => {
    try {
      if (!silent) setIsLoading(true)
      const data = await listThemes()
      setThemes(data)
    } catch {
      // silent
    } finally {
      if (!silent) setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadThemes()
  }, [loadThemes])

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    const silentRefresh = () => {
      if (silentDebounceRef.current) clearTimeout(silentDebounceRef.current)
      silentDebounceRef.current = setTimeout(() => {
        void loadThemes(true)
      }, 400)
    }
    const channel = supabase
      .channel('branding_themes:all')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'branding_themes' },
        silentRefresh,
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'branding_themes' },
        silentRefresh,
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'branding_themes' },
        silentRefresh,
      )
      .subscribe()
    return () => {
      if (silentDebounceRef.current) clearTimeout(silentDebounceRef.current)
      void supabase.removeChannel(channel)
    }
  }, [loadThemes])

  const loadSelectedTheme = async (themeId: string) => {
    try {
      setIsLoadingTheme(true)
      const theme = await getTheme(themeId)
      setSelectedTheme(theme)
    } catch {
      setSelectedTheme(null)
    } finally {
      setIsLoadingTheme(false)
    }
  }

  useEffect(() => {
    if (value) {
      void loadSelectedTheme(value)
    } else {
      setSelectedTheme(null)
    }
  }, [value])

  useEffect(() => {
    if (selectedTheme) {
      setName(selectedTheme.name || '')
      setColors({
        ...DEFAULT_COLORS,
        ...selectedTheme.colors,
        slideBackground:
          selectedTheme.colors.slideBackground ||
          selectedTheme.colors.pageBackground ||
          DEFAULT_COLORS.slideBackground,
      })
      setFontHeading(selectedTheme.font_heading || null)
      setFontBody(selectedTheme.font_body || null)
      setBrandVoice(selectedTheme.brand_voice || null)
      setBrandValues(selectedTheme.brand_values || null)
      setSocialLinks(selectedTheme.social_links || null)
      setDesignSettings(selectedTheme.design_settings ?? DEFAULT_DESIGN_SETTINGS)
      setImageStylePrompt(selectedTheme.image_style_prompt || null)
      setLogoAssetId(selectedTheme.logo_asset_id || null)
      setLogoUrl(selectedTheme.logo_url || null)
      setHeadshotImages(selectedTheme.headshot_images || [])
      setProductImages(selectedTheme.product_images || [])
    }
  }, [selectedTheme])

  useEffect(() => {
    if (!selectedTheme?.id || selectedTheme.is_system) return
    const timer = setTimeout(async () => {
      try {
        setIsSaving(true)
        await updateTheme(selectedTheme.id, {
          colors,
          name,
          logo_asset_id: logoAssetId,
          headshot_images: headshotImages,
          product_images: productImages,
          font_heading: fontHeading,
          font_body: fontBody,
          brand_voice: brandVoice,
          brand_values: brandValues,
          social_links: socialLinks,
          design_settings: designSettings,
          image_style_prompt: imageStylePrompt,
        })
      } catch {
        // silent
      } finally {
        setIsSaving(false)
      }
    }, 2000)
    return () => clearTimeout(timer)
  }, [
    colors,
    name,
    logoAssetId,
    headshotImages,
    productImages,
    fontHeading,
    fontBody,
    brandVoice,
    brandValues,
    socialLinks,
    designSettings,
    imageStylePrompt,
    selectedTheme?.id,
    selectedTheme?.is_system,
  ])

  const handleCreateTheme = async () => {
    try {
      const theme = await createTheme({
        name: 'New Theme',
        colors: DEFAULT_COLORS as unknown as Record<string, string>,
        status: 'draft',
      })
      setThemes((prev) => [theme, ...prev])
      setSelectedTheme(theme)
      onChange?.(theme.id)
    } catch {
      // silent
    }
  }

  const handleSelectTheme = (theme: Theme) => {
    setSelectedTheme(theme)
    onChange?.(theme.id)
  }

  const handleColorChange = (key: keyof UserThemeColors, val: string) => {
    setColors((prev) => ({ ...prev, [key]: val }))
  }

  const handleShuffle = () => shuffleThemeColors(colors, setColors)

  const applyThemeLogoFromAsset = useCallback((asset: MediaAsset) => {
    const url = asset.public_url?.trim() ?? ''
    if (!url) {
      toast.error(MEDIA_TOAST_ERRORS.ADD_TO_LIBRARY_FAILED.userMessage)
      return
    }
    setLogoAssetId(asset.id)
    setLogoUrl(url)
  }, [])

  const uploadThemeLogoFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file')
      return
    }
    const result = await uploadImageToMedia(file, 'theme-logo')
    if (!result) {
      toast.error(MEDIA_TOAST_ERRORS.ADD_TO_LIBRARY_FAILED.userMessage)
      return
    }
    setLogoAssetId(result.assetId)
    setLogoUrl(result.url)
  }, [])

  const handleUploadHeadshot = async (file: File, imgName: string, description: string) => {
    const result = await uploadImageToMedia(file, 'headshot')
    if (!result) throw new Error('Upload failed')
    setHeadshotImages((prev) => [
      ...prev,
      { asset_id: result.assetId, url: result.url, name: imgName, description },
    ])
  }

  const handleRemoveHeadshot = (index: number) => {
    setHeadshotImages((prev) => prev.filter((_, i) => i !== index))
  }

  const handleUpdateHeadshot = (
    index: number,
    updates: { name?: string; description?: string },
  ) => {
    setHeadshotImages((prev) => prev.map((img, i) => (i === index ? { ...img, ...updates } : img)))
  }

  const handleUploadProductImage = async (file: File, imgName: string, description: string) => {
    const result = await uploadImageToMedia(file, 'product')
    if (!result) throw new Error('Upload failed')
    setProductImages((prev) => [
      ...prev,
      { asset_id: result.assetId, url: result.url, name: imgName, description },
    ])
  }

  const handleRemoveProductImage = (index: number) => {
    setProductImages((prev) => prev.filter((_, i) => i !== index))
  }

  const handleUpdateProductImage = (
    index: number,
    updates: { name?: string; description?: string },
  ) => {
    setProductImages((prev) => prev.map((img, i) => (i === index ? { ...img, ...updates } : img)))
  }

  return {
    themes,
    selectedTheme,
    isLoading,
    isLoadingTheme,
    isSaving,
    colors,
    setColors,
    name,
    setName,
    fontHeading,
    setFontHeading,
    fontHeadingWeight,
    setFontHeadingWeight,
    fontBody,
    setFontBody,
    fontBodyWeight,
    setFontBodyWeight,
    brandVoice,
    setBrandVoice,
    brandValues,
    setBrandValues,
    socialLinks,
    setSocialLinks,
    designSettings,
    setDesignSettings,
    imageStylePrompt,
    setImageStylePrompt,
    logoAssetId,
    setLogoAssetId,
    logoUrl,
    setLogoUrl,
    headshotImages,
    productImages,
    handleCreateTheme,
    handleSelectTheme,
    handleColorChange,
    handleShuffle,
    applyThemeLogoFromAsset,
    uploadThemeLogoFile,
    handleUploadHeadshot,
    handleRemoveHeadshot,
    handleUpdateHeadshot,
    handleUploadProductImage,
    handleRemoveProductImage,
    handleUpdateProductImage,
  }
}
