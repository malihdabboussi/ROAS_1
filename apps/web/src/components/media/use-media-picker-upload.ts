import { useCallback, useRef, useState } from 'react'
import { toast } from 'sonner'
import { isMediaLibrarySupportedUploadFile } from '@/components/media/drive-file-browser-modal.constants'
import { backendUpload } from '@/lib/api/backend-client'
import { MEDIA_TOAST_ERRORS } from '@/lib/config/media-toast-errors.config'
import type { MediaAsset } from '@/lib/services/media-api'

export function useMediaPickerUpload(options: {
  campaignId?: string
  loadAssets: (offset?: number, append?: boolean) => Promise<void>
  onUploadedUrl?: (url: string) => void
  onUploadedAsset?: (asset: MediaAsset) => void
}) {
  const { campaignId, loadAssets, onUploadedUrl, onUploadedAsset } = options
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadMenuOpen, setUploadMenuOpen] = useState(false)
  const uploadBtnRef = useRef<HTMLButtonElement>(null)
  const [showUrlModal, setShowUrlModal] = useState(false)

  const handleUploadAndReload = useCallback(
    async (file: File) => {
      if (!isMediaLibrarySupportedUploadFile(file)) {
        toast.error(MEDIA_TOAST_ERRORS.FILE_TYPE_UNSUPPORTED.userMessage)
        return
      }
      setUploading(true)
      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('name', file.name)
        if (campaignId) formData.append('campaign_id', campaignId)
        formData.append('category', 'product')
        const result = await backendUpload<{
          success?: boolean
          asset?: MediaAsset
          url?: string
        }>('/api/media/upload', formData)
        const uploadedUrl = result.asset?.public_url ?? result.url ?? null
        if (result.asset && onUploadedAsset) {
          onUploadedAsset(result.asset)
        } else if (uploadedUrl) {
          onUploadedUrl?.(uploadedUrl)
        }
        void loadAssets(0)
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : MEDIA_TOAST_ERRORS.ADD_TO_LIBRARY_FAILED.userMessage,
        )
      } finally {
        setUploading(false)
      }
    },
    [campaignId, loadAssets, onUploadedAsset, onUploadedUrl],
  )

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files) {
        for (const file of Array.from(files)) {
          void handleUploadAndReload(file)
        }
      }
      if (fileInputRef.current) fileInputRef.current.value = ''
    },
    [handleUploadAndReload],
  )

  const handleFileFromCloud = useCallback(
    (file: File) => void handleUploadAndReload(file),
    [handleUploadAndReload],
  )

  return {
    uploading,
    fileInputRef,
    uploadMenuOpen,
    setUploadMenuOpen,
    uploadBtnRef,
    showUrlModal,
    setShowUrlModal,
    handleFileChange,
    handleFileFromCloud,
  }
}
