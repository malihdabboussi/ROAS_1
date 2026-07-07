import type { RefObject } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowDown, Cloud, FolderOpen, HardDrive, Plus, Send, Upload } from 'lucide-react'
import {
  FileAttachments,
  type AttachedFile,
} from '@/components/chat/FileAttachments'
import { CloudAttachMenuItems } from '@/components/media/CloudAttachMenuItems'
import { extractClipboardImageFiles } from '@/lib/media/clipboard-image'
import { MissionRatingStrip, type RatingPayload } from './MissionRatingStrip'

interface ActivityTimelineComposerProps {
  userHasScrolledUp: boolean
  hasLogs: boolean
  onScrollToBottom: () => void
  commentText: string
  sendingComment: boolean
  onCommentChange: (value: string) => void
  onCommentSend: () => void
  attachedFiles: AttachedFile[]
  onRemoveFile?: (id: string) => void
  onFileButtonClick?: () => void
  onOpenDrive?: () => void
  onOpenDropbox?: () => void
  onOpenLibrary?: () => void
  maxFiles: number
  fileInputRef?: RefObject<HTMLInputElement | null>
  acceptedTypes?: string
  onFileSelect?: (files: FileList | null) => void
  onPasteFiles?: (files: File[]) => void
  missionStatus?: string
  onRatingSubmit?: (payload: RatingPayload) => Promise<void>
  ratingSending?: boolean
  ratingSubmitted?: boolean
}

export function ActivityTimelineComposer({
  userHasScrolledUp,
  hasLogs,
  onScrollToBottom,
  commentText,
  sendingComment,
  onCommentChange,
  onCommentSend,
  attachedFiles,
  onRemoveFile,
  onFileButtonClick,
  onOpenDrive,
  onOpenDropbox,
  onOpenLibrary,
  maxFiles,
  fileInputRef,
  acceptedTypes,
  onFileSelect,
  onPasteFiles,
  missionStatus,
  onRatingSubmit,
  ratingSending,
  ratingSubmitted,
}: ActivityTimelineComposerProps) {
  const [attachDropdownOpen, setAttachDropdownOpen] = useState(false)
  const attachDropdownRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleTextareaInput = useCallback(() => {
    const t = textareaRef.current
    if (!t) return
    t.style.height = 'auto'
    t.style.height = `${Math.min(t.scrollHeight, 200)}px`
  }, [])

  useEffect(() => {
    if (!attachDropdownOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (attachDropdownRef.current && !attachDropdownRef.current.contains(e.target as Node)) {
        setAttachDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [attachDropdownOpen])

  return (
    <div className="relative flex-shrink-0">
      {userHasScrolledUp && hasLogs && (
        <div className="pointer-events-none absolute inset-x-0 -top-12 z-10 flex justify-center">
          <button
            type="button"
            onClick={onScrollToBottom}
            className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-card)] shadow-[0_0_12px_4px_rgba(0,0,0,0.4)] transition-all hover:opacity-90"
            aria-label="Scroll to latest activity"
            title="Scroll to latest"
          >
            <ArrowDown className="h-4 w-4" />
          </button>
        </div>
      )}
      {missionStatus === 'done' && !ratingSubmitted && onRatingSubmit && (
        <div className="px-spacing-4 pt-spacing-3">
          <MissionRatingStrip onSubmit={onRatingSubmit} sending={ratingSending} />
        </div>
      )}
      <div className="px-spacing-4 py-spacing-3">
        <div className="input-glass relative flex flex-col rounded-xl">
          {fileInputRef && acceptedTypes && onFileSelect && (
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={acceptedTypes}
              onChange={(e) => {
                onFileSelect(e.target.files)
                e.target.value = ''
              }}
              className="hidden"
            />
          )}

          <FileAttachments files={attachedFiles} onRemove={onRemoveFile ?? (() => {})} />

          <div className="relative flex-1 px-3 pt-2">
            <textarea
              ref={textareaRef}
              value={commentText}
              onChange={(e) => {
                onCommentChange(e.target.value)
                handleTextareaInput()
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  onCommentSend()
                }
              }}
              onPaste={(e) => {
                if (!onPasteFiles) return
                const imageFiles = extractClipboardImageFiles(e)
                if (imageFiles.length === 0) return
                e.preventDefault()
                onPasteFiles(imageFiles)
              }}
              placeholder="Send a message..."
              rows={1}
              className="body-3 max-h-[200px] min-h-[32px] w-full resize-none bg-transparent text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between px-2 py-1.5">
            <div className="flex items-center gap-1">
              <div className="relative" ref={attachDropdownRef}>
                <button
                  type="button"
                  onClick={() => setAttachDropdownOpen((p) => !p)}
                  disabled={attachedFiles.length >= maxFiles}
                  className="button-glass-neutral flex h-7 w-7 items-center justify-center rounded-full transition-all disabled:opacity-30"
                  title={attachedFiles.length >= maxFiles ? `Max ${maxFiles} files` : 'Attach'}
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
                {attachDropdownOpen && (
                  <div className="dropdown-menu-solid absolute bottom-full left-0 z-50 mb-1 w-48 py-1">
                    {onFileButtonClick && (
                      <button
                        type="button"
                        onClick={() => {
                          onFileButtonClick()
                          setAttachDropdownOpen(false)
                        }}
                        className="body-3 flex w-full items-center gap-2 px-3 py-2 text-left text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-secondary)]"
                      >
                        <Upload className="h-4 w-4" />
                        Upload
                      </button>
                    )}
                    {onOpenLibrary && (
                      <button
                        type="button"
                        onClick={() => {
                          onOpenLibrary()
                          setAttachDropdownOpen(false)
                        }}
                        className="body-3 flex w-full items-center gap-2 px-3 py-2 text-left text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-secondary)]"
                      >
                        <FolderOpen className="h-4 w-4" />
                        From Library
                      </button>
                    )}
                    {onOpenDrive && onOpenDropbox && (
                      <CloudAttachMenuItems
                        onDrive={() => {
                          void onOpenDrive()
                          setAttachDropdownOpen(false)
                        }}
                        onDropbox={() => {
                          void onOpenDropbox()
                          setAttachDropdownOpen(false)
                        }}
                        onSelect={() => setAttachDropdownOpen(false)}
                        driveIcon={<HardDrive className="h-4 w-4" />}
                        dropboxIcon={<Cloud className="h-4 w-4" />}
                        itemClassName="body-3 flex w-full items-center gap-2 px-3 py-2 text-left text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-secondary)]"
                      />
                    )}
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={onCommentSend}
              disabled={
                (!commentText.trim() && !attachedFiles.some((f) => !f.error && f.parsed?.length)) ||
                sendingComment ||
                attachedFiles.some((f) => f.uploading)
              }
              className="button-glass-neutral flex h-7 w-7 items-center justify-center rounded-full transition-all disabled:opacity-30"
              aria-label="Send message"
            >
              <Send className={`h-3.5 w-3.5 ${sendingComment ? 'animate-pulse' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
