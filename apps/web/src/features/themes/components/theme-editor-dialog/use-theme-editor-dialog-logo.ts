'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { MEDIA_TOAST_ERRORS } from '@/lib/config/media-toast-errors.config'
import { useCloudAttach } from '@/lib/hooks/use-cloud-attach'
import type { MediaAsset } from '@/lib/services/media-api'

export function useThemeEditorDialogLogo() {
  const [logoAssetId, setLogoAssetId] = useState<string | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
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

  useEffect(() => {
    if (!logoAddMenuOpen) return
    const close = (e: MouseEvent) => {
      const el = logoAddMenuRef.current
      if (el && !el.contains(e.target as Node)) setLogoAddMenuOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [logoAddMenuOpen])

  const uploadImageToMedia = async (
    file: File,
    category: string,
  ): Promise<{ assetId: string; url: string } | null> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('category', category)
    formData.append('name', file.name)
    try {
      const { backendUpload } = await import('@/lib/api/backend-client')
      const json = await backendUpload<{
        success?: boolean
        asset?: { id?: string }
        url?: string
        error?: string
      }>('/media/upload', formData)
      if (!json?.success || !json.asset?.id || !json.url) return null
      return { assetId: json.asset.id, url: json.url }
    } catch {
      return null
    }
  }

  const applyThemeLogoFromAsset = useCallback((asset: MediaAsset) => {
    const url = asset.public_url?.trim() ?? ''
    if (!url) {
      toast.error(MEDIA_TOAST_ERRORS.ADD_TO_LIBRARY_FAILED.userMessage)
      return
    }
    setLogoAssetId(asset.id)
    setLogoUrl(url)
    setLogoAddMenuOpen(false)
    setShowLogoLibraryPicker(false)
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
    setLogoAddMenuOpen(false)
  }, [])

  return {
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
  }
}
