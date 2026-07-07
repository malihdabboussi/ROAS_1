import type { Dispatch, RefObject, SetStateAction } from 'react'
import { useCallback, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { AttachedFile, ParsedFileResult } from '@/components/chat/FileAttachments'
import {
  CHAT_TOAST_ERRORS,
  CHAT_UPLOAD_CONCURRENCY,
  getChatFileSizeError,
} from '@/lib/chat/chat-toast-errors.config'
import { usePresignedUpload } from '@/lib/hooks/use-presigned-upload'
import { concurrentMap } from '@/lib/media/presigned-client-upload'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'
import { addMissionComment, type MissionCommentAttachment } from '../../services/missions.service'
import type { Mission, MissionLog } from '../../types'
import { MISSION_DETAIL_ERRORS } from '../../types'

const MISSION_MAX_FILES = 5
const MISSION_ACCEPTED_TYPES = '*/*'

interface UseMissionDetailCommentAttachmentsParams {
  mission: Mission
  setMissionLogs: Dispatch<SetStateAction<MissionLog[]>>
  activityEndRef: RefObject<HTMLDivElement | null>
}

export function useMissionDetailCommentAttachments({
  mission,
  setMissionLogs,
  activityEndRef,
}: UseMissionDetailCommentAttachmentsParams) {
  const [commentText, setCommentText] = useState('')
  const [sendingComment, setSendingComment] = useState(false)
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([])
  const [showLibraryPicker, setShowLibraryPicker] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { upload: presignedUpload } = usePresignedUpload()

  const handleFileSelect = useCallback(
    async (files: FileList | readonly File[] | null) => {
      if (!files || files.length === 0) return

      const newFiles = Array.isArray(files) ? [...files] : Array.from(files)

      if (attachedFiles.length + newFiles.length > MISSION_MAX_FILES) {
        toast.error(`You can attach up to ${MISSION_MAX_FILES} files per comment.`)
        return
      }
      for (const file of newFiles) {
        const sizeError = getChatFileSizeError(file)
        if (sizeError) {
          toast.error(sizeError)
          return
        }
      }

      const fileEntries: AttachedFile[] = newFiles.map((file) => ({
        id: crypto.randomUUID(),
        file,
        uploading: true,
      }))
      setAttachedFiles((prev) => [...prev, ...fileEntries])

      const markError = (entryId: string, _err: unknown) => {
        setAttachedFiles((prev) =>
          prev.map((f) =>
            f.id === entryId
              ? { ...f, uploading: false, error: CHAT_TOAST_ERRORS.UPLOAD_FAILED.userMessage }
              : f,
          ),
        )
      }

      await concurrentMap(fileEntries, CHAT_UPLOAD_CONCURRENCY, async (entry) => {
        try {
          const confirmed = await presignedUpload({
            file: entry.file,
            name: entry.file.name,
            campaign_id: mission.campaign_id ?? undefined,
            category: 'chat_upload',
          })
          const mime = entry.file.type || confirmed.asset?.mime_type || 'application/octet-stream'
          const fileUrl = confirmed.url || confirmed.asset?.public_url || undefined
          const type: ParsedFileResult['type'] = mime.startsWith('image/')
            ? 'image'
            : mime.startsWith('video/') || mime.startsWith('audio/')
              ? 'video'
              : 'text'
          const parsed: ParsedFileResult[] = [
            {
              filename: entry.file.name,
              mimeType: mime,
              sizeBytes: entry.file.size,
              type,
              fileUrl,
              mediaAssetId: confirmed.asset?.id,
            },
          ]
          setAttachedFiles((prev) =>
            prev.map((f) => (f.id === entry.id ? { ...f, uploading: false, parsed } : f)),
          )
        } catch (err) {
          markError(entry.id, err)
        }
      })
    },
    [attachedFiles.length, mission.campaign_id, presignedUpload],
  )

  const handleRemoveFile = useCallback((id: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== id))
  }, [])

  const handleFileButtonClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileFromCloud = useCallback(
    (file: File) => {
      void handleFileSelect([file])
    },
    [handleFileSelect],
  )

  const handlePasteCommentImages = useCallback(
    (pastedFiles: File[]) => {
      void handleFileSelect(pastedFiles)
    },
    [handleFileSelect],
  )

  const handleLibrarySelect = useCallback((url: string) => {
    const filename = url.split('/').pop() || 'file'
    const mimeGuess = filename.match(/\.(png|jpg|jpeg|gif|webp)$/i) ? 'image' : 'document'
    const fakeFile = new File([new Blob()], filename, {
      type: mimeGuess === 'image' ? 'image/png' : 'application/octet-stream',
    })
    const entry: AttachedFile = {
      id: crypto.randomUUID(),
      file: fakeFile,
      uploading: false,
      parsed: [
        {
          filename,
          mimeType: fakeFile.type,
          sizeBytes: 0,
          type: mimeGuess === 'image' ? 'image' : 'text',
          fileUrl: url,
        },
      ],
    }
    setAttachedFiles((prev) => [...prev, entry])
    setShowLibraryPicker(false)
  }, [])

  const handleSendComment = async () => {
    const msg = commentText.trim()
    const hasFiles = attachedFiles.some((f) => !f.error && f.parsed?.length)
    if ((!msg && !hasFiles) || sendingComment) return
    if (attachedFiles.some((f) => f.uploading)) return
    setSendingComment(true)
    try {
      const commentAttachments: MissionCommentAttachment[] = attachedFiles
        .filter((f) => !f.error && f.parsed?.length)
        .flatMap((f) =>
          (f.parsed ?? [])
            .filter((p) => !!p.fileUrl)
            .map((p) => ({
              filename: p.filename,
              mimeType: p.mimeType,
              sizeBytes: p.sizeBytes,
              fileUrl: p.fileUrl!,
              text: p.text,
              type: p.type as MissionCommentAttachment['type'],
            })),
        )
      const effectiveMessage =
        msg || (commentAttachments.length ? `[${commentAttachments.length} file(s) attached]` : '')
      const newLog = await addMissionComment(
        mission.id,
        effectiveMessage,
        commentAttachments.length ? commentAttachments : undefined,
      )
      setMissionLogs((prev) => [...prev, newLog])
      setCommentText('')
      setAttachedFiles([])
      setTimeout(() => activityEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    } catch (err) {
      toast.error(sanitizeUserError(err, MISSION_DETAIL_ERRORS.SEND_COMMENT_FAILED.userMessage))
    } finally {
      setSendingComment(false)
    }
  }

  return {
    commentText,
    setCommentText,
    sendingComment,
    attachedFiles,
    showLibraryPicker,
    setShowLibraryPicker,
    fileInputRef,
    maxFiles: MISSION_MAX_FILES,
    acceptedTypes: MISSION_ACCEPTED_TYPES,
    handleFileSelect,
    handleRemoveFile,
    handleFileButtonClick,
    handleFileFromCloud,
    handlePasteCommentImages,
    handleLibrarySelect,
    handleSendComment,
  }
}
