import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { ConfirmResponse } from '@/lib/hooks/use-presigned-upload'
import {
  concurrentMap,
  pollUploadedDocumentIntelligence,
} from '@/lib/media/presigned-client-upload'
import {
  CHAT_MAX_FILES,
  CHAT_TOAST_ERRORS,
  CHAT_UPLOAD_CONCURRENCY,
  getChatFileSizeError,
} from '@/lib/chat/chat-toast-errors.config'
import type { DocumentAttachment } from '../../types'
import type { ParsedFileResult } from '../chat/FileAttachments'
import {
  createPendingAttachedFiles,
  removeAttachedFileById,
  revokeAttachedFilePreviewUrls,
  seedAttachedFilesFromDocuments,
} from './chat-input-file-state'

type UploadFile = (options: {
  file: File
  name: string
  campaign_id?: string
  category: 'chat_upload'
}) => Promise<ConfirmResponse>

type PollDocumentIntelligence = typeof pollUploadedDocumentIntelligence

export interface UseChatInputFileUploadOptions {
  initialDocuments?: DocumentAttachment[]
  campaignId?: string
  uploadFile: UploadFile
  pollDocumentIntelligence?: PollDocumentIntelligence
  createId?: () => string
  createObjectUrl?: (file: File) => string
  revokeObjectUrl?: (url: string) => void
  toastError?: (message: string) => void
}

export function useChatInputFileUpload({
  initialDocuments,
  campaignId,
  uploadFile,
  pollDocumentIntelligence = pollUploadedDocumentIntelligence,
  createId,
  createObjectUrl,
  revokeObjectUrl,
  toastError = toast.error,
}: UseChatInputFileUploadOptions) {
  const [attachedFiles, setAttachedFiles] = useState(() =>
    seedAttachedFilesFromDocuments(initialDocuments, createId),
  )
  const attachedFilesRef = useRef(attachedFiles)

  useEffect(() => {
    attachedFilesRef.current = attachedFiles
  }, [attachedFiles])

  const restoreAttachedFiles = useCallback(
    (documents?: DocumentAttachment[]) => {
      setAttachedFiles(seedAttachedFilesFromDocuments(documents, createId))
    },
    [createId],
  )

  const clearAttachedFiles = useCallback(() => {
    setAttachedFiles((prev) => {
      revokeAttachedFilePreviewUrls(prev, revokeObjectUrl)
      return []
    })
  }, [revokeObjectUrl])

  const handleRemoveFile = useCallback(
    (id: string) => {
      setAttachedFiles((prev) => removeAttachedFileById(prev, id, revokeObjectUrl))
    },
    [revokeObjectUrl],
  )

  useEffect(() => {
    return () => {
      revokeAttachedFilePreviewUrls(attachedFilesRef.current, revokeObjectUrl)
    }
  }, [revokeObjectUrl])

  const handleFileSelect = useCallback(
    async (files: FileList | readonly File[] | null) => {
      if (!files || files.length === 0) return

      const newFiles = Array.isArray(files) ? [...files] : [...files]

      if (attachedFiles.length + newFiles.length > CHAT_MAX_FILES) {
        toastError(CHAT_TOAST_ERRORS.MAX_FILES_EXCEEDED.userMessage)
        return
      }

      for (const file of newFiles) {
        const sizeError = getChatFileSizeError(file)
        if (sizeError) {
          toastError(sizeError)
          return
        }
      }

      const fileEntries = createPendingAttachedFiles(newFiles, createId, createObjectUrl)

      setAttachedFiles((prev) => [...prev, ...fileEntries])

      const markError = (entryId: string) => {
        setAttachedFiles((prev) =>
          prev.map((file) =>
            file.id === entryId
              ? { ...file, uploading: false, error: CHAT_TOAST_ERRORS.UPLOAD_FAILED.userMessage }
              : file,
          ),
        )
      }

      await concurrentMap(fileEntries, CHAT_UPLOAD_CONCURRENCY, async (entry) => {
        try {
          const confirmed = await uploadFile({
            file: entry.file,
            name: entry.file.name,
            campaign_id: campaignId,
            category: 'chat_upload',
          })
          const mime = entry.file.type || confirmed.asset?.mime_type || 'application/octet-stream'
          const fileUrl = confirmed.url || confirmed.asset?.public_url || undefined
          const type: ParsedFileResult['type'] = mime.startsWith('image/')
            ? 'image'
            : mime.startsWith('video/')
              ? 'video'
              : mime.startsWith('audio/')
                ? 'audio'
                : 'text'
          const parsed: ParsedFileResult[] = [
            {
              filename: entry.file.name,
              mimeType: mime,
              sizeBytes: entry.file.size,
              type,
              fileUrl,
              mediaAssetId: confirmed.asset?.id,
              documentIntelligence: confirmed.asset?.document_intelligence ?? null,
            },
          ]
          setAttachedFiles((prev) =>
            prev.map((file) =>
              file.id === entry.id
                ? {
                    ...file,
                    uploading: false,
                    parsed,
                    documentStatus:
                      type === 'text'
                        ? (confirmed.asset?.document_intelligence?.status ?? 'processing')
                        : undefined,
                  }
                : file,
            ),
          )
          if (type === 'text' && confirmed.asset?.id) {
            const refreshed = await pollDocumentIntelligence(confirmed.asset.id)
            const intelligence = refreshed?.document_intelligence ?? null
            setAttachedFiles((prev) =>
              prev.map((file) =>
                file.id === entry.id
                  ? {
                      ...file,
                      documentStatus: intelligence?.status ?? 'uploaded',
                      parsed: file.parsed?.map((item) => ({
                        ...item,
                        documentIntelligence: intelligence,
                      })),
                    }
                  : file,
              ),
            )
          }
        } catch {
          markError(entry.id)
        }
      })
    },
    [
      attachedFiles.length,
      campaignId,
      createId,
      createObjectUrl,
      pollDocumentIntelligence,
      toastError,
      uploadFile,
    ],
  )

  return {
    attachedFiles,
    setAttachedFiles,
    restoreAttachedFiles,
    clearAttachedFiles,
    handleFileSelect,
    handleRemoveFile,
  }
}
