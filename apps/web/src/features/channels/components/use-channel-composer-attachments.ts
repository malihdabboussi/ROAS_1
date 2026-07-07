'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  CHAT_MAX_FILES,
  CHAT_TOAST_ERRORS,
  CHAT_UPLOAD_CONCURRENCY,
  getChatFileSizeError,
} from '@/lib/chat/chat-toast-errors.config'
import { usePresignedUpload } from '@/lib/hooks/use-presigned-upload'
import { concurrentMap } from '@/lib/media/presigned-client-upload'
import {
  hydrateAttachmentsFromStorage,
  type AttachedFile,
  type PersistedAttachment,
} from './ChannelComposerAttachments'

function revokePreviewUrl(file: AttachedFile) {
  if (file.previewUrl?.startsWith('blob:')) {
    URL.revokeObjectURL(file.previewUrl)
  }
}

export function useChannelComposerAttachments({
  embedded,
  campaignId,
  attachmentsKey,
}: {
  embedded: boolean
  campaignId?: string | null
  attachmentsKey: string
}) {
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>(() =>
    embedded ? [] : hydrateAttachmentsFromStorage(attachmentsKey),
  )
  const { upload: presignedUpload } = usePresignedUpload()

  useEffect(() => {
    if (embedded || typeof window === 'undefined') return
    const persistable: PersistedAttachment[] = attachedFiles
      .filter((file) => !file.uploading && !file.error && file.url)
      .map((file) => ({
        id: file.id,
        filename: file.filename,
        mimeType: file.mimeType,
        url: file.url!,
        previewUrl: file.previewUrl,
        isDriveLink: file.isDriveLink,
      }))
    if (persistable.length === 0) {
      localStorage.removeItem(attachmentsKey)
    } else {
      localStorage.setItem(attachmentsKey, JSON.stringify(persistable))
    }
  }, [attachedFiles, attachmentsKey, embedded])

  useEffect(() => {
    return () => {
      setAttachedFiles((prev) => {
        prev.forEach(revokePreviewUrl)
        return prev
      })
    }
  }, [])

  const handleFileSelect = useCallback(
    async (fileList: FileList | File[] | null) => {
      if (!fileList) return
      const incoming = Array.from(fileList)
      if (attachedFiles.length + incoming.length > CHAT_MAX_FILES) {
        toast.error(CHAT_TOAST_ERRORS.MAX_FILES_EXCEEDED.userMessage)
        return
      }
      const toUpload: AttachedFile[] = incoming
        .filter((file) => {
          const sizeError = getChatFileSizeError(file)
          if (sizeError) {
            toast.error(sizeError)
            return false
          }
          return true
        })
        .map((file) => ({
          id: crypto.randomUUID(),
          file,
          filename: file.name,
          mimeType: file.type,
          uploading: true,
          previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
        }))
      setAttachedFiles((prev) => [...prev, ...toUpload])
      await concurrentMap(toUpload, CHAT_UPLOAD_CONCURRENCY, async (attachedFile) => {
        try {
          if (attachedFile.file == null) return
          const result = await presignedUpload({
            file: attachedFile.file,
            category: 'channel_attachment',
            ...(campaignId ? { campaign_id: campaignId } : {}),
          })
          setAttachedFiles((prev) =>
            prev.map((item) =>
              item.id === attachedFile.id
                ? {
                    ...item,
                    uploading: false,
                    url: result.url || result.asset?.public_url || undefined,
                  }
                : item,
            ),
          )
        } catch {
          setAttachedFiles((prev) =>
            prev.map((item) =>
              item.id === attachedFile.id
                ? { ...item, uploading: false, error: 'Upload failed' }
                : item,
            ),
          )
        }
      })
    },
    [attachedFiles, campaignId, presignedUpload],
  )

  const removeAttachedFile = useCallback((fileId: string) => {
    setAttachedFiles((prev) => {
      const target = prev.find((file) => file.id === fileId)
      if (target) revokePreviewUrl(target)
      return prev.filter((file) => file.id !== fileId)
    })
  }, [])

  const clearAttachedFiles = useCallback(() => {
    setAttachedFiles((prev) => {
      prev.forEach(revokePreviewUrl)
      return []
    })
  }, [])

  return {
    attachedFiles,
    setAttachedFiles,
    handleFileSelect,
    removeAttachedFile,
    clearAttachedFiles,
  }
}
