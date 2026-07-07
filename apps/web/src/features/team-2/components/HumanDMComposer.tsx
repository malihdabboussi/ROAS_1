'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
} from 'react'
import { Paperclip, Send } from 'lucide-react'
import { toast } from 'sonner'
import {
  PastedTextEditorModal,
  PastedTextStrip,
  usePastedTextBlocks,
} from '@/components/chat/PastedTextComposerAdapter'
import {
  FileAttachments,
  type AttachedFile,
  type ParsedFileResult,
} from '@/components/chat/FileAttachments'
import { Tooltip } from '@/components/ui/tooltip'
import {
  CHAT_FILE_INPUT_ACCEPT,
  CHAT_MAX_FILES,
  CHAT_TOAST_ERRORS,
  CHAT_UPLOAD_CONCURRENCY,
  getChatFileSizeError,
} from '@/lib/chat'
import { usePresignedUpload } from '@/lib/hooks/use-presigned-upload'
import { extractClipboardImageFiles } from '@/lib/media/clipboard-image'
import { concurrentMap } from '@/lib/media/presigned-client-upload'

export interface HumanDmComposerPayload {
  content: string
  attachments?: string[]
}

interface HumanDMComposerProps {
  conversationId: string
  partnerName: string
  onSend: (payload: HumanDmComposerPayload) => Promise<void> | void
}

const MIN_HEIGHT_PX = 44
const MAX_HEIGHT_PX = 220
const DRAFT_KEY_PREFIX = 'vibey-dm-draft'

