'use client'

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
import { toast } from 'sonner'
import { MEDIA_TOAST_ERRORS } from '@/lib/config/media-toast-errors.config'
import { useCloudAttach } from '@/lib/hooks/use-cloud-attach'
import type { MediaAsset } from '@/lib/services/media-api'
import { BRAIN_TOAST_ERRORS } from '../config/brain-toast-errors.config'
import type { SkDomain } from '../services/sk.service'
import {
  enqueueSkIngest,
  getFathomStatus,
  getFirefliesStatus,
} from '../services/user-brain-import.service'
import { enqueueTrainingPanelFileImport } from './training-panel-file-import'

interface UseTrainingPanelImportsOptions {
  open: boolean
  brainId: string | null
  domain: SkDomain
  onImageModeSelected: () => void
}

export function useTrainingPanelImports({
  open,
  brainId,
  domain,
  onImageModeSelected,
}: UseTrainingPanelImportsOptions) {
  const [importDropdownOpen, setImportDropdownOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const importDropdownRef = useRef<HTMLDivElement>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [imageMimeType, setImageMimeType] = useState<string>('image/png')
  const [imageName, setImageName] = useState<string>('Image')
  const [imageCaption, setImageCaption] = useState<string>('')
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [imageDragOver, setImageDragOver] = useState(false)
  const [mediaLibraryOpen, setMediaLibraryOpen] = useState(false)
  const [fathomConnected, setFathomConnected] = useState(false)
  const [firefliesConnected, setFirefliesConnected] = useState(false)

  const closeImportDropdown = useCallback(() => setImportDropdownOpen(false), [])
  const toggleImportDropdown = useCallback(() => setImportDropdownOpen((p) => !p), [])

  useEffect(() => {
    if (!importDropdownOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (importDropdownRef.current && !importDropdownRef.current.contains(e.target as Node)) {
        setImportDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [importDropdownOpen])

  useEffect(() => {
    if (!importDropdownOpen) return
    let active = true
    void Promise.all([getFathomStatus(), getFirefliesStatus()])
      .then(([f, ff]) => {
        if (!active) return
        setFathomConnected(f.connected)
        setFirefliesConnected(ff.connected)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [importDropdownOpen])

  const toBase64 = useCallback(
    (file: File): Promise<string> =>
      new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = String(reader.result ?? '')
          const [, base64 = ''] = result.split(',')
          if (!base64) {
            reject(new Error('Failed to read file'))
            return
          }
          resolve(base64)
        }
        reader.onerror = () => reject(new Error('Failed to read file'))
        reader.readAsDataURL(file)
      }),
    [],
  )

  const handleImageFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) return
      const dataUrl = URL.createObjectURL(file)
      const base64 = await toBase64(file)
      setImagePreview(dataUrl)
      setImageBase64(base64)
      setImageMimeType(file.type || 'image/png')
      setImageName(file.name.replace(/\.[^.]+$/, '') || 'Image')
      onImageModeSelected()
    },
    [onImageModeSelected, toBase64],
  )

  const handleIngestImage = useCallback(async () => {
    if (!brainId || !imageBase64) return
    try {
      await enqueueSkIngest({
        brainId,
        text: imageCaption.trim() || imageName || 'Image import',
        sourceType: 'notes',
        title: `Image: ${imageName || 'Untitled'}`,
        domain,
        mediaType: 'image',
        mediaMimeType: imageMimeType,
        mediaCaption: imageCaption.trim() || undefined,
      })
      toast.success('Added to processing queue')
      setImagePreview(null)
      setImageBase64(null)
      setImageCaption('')
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : BRAIN_TOAST_ERRORS.INGESTION_FAILED.userMessage,
      )
    }
  }, [brainId, domain, imageBase64, imageCaption, imageMimeType, imageName])

  const {
    showDrivePicker,
    setShowDrivePicker,
    showDropboxPicker,
    setShowDropboxPicker,
    openDrive,
    openDropbox,
  } = useCloudAttach({
    behavior: 'connect_if_disconnected',
    onBeforeOpen: closeImportDropdown,
    onDriveStatusErrorToast: MEDIA_TOAST_ERRORS.DRIVE_STATUS_CHECK_FAILED.userMessage,
    onDropboxStatusErrorToast: MEDIA_TOAST_ERRORS.DROPBOX_STATUS_CHECK_FAILED.userMessage,
  })

  const handleCloudFile = useCallback(
    async (file: File) => enqueueTrainingPanelFileImport({ file, brainId, domain }),
    [brainId, domain],
  )

  const handleMediaLibrarySelect = useCallback(
    async (assets: MediaAsset[]) => {
      for (const asset of assets) {
        if (!asset.public_url) continue
        try {
          const res = await fetch(asset.public_url)
          if (!res.ok) throw new Error('Download failed')
          const blob = await res.blob()
          const file = new File([blob], asset.original_filename || asset.name, {
            type: asset.mime_type || blob.type,
          })
          void handleCloudFile(file)
        } catch {
          toast.error(`Failed to import "${asset.name}"`)
        }
      }
    },
    [handleCloudFile],
  )

  useEffect(() => {
    if (!open) return
    const onPaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items
      if (!items) return
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (!file) continue
          event.preventDefault()
          void handleImageFile(file)
          break
        }
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [open, handleImageFile])

  const handleFileUpload = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      if (file.type.startsWith('image/')) {
        void handleImageFile(file)
      } else {
        void handleCloudFile(file)
      }
      e.target.value = ''
    },
    [handleCloudFile, handleImageFile],
  )

  return {
    importDropdownOpen,
    importDropdownRef,
    fileInputRef,
    closeImportDropdown,
    toggleImportDropdown,
    fathomConnected,
    firefliesConnected,
    imagePreview,
    imageInputRef,
    handleImageFile,
    imageDragOver,
    setImageDragOver,
    imageCaption,
    setImageCaption,
    canIngestImage: Boolean(imageBase64),
    handleIngestImage,
    mediaLibraryOpen,
    setMediaLibraryOpen,
    showDrivePicker,
    setShowDrivePicker,
    showDropboxPicker,
    setShowDropboxPicker,
    openDrive,
    openDropbox,
    handleCloudFile,
    handleMediaLibrarySelect,
    handleFileUpload,
  }
}
