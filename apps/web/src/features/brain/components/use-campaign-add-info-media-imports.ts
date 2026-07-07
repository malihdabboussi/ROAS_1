'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from 'react'
import { toast } from 'sonner'
import {
  enqueueCampaignKnowledgeFileImport,
  type KnowledgeDomain,
} from '@/lib/campaigns'
import type { MediaAsset } from '@/lib/services/media-api'
import { BRAIN_TOAST_ERRORS } from '../config/brain-toast-errors.config'
import { extractDocumentTextWithAsset } from '../services/sk.service'
import {
  detectBrainUploadKind,
  getBrainUploadMediaType,
  isExtractableBrainUploadKind,
} from '../utils/upload-validation'

interface UseCampaignAddInfoMediaImportsOptions {
  campaignId: string | null
  onImported: () => Promise<void> | void
  open: boolean
  resolvedDomain?: KnowledgeDomain
  setInputMode: (mode: 'image') => void
  setOpen: (open: boolean) => void
}

export function useCampaignAddInfoMediaImports({
  campaignId,
  onImported,
  open,
  resolvedDomain,
  setInputMode,
  setOpen,
}: UseCampaignAddInfoMediaImportsOptions) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [importingFile, setImportingFile] = useState(false)
  const [mediaLibraryOpen, setMediaLibraryOpen] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [importingImage, setImportingImage] = useState(false)
  const [imageMimeType, setImageMimeType] = useState<string>('image/png')
  const [imageName, setImageName] = useState<string>('Pasted image')
  const [imageCaption, setImageCaption] = useState<string>('')
  const [imageDragOver, setImageDragOver] = useState(false)

  const toBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
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
    })
  }, [])

  const handleCloudFile = useCallback(
    async (file: File, sourceType: 'upload' | 'drive' | 'dropbox' = 'upload') => {
      if (!campaignId) {
        toast.error(BRAIN_TOAST_ERRORS.CAMPAIGN_REQUIRED.userMessage)
        return
      }
      const detectedKind = detectBrainUploadKind(file)
      const shouldExtractText = isExtractableBrainUploadKind(detectedKind)

      if (detectedKind === 'audio' || detectedKind === 'video') {
        toast.error(BRAIN_TOAST_ERRORS.CAMPAIGN_MEDIA_TYPE_UNSUPPORTED.userMessage)
        return
      }
      if (detectedKind === 'unsupported') {
        toast.error(BRAIN_TOAST_ERRORS.FILE_TYPE_UNSUPPORTED.userMessage)
        return
      }

      setImportingFile(true)
      try {
        const extractedAsset = shouldExtractText ? await extractDocumentTextWithAsset(file) : null
        const text = extractedAsset ? extractedAsset.text : await file.text()
        const content = text.trim()
        if (!content) throw new Error('No extractable text found')
        const title = file.name.replace(/\.[^.]+$/, '')
        const mediaBase64 = await toBase64(file)
        await enqueueCampaignKnowledgeFileImport({
          campaignId,
          title,
          content,
          sourceType,
          domain: resolvedDomain,
          mediaType: getBrainUploadMediaType(detectedKind),
          mediaUrl: extractedAsset?.fileUrl,
          mediaMimeType: file.type || 'application/octet-stream',
          mediaBase64,
          assetId: extractedAsset?.assetId ?? null,
          assetRef: extractedAsset?.assetRef ?? null,
        })
        toast.success('Import started. You can keep working.')
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : BRAIN_TOAST_ERRORS.IMPORT_FAILED.userMessage,
        )
      } finally {
        setImportingFile(false)
      }
    },
    [campaignId, resolvedDomain, toBase64],
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
          void handleCloudFile(file, 'upload')
        } catch {
          toast.error(`Failed to import "${asset.name}"`)
        }
      }
    },
    [handleCloudFile],
  )

  const handleImageFile = useCallback(
    async (file: File) => {
      const dataUrl = URL.createObjectURL(file)
      const base64 = await toBase64(file)
      setImagePreview(dataUrl)
      setImageBase64(base64)
      setImageMimeType(file.type || 'image/png')
      setImageName(file.name.replace(/\.[^.]+$/, '') || 'Image')
      setInputMode('image')
      setOpen(true)
    },
    [setInputMode, setOpen, toBase64],
  )

  const handleFileUpload = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return
      if (file.type.startsWith('image/')) {
        void handleImageFile(file)
      } else {
        void handleCloudFile(file, 'upload')
      }
      event.target.value = ''
    },
    [handleCloudFile, handleImageFile],
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

  const handleImportImage = useCallback(async () => {
    if (!campaignId) {
      toast.error(BRAIN_TOAST_ERRORS.CAMPAIGN_REQUIRED.userMessage)
      return
    }
    if (!imageBase64) {
      toast.error('Upload or paste an image first.')
      return
    }
    setImportingImage(true)
    try {
      await enqueueCampaignKnowledgeFileImport({
        campaignId,
        title: imageName || 'Image import',
        content: imageCaption.trim() || imageName || 'Image import',
        sourceType: 'upload',
        domain: resolvedDomain,
        mediaType: 'image',
        mediaMimeType: imageMimeType,
        mediaBase64: imageBase64,
        mediaCaption: imageCaption.trim() || undefined,
      })
      await onImported()
      setImagePreview(null)
      setImageBase64(null)
      setImageCaption('')
      toast.success('Image import started.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : BRAIN_TOAST_ERRORS.IMPORT_FAILED.userMessage)
    } finally {
      setImportingImage(false)
    }
  }, [campaignId, imageBase64, imageCaption, imageMimeType, imageName, onImported, resolvedDomain])

  return {
    fileInputRef,
    handleCloudFile,
    handleFileUpload,
    handleImageFile,
    handleImportImage,
    handleMediaLibrarySelect,
    imageBase64,
    imageCaption,
    imageDragOver,
    imageInputRef,
    imagePreview,
    importingFile,
    importingImage,
    mediaLibraryOpen,
    setImageCaption,
    setImageDragOver,
    setMediaLibraryOpen,
  }
}