export function HumanDMComposer({ conversationId, partnerName, onSend }: HumanDMComposerProps) {
  const draftKey = `${DRAFT_KEY_PREFIX}:${conversationId}:main`
  const [value, setValue] = useState('')
  const [sending, setSending] = useState(false)
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { upload: presignedUpload } = usePresignedUpload()
  const {
    blocks: pastedBlocks,
    hasBlocks: hasPastedBlocks,
    editingBlock: pastedEditingBlock,
    editingBlockId: pastedEditingBlockId,
    setEditingBlockId: setPastedEditingBlockId,
    tryAddFromClipboard,
    updateBlock: updatePastedBlock,
    removeBlock: removePastedBlock,
    clearAll: clearPastedBlocks,
    mergeForSend,
  } = usePastedTextBlocks({
    persistence: { mode: 'localStorage', draftKey },
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const saved = localStorage.getItem(draftKey)
    if (saved) setValue(saved)
  }, [draftKey])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const timer = setTimeout(() => {
      if (value.trim()) {
        localStorage.setItem(draftKey, value)
      } else {
        localStorage.removeItem(draftKey)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [value, draftKey])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const next = Math.min(Math.max(el.scrollHeight, MIN_HEIGHT_PX), MAX_HEIGHT_PX)
    el.style.height = `${next}px`
  }, [value])

  const handleRemoveFile = useCallback((id: string) => {
    setAttachedFiles((prev) => {
      const target = prev.find((item) => item.id === id)
      if (target?.previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(target.previewUrl)
      }
      return prev.filter((item) => item.id !== id)
    })
  }, [])

  const handleFileSelect = useCallback(
    async (fileList: FileList | File[] | null) => {
      if (!fileList) return
      const incoming = Array.from(fileList)
      if (attachedFiles.length + incoming.length > CHAT_MAX_FILES) {
        toast.error(CHAT_TOAST_ERRORS.MAX_FILES_EXCEEDED.userMessage)
        return
      }
      for (const file of incoming) {
        const sizeError = getChatFileSizeError(file)
        if (sizeError) {
          toast.error(sizeError)
          return
        }
      }
      const toUpload: AttachedFile[] = incoming.map((file) => ({
        id: crypto.randomUUID(),
        file,
        uploading: true,
        previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      }))
      setAttachedFiles((prev) => [...prev, ...toUpload])
      await concurrentMap(toUpload, CHAT_UPLOAD_CONCURRENCY, async (entry) => {
        try {
          const confirmed = await presignedUpload({
            file: entry.file,
            name: entry.file.name,
            category: 'dm_attachment',
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
            prev.map((item) =>
              item.id === entry.id ? { ...item, uploading: false, parsed } : item,
            ),
          )
        } catch {
          setAttachedFiles((prev) =>
            prev.map((item) =>
              item.id === entry.id
                ? { ...item, uploading: false, error: CHAT_TOAST_ERRORS.UPLOAD_FAILED.userMessage }
                : item,
            ),
          )
        }
      })
    },
    [attachedFiles.length, presignedUpload],
  )

  const collectAttachmentUrls = useCallback((): string[] => {
    const urls: string[] = []
    for (const file of attachedFiles) {
      if (file.uploading || file.error) continue
      const fileUrl = file.parsed?.find((item) => item.fileUrl)?.fileUrl
      if (fileUrl) urls.push(fileUrl)
    }
    return urls
  }, [attachedFiles])

  const clearAttachedFiles = useCallback(() => {
    setAttachedFiles((prev) => {
      prev.forEach((file) => {
        if (file.previewUrl?.startsWith('blob:')) {
          URL.revokeObjectURL(file.previewUrl)
        }
      })
      return []
    })
  }, [])

  const submit = async () => {
    const mergedContent = mergeForSend(value).trim()
    const attachments = collectAttachmentUrls()
    if ((!mergedContent && attachments.length === 0) || sending) return
    if (attachedFiles.some((file) => file.uploading)) {
      toast.error('Wait for files to finish uploading.')
      return
    }
    setSending(true)
    try {
      await onSend({
        content: mergedContent,
        attachments: attachments.length ? attachments : undefined,
      })
      setValue('')
      clearPastedBlocks()
      clearAttachedFiles()
      if (typeof window !== 'undefined') {
        localStorage.removeItem(draftKey)
      }
    } finally {
      setSending(false)
    }
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void submit()
    }
  }

  const onPaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedImages = extractClipboardImageFiles(e)
    if (pastedImages.length > 0) {
      e.preventDefault()
      void handleFileSelect(pastedImages)
      return
    }
    if (tryAddFromClipboard(e.clipboardData)) {
      e.preventDefault()
    }
  }

  const canSend =
    (value.trim().length > 0 || hasPastedBlocks || attachedFiles.length > 0) &&
    !attachedFiles.some((file) => file.uploading)

  return (
    <>
      <div className="border-subtle bg-card gap-spacing-2 px-spacing-3 py-spacing-2 flex flex-col rounded-2xl border">
        <PastedTextStrip
          blocks={pastedBlocks}
          onBlockClick={(block) => setPastedEditingBlockId(block.id)}
          onBlockRemove={(block) => removePastedBlock(block.id)}
          stripClassName="pb-spacing-1"
        />
        <FileAttachments
          files={attachedFiles}
          onRemove={handleRemoveFile}
          stripClassName="pb-spacing-1"
        />
        <div className="gap-spacing-2 flex items-end">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={CHAT_FILE_INPUT_ACCEPT}
            className="hidden"
            onChange={(e) => {
              void handleFileSelect(e.target.files)
              e.target.value = ''
            }}
          />
          <Tooltip
            label={
              attachedFiles.length >= CHAT_MAX_FILES
                ? `Max ${CHAT_MAX_FILES} files`
                : 'Attach files'
            }
          >
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={attachedFiles.length >= CHAT_MAX_FILES}
              className="text-muted-foreground hover:bg-hover-subtle hover:text-foreground mb-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-30"
              aria-label="Attach files"
            >
              <Paperclip className="h-4 w-4" />
            </button>
          </Tooltip>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            placeholder={`Message ${partnerName}…`}
            rows={1}
            className="body-2 text-foreground placeholder:text-muted-foreground/70 py-spacing-2 min-h-[44px] flex-1 resize-none border-0 bg-transparent px-0 outline-none focus:ring-0"
          />
          <button
            type="button"
            onClick={() => void submit()}
            disabled={!canSend || sending}
            className="bg-primary text-primary-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-opacity disabled:opacity-40"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
      <PastedTextEditorModal
        block={pastedEditingBlock}
        open={pastedEditingBlockId !== null}
        onOpenChange={(open) => {
          if (!open) setPastedEditingBlockId(null)
        }}
        onSave={updatePastedBlock}
        onRemove={removePastedBlock}
      />
    </>
  )
}
