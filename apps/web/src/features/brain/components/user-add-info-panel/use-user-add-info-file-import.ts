import { useCallback, useRef, useState } from 'react'
import { toast } from 'sonner'
import { usePresignedUpload } from '@/lib/hooks/use-presigned-upload'
import type { AssetRef } from '@/lib/media/presigned-client-upload'
import type { MediaAsset } from '@/lib/services/media-api'
import { BRAIN_TOAST_ERRORS } from '../../config/brain-toast-errors.config'
import { extractDocumentTextWithAsset } from '../../services/sk.service'
import { enqueueDocumentMemoryImport } from '../../services/user-brain-import.service'
import {
  detectBrainUploadKind,
  getBrainUploadMediaType,
  isExtractableBrainUploadKind,
  isSupportedNativeAudioFormat,
  isSupportedNativeVideoFormat,
  validateNativeMediaDuration,
} from '../../utils/upload-validation'

export function useUserAddInfoFileImport() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importingFile, setImportingFile] = useState(false)
  const { upload: presignedUpload } = usePresignedUpload()

  const rememberTextAsDocument = useCallback(
    async (
      text: string,
      title: string,
      sourceType: 'document' | 'dropbox' | 'google_drive',
      media?: {
        mediaType?: 'text' | 'image' | 'audio' | 'video' | 'pdf' | 'multimodal'
        mediaUrl?: string
        mediaMimeType?: string
        mediaBase64?: string
        mediaCaption?: string
        assetId?: string | null
        assetRef?: AssetRef | null
      },
    ) => {
      const content = text.trim()
      if (!content) throw new Error('No text extracted')
      await enqueueDocumentMemoryImport({
        content,
        title,
        sourceType,
        mediaType: media?.mediaType,
        mediaUrl: media?.mediaUrl,
        mediaMimeType: media?.mediaMimeType,
        mediaBase64: media?.mediaBase64,
        mediaCaption: media?.mediaCaption,
        assetId: media?.assetId,
        assetRef: media?.assetRef,
      })
    },
    [],
  )

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
    async (file: File, sourceType: 'document' | 'dropbox' | 'google_drive') => {
      const detectedKind = detectBrainUploadKind(file)
      const isAudio = detectedKind === 'audio'
      const isVideo = detectedKind === 'video'
      const shouldExtractText = isExtractableBrainUploadKind(detectedKind)

      if (detectedKind === 'unsupported') {
        toast.error(BRAIN_TOAST_ERRORS.FILE_TYPE_UNSUPPORTED.userMessage)
        return
      }
      if (isAudio && !isSupportedNativeAudioFormat(file)) {
        toast.error(BRAIN_TOAST_ERRORS.AUDIO_FORMAT_UNSUPPORTED.userMessage)
        return
      }
      if (isVideo && !isSupportedNativeVideoFormat(file)) {
        toast.error(BRAIN_TOAST_ERRORS.VIDEO_FORMAT_UNSUPPORTED.userMessage)
        return
      }
      if (isAudio || isVideo) {
        const durationValidation = await validateNativeMediaDuration(
          file,
          isAudio ? 'audio' : 'video',
        )
        if (!durationValidation.ok) {
          toast.error(BRAIN_TOAST_ERRORS[durationValidation.error].userMessage)
          return
        }
      }

      setImportingFile(true)
      try {
        const uploaded = await presignedUpload({
          file,
          name: file.name,
          category: 'brain_import',
          aiAnalysis: true,
        })
        const mediaUrl = uploaded.url || uploaded.asset?.public_url || undefined
        const extracted = shouldExtractText
          ? await extractDocumentTextWithAsset(file, {
              fileUrl: mediaUrl,
              assetId: uploaded.asset?.id ?? uploaded.asset_ref?.asset_id ?? null,
              assetRef: uploaded.asset_ref ?? null,
            })
          : null
        const text = isAudio || isVideo ? file.name : extracted ? extracted.text : await file.text()
        const title = file.name.replace(/\.[^.]+$/, '')
        await rememberTextAsDocument(text, title, sourceType, {
          mediaType: getBrainUploadMediaType(detectedKind),
          mediaUrl: extracted?.fileUrl ?? mediaUrl,
          mediaMimeType: file.type || 'application/octet-stream',
          mediaCaption: '',
          assetId: extracted?.assetId ?? uploaded.asset?.id ?? uploaded.asset_ref?.asset_id ?? null,
          assetRef: extracted?.assetRef ?? uploaded.asset_ref ?? null,
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
    [rememberTextAsDocument, presignedUpload],
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
          void handleCloudFile(file, 'document')
        } catch {
          toast.error(`Failed to import "${asset.name}"`)
        }
      }
    },
    [handleCloudFile],
  )

  return {
    fileInputRef,
    importingFile,
    toBase64,
    handleCloudFile,
    handleMediaLibrarySelect,
  }
}
