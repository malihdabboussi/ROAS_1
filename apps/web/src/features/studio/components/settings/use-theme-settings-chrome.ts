'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { MEDIA_TOAST_ERRORS } from '@/lib/config/media-toast-errors.config'
import { useCloudAttach } from '@/lib/hooks/use-cloud-attach'
import type { ThemeNavTab, ThemeSettingsProps } from './theme-settings.types'
import { useThemeSettingsData } from './use-theme-settings-data'

const DROPDOWN_WIDTH = 288

type DataApi = ReturnType<typeof useThemeSettingsData>

export function useThemeSettingsChrome(
  { initialTab }: Pick<ThemeSettingsProps, 'initialTab' | 'onTabChange' | 'showInlineTabs'>,
  data: DataApi,
) {
  const { selectedTheme } = data
  const [showSelector, setShowSelector] = useState(false)
  const selectorRef = useRef<HTMLDivElement>(null)
  const changeButtonRef = useRef<HTMLButtonElement>(null)
  const selectThemeButtonRef = useRef<HTMLButtonElement>(null)
  const [dropdownPos, setDropdownPos] = useState<{
    top: number
    left: number
    width: number
  } | null>(null)

  const [showImportDropdown, setShowImportDropdown] = useState(false)
  const [showWebsiteImport, setShowWebsiteImport] = useState(false)
  const [showFileImport, setShowFileImport] = useState(false)
  const [isEditingThemeName, setIsEditingThemeName] = useState(false)
  const importDropdownRef = useRef<HTMLDivElement>(null)
  const themeNameInputRef = useRef<HTMLInputElement>(null)

  const [activeTab, setActiveTabInternal] = useState<ThemeNavTab>(initialTab ?? 'colors')

  useEffect(() => {
    if (initialTab && initialTab !== activeTab) {
      setActiveTabInternal(initialTab)
    }
  }, [initialTab])

  const [logoAddMenuOpen, setLogoAddMenuOpen] = useState(false)
  const [showLogoLibraryPicker, setShowLogoLibraryPicker] = useState(false)
  const [isDraggingLogoFile, setIsDraggingLogoFile] = useState(false)
  const logoAddMenuRef = useRef<HTMLDivElement>(null)
  const logoFileInputRef = useRef<HTMLInputElement>(null)
  const logoDragDepth = useRef(0)

  const {
    showDrivePicker,
    setShowDrivePicker,
    showDropboxPicker,
    setShowDropboxPicker,
    openDrive,
    openDropbox,
  } = useCloudAttach({
    behavior: 'connect_if_disconnected',
    onBeforeOpen: () => setLogoAddMenuOpen(false),
    onDriveStatusErrorToast: MEDIA_TOAST_ERRORS.DRIVE_STATUS_CHECK_FAILED.userMessage,
    onDropboxStatusErrorToast: MEDIA_TOAST_ERRORS.DROPBOX_STATUS_CHECK_FAILED.userMessage,
  })

  useLayoutEffect(() => {
    if (!showSelector) {
      setDropdownPos(null)
      return
    }
    const btnRef = selectedTheme ? changeButtonRef : selectThemeButtonRef
    const btn = btnRef.current
    if (!btn) return
    const rect = btn.getBoundingClientRect()
    if (selectedTheme) {
      setDropdownPos({
        top: rect.bottom + 8,
        left: rect.left,
        width: DROPDOWN_WIDTH,
      })
    } else {
      setDropdownPos({
        top: rect.bottom + 8,
        left: rect.left + rect.width / 2 - DROPDOWN_WIDTH / 2,
        width: DROPDOWN_WIDTH,
      })
    }
  }, [showSelector, selectedTheme])

  useEffect(() => {
    if (!showSelector) return
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (
        selectorRef.current &&
        !selectorRef.current.contains(target) &&
        !target.closest('[data-theme-selector-dropdown]')
      ) {
        setShowSelector(false)
      }
    }
    const handleScroll = (e: Event) => {
      const t = e.target
      if (t instanceof HTMLElement && t.closest('[data-theme-selector-dropdown]')) return
      setShowSelector(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('scroll', handleScroll, true)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('scroll', handleScroll, true)
    }
  }, [showSelector])

  useEffect(() => {
    if (!showImportDropdown) return
    const handleClick = (e: MouseEvent) => {
      if (importDropdownRef.current && !importDropdownRef.current.contains(e.target as Node)) {
        setShowImportDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showImportDropdown])

  useEffect(() => {
    if (!logoAddMenuOpen) return
    const close = (e: MouseEvent) => {
      const el = logoAddMenuRef.current
      if (el && !el.contains(e.target as Node)) setLogoAddMenuOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [logoAddMenuOpen])

  useEffect(() => {
    logoDragDepth.current = 0
    setIsDraggingLogoFile(false)
  }, [selectedTheme?.id])

  useEffect(() => {
    if (isEditingThemeName && themeNameInputRef.current && !selectedTheme?.is_system) {
      themeNameInputRef.current.focus()
      themeNameInputRef.current.select()
    }
  }, [isEditingThemeName, selectedTheme?.is_system])

  useEffect(() => {
    if (selectedTheme) {
      setIsEditingThemeName(false)
    }
  }, [selectedTheme])

  return {
    showSelector,
    setShowSelector,
    selectorRef,
    changeButtonRef,
    selectThemeButtonRef,
    dropdownPos,
    showImportDropdown,
    setShowImportDropdown,
    showWebsiteImport,
    setShowWebsiteImport,
    showFileImport,
    setShowFileImport,
    isEditingThemeName,
    setIsEditingThemeName,
    importDropdownRef,
    themeNameInputRef,
    activeTab,
    setActiveTabInternal,
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
  }
}
