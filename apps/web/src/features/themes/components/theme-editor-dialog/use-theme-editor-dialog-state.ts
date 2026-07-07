'use client'

import { useEffect, useState } from 'react'
import type {
  BrandValues,
  BrandVoice,
  DesignSettings,
  SocialLinks,
  UserThemeColors,
} from '../../types'
import { DEFAULT_DESIGN_SETTINGS } from '../../types'
import { runThemeEditorOpenReset } from './theme-editor-dialog-open-reset'
import { THEME_EDITOR_DEFAULT_COLORS } from './theme-editor-dialog.constants'
import type { ThemeEditorDialogProps, ThemeEditorNavTab } from './theme-editor-dialog.types'
import { useThemeEditorDialogActions } from './use-theme-editor-dialog-actions'
import { useThemeEditorDialogAutoSave } from './use-theme-editor-dialog-autosave'
import { useThemeEditorDialogImportDropdown } from './use-theme-editor-dialog-import-dropdown'
import { useThemeEditorDialogLogo } from './use-theme-editor-dialog-logo'

export function useThemeEditorDialogState({
  open,
  theme,
  onClose,
  onSave,
}: Pick<ThemeEditorDialogProps, 'open' | 'theme' | 'onClose' | 'onSave'>) {
  const isEditMode = !!theme && !theme.is_system
  const isForkingSystem = !!theme?.is_system

  const [name, setName] = useState('')
  const [colors, setColors] = useState<UserThemeColors>(THEME_EDITOR_DEFAULT_COLORS)
  const [fontHeading, setFontHeading] = useState<string | null>(null)
  const [fontHeadingWeight, setFontHeadingWeight] = useState('600')
  const [fontBody, setFontBody] = useState<string | null>(null)
  const [fontBodyWeight, setFontBodyWeight] = useState('400')
  const [activeTab, setActiveTab] = useState<ThemeEditorNavTab>('colors')
  const [usageCount, setUsageCount] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [brandVoice, setBrandVoice] = useState<BrandVoice | null>(null)
  const [brandValues, setBrandValues] = useState<BrandValues | null>(null)
  const [socialLinks, setSocialLinks] = useState<SocialLinks | null>(null)
  const [designSettings, setDesignSettings] = useState<DesignSettings>(DEFAULT_DESIGN_SETTINGS)
  const [imageStylePrompt, setImageStylePrompt] = useState<string | null>(null)
  const [showWebsiteImport, setShowWebsiteImport] = useState(false)
  const [showFileImport, setShowFileImport] = useState(false)

  const { showImportDropdown, setShowImportDropdown, importDropdownRef } =
    useThemeEditorDialogImportDropdown()

  const {
    logoAssetId,
    setLogoAssetId,
    logoUrl,
    setLogoUrl,
    logoAddMenuOpen,
    setLogoAddMenuOpen,
    showLogoLibraryPicker,
    setShowLogoLibraryPicker,
    isDraggingLogoFile,
    setIsDraggingLogoFile,
    logoAddMenuRef,
    logoFileInputRef,
    logoDragDepth,
    showDrivePicker,
    setShowDrivePicker,
    showDropboxPicker,
    setShowDropboxPicker,
    openDrive,
    openDropbox,
    uploadThemeLogoFile,
    applyThemeLogoFromAsset,
  } = useThemeEditorDialogLogo()

  useEffect(() => {
    runThemeEditorOpenReset(open, theme, {
      logoDragDepth,
      setName,
      setColors,
      setLogoAssetId,
      setLogoUrl,
      setLogoAddMenuOpen,
      setShowLogoLibraryPicker,
      setIsDraggingLogoFile,
      setFontHeading,
      setFontBody,
      setBrandVoice,
      setBrandValues,
      setSocialLinks,
      setDesignSettings,
      setImageStylePrompt,
      setActiveTab,
      setUsageCount,
    })
  }, [open, theme])

  useThemeEditorDialogAutoSave({
    themeId: theme?.id,
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
  })

  const { handleColorChange, handleShuffle, handleSave, handleDelete } =
    useThemeEditorDialogActions({
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
    })

  return {
    isEditMode,
    isForkingSystem,
    name,
    setName,
    colors,
    setColors,
    logoAssetId,
    setLogoAssetId,
    logoUrl,
    setLogoUrl,
    logoAddMenuOpen,
    setLogoAddMenuOpen,
    showLogoLibraryPicker,
    setShowLogoLibraryPicker,
    isDraggingLogoFile,
    setIsDraggingLogoFile,
    logoAddMenuRef,
    logoFileInputRef,
    logoDragDepth,
    fontHeading,
    setFontHeading,
    fontHeadingWeight,
    setFontHeadingWeight,
    fontBody,
    setFontBody,
    fontBodyWeight,
    setFontBodyWeight,
    activeTab,
    setActiveTab,
    usageCount,
    isSubmitting,
    isSaving,
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
    showImportDropdown,
    setShowImportDropdown,
    showWebsiteImport,
    setShowWebsiteImport,
    showFileImport,
    setShowFileImport,
    importDropdownRef,
    showDrivePicker,
    setShowDrivePicker,
    showDropboxPicker,
    setShowDropboxPicker,
    openDrive,
    openDropbox,
    handleColorChange,
    handleShuffle,
    uploadThemeLogoFile,
    applyThemeLogoFromAsset,
    handleSave,
    handleDelete,
    theme,
  }
}

export type ThemeEditorDialogState = ReturnType<typeof useThemeEditorDialogState>
