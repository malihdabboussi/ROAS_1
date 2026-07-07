import { useCallback, useEffect, useRef } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { toast } from 'sonner'
import {
  SPACE_COMPOSER_IMPORT_FILES_EVENT,
  type SpacePresentationSourceImportDetail,
} from '@/lib/spaces/presentation-import-events'
import { CHAT_MAX_FILES, CHAT_TOAST_ERRORS } from '@/lib/chat/chat-toast-errors.config'
import type { AttachedArtifact } from '../chat/ArtifactAttachments'
import type { AttachedFile, ParsedFileResult } from '../chat/FileAttachments'

interface UseChatInputExternalAttachmentsOptions {
  enabled: boolean
  setAttachedArtifacts: Dispatch<SetStateAction<AttachedArtifact[]>>
  setAttachedFiles: Dispatch<SetStateAction<AttachedFile[]>>
  setText: (text: string) => void
  handleFileSelect: (files: FileList | readonly File[] | null) => void | Promise<void>
  createId?: () => string
  toastError?: (message: string) => void
}

function defaultCreateId() {
  return crypto.randomUUID()
}

export function useChatInputExternalAttachments({
  enabled,
  setAttachedArtifacts,
  setAttachedFiles,
  setText,
  handleFileSelect,
  createId = defaultCreateId,
  toastError = toast.error,
}: UseChatInputExternalAttachmentsOptions) {
  const handleFileSelectRef = useRef(handleFileSelect)
  handleFileSelectRef.current = handleFileSelect

  const attachComposerSpaceTask = useCallback(
    (id: string, label: string) => {
      setAttachedArtifacts((prev) =>
        prev.some((artifact) => artifact.id === id && artifact.type === 'space-task')
          ? prev
          : [...prev, { id, type: 'space-task', label }],
      )
    },
    [setAttachedArtifacts],
  )

  const attachComposerSpaceFile = useCallback(
    (url: string, name: string, mimeType?: string) => {
      const trimmedUrl = url.trim()
      if (!trimmedUrl) return
      const mime = mimeType?.trim() || 'application/octet-stream'
      const filename = name.trim() || 'file'
      const parsedType: ParsedFileResult['type'] = mime.startsWith('image/')
        ? 'image'
        : mime.startsWith('video/')
          ? 'video'
          : mime.startsWith('audio/')
            ? 'audio'
            : 'text'

      setAttachedFiles((prev) => {
        if (prev.length >= CHAT_MAX_FILES) {
          toastError(CHAT_TOAST_ERRORS.MAX_FILES_EXCEEDED.userMessage)
          return prev
        }
        if (prev.some((entry) => entry.parsed?.some((parsed) => parsed.fileUrl === trimmedUrl))) {
          return prev
        }
        return [
          ...prev,
          {
            id: createId(),
            file: new globalThis.File([], filename, { type: mime }),
            uploading: false,
            previewUrl: parsedType === 'image' ? trimmedUrl : undefined,
            parsed: [
              {
                filename,
                mimeType: mime,
                sizeBytes: 0,
                type: parsedType,
                fileUrl: trimmedUrl,
              },
            ],
          },
        ]
      })
    },
    [createId, setAttachedFiles, toastError],
  )

  useEffect(() => {
    if (!enabled) return
    const onAttachTask = (event: Event) => {
      const detail = (event as CustomEvent<{ id?: unknown; label?: unknown }>).detail
      if (typeof detail?.id !== 'string' || typeof detail?.label !== 'string') return
      attachComposerSpaceTask(detail.id, detail.label)
    }
    const onAttachFile = (event: Event) => {
      const detail = (event as CustomEvent<{ url?: unknown; name?: unknown; mime_type?: unknown }>)
        .detail
      if (typeof detail?.url !== 'string') return
      const name = typeof detail.name === 'string' ? detail.name : 'file'
      const mimeType = typeof detail.mime_type === 'string' ? detail.mime_type : undefined
      attachComposerSpaceFile(detail.url, name, mimeType)
    }
    window.addEventListener('space-vibey:attach-task', onAttachTask as EventListener)
    window.addEventListener('space-vibey:attach-file', onAttachFile as EventListener)
    return () => {
      window.removeEventListener('space-vibey:attach-task', onAttachTask as EventListener)
      window.removeEventListener('space-vibey:attach-file', onAttachFile as EventListener)
    }
  }, [attachComposerSpaceFile, attachComposerSpaceTask, enabled])

  useEffect(() => {
    if (!enabled) return
    const onImportFiles = (event: Event) => {
      const detail = (event as CustomEvent<SpacePresentationSourceImportDetail>).detail
      const files = Array.isArray(detail?.files)
        ? detail.files.filter(
            (file): file is File =>
              typeof globalThis.File !== 'undefined' && file instanceof globalThis.File,
          )
        : []
      if (files.length === 0) return
      if (typeof detail.prompt === 'string') setText(detail.prompt)
      void handleFileSelectRef.current(files)
    }
    window.addEventListener(SPACE_COMPOSER_IMPORT_FILES_EVENT, onImportFiles as EventListener)
    return () => {
      window.removeEventListener(SPACE_COMPOSER_IMPORT_FILES_EVENT, onImportFiles as EventListener)
    }
  }, [enabled, setText])

  return {
    attachComposerSpaceTask,
    attachComposerSpaceFile,
  }
}
