'use client'

import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Check, Pencil, Trash2, X } from 'lucide-react'
import { ChatAttachmentPreviews } from '@/components/chat/ChatAttachmentPreviewsAdapter'
import { attachmentUrlsToDocuments } from '@/lib/chat'
import type { DmMessage } from '../services/dm.service'

interface HumanDMMessageBubbleProps {
  message: DmMessage
  isOwn: boolean
  senderName: string
  avatarUrl: string | null
  showHeader: boolean
  onEdit: (messageId: string, nextContent: string) => Promise<void>
  onDelete: (messageId: string) => Promise<void>
}

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) {
    return <img src={url} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
  }
  return (
    <div className="bg-muted text-muted-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
      <span className="body-3 font-semibold uppercase">{name.slice(0, 1)}</span>
    </div>
  )
}

export function HumanDMMessageBubble({
  message,
  isOwn,
  senderName,
  avatarUrl,
  showHeader,
  onEdit,
  onDelete,
}: HumanDMMessageBubbleProps) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const [busy, setBusy] = useState(false)
  const editRef = useRef<HTMLTextAreaElement>(null)
  const attachmentUrls = Array.isArray(message.metadata?.attachments)
    ? (message.metadata.attachments as unknown[]).filter(
        (url): url is string => typeof url === 'string' && url.trim().length > 0,
      )
    : []
  const attachmentDocuments = attachmentUrlsToDocuments(attachmentUrls)
  const hasAttachments = attachmentDocuments.length > 0
  const hasVisibleBody = (message.content?.trim().length ?? 0) > 0

  useEffect(() => {
    if (!editing) return
    const el = editRef.current
    if (!el) return
    el.focus()
    el.setSelectionRange(el.value.length, el.value.length)
  }, [editing])

  const startEdit = () => {
    setEditValue(message.content ?? '')
    setEditing(true)
  }
  const cancelEdit = () => {
    setEditing(false)
    setEditValue('')
  }
  const saveEdit = async () => {
    const next = editValue.trim()
    if (!next || next === message.content?.trim() || busy) {
      cancelEdit()
      return
    }
    setBusy(true)
    try {
      await onEdit(message.id, next)
      cancelEdit()
    } finally {
      setBusy(false)
    }
  }
  const handleDelete = async () => {
    if (busy) return
    setBusy(true)
    try {
      await onDelete(message.id)
    } finally {
      setBusy(false)
    }
  }
  const onEditKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void saveEdit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelEdit()
    }
  }

  return (
    <div
      className={`gap-spacing-3 group flex items-start ${
        showHeader ? 'pt-spacing-3' : 'pt-1'
      } pb-1`}
    >
      <div className="w-9 shrink-0">
        {showHeader ? <Avatar name={senderName} url={avatarUrl} /> : null}
      </div>
      <div className="min-w-0 flex-1">
        {showHeader && (
          <div className="gap-spacing-2 mb-0.5 flex items-baseline">
            <span className="body-2 text-foreground font-semibold">{senderName}</span>
            <span className="body-3 text-muted-foreground/70">
              {formatTime(message.created_at)}
            </span>
          </div>
        )}
        {editing ? (
          <div className="border-subtle bg-card gap-spacing-2 px-spacing-3 py-spacing-2 flex flex-col rounded-xl border">
            <textarea
              ref={editRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={onEditKeyDown}
              rows={1}
              className="body-2 text-foreground min-h-[36px] resize-none border-0 bg-transparent px-0 py-1 outline-none focus:ring-0"
            />
            <div className="gap-spacing-2 flex items-center justify-end">
              <button
                type="button"
                onClick={cancelEdit}
                disabled={busy}
                className="text-muted-foreground hover:text-foreground px-spacing-2 flex h-7 items-center gap-1 rounded-full text-xs transition-colors"
              >
                <X className="h-3.5 w-3.5" />
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void saveEdit()}
                disabled={busy || !editValue.trim()}
                className="bg-primary text-primary-foreground px-spacing-3 flex h-7 items-center gap-1 rounded-full text-xs disabled:opacity-40"
              >
                <Check className="h-3.5 w-3.5" />
                Save
              </button>
            </div>
          </div>
        ) : (
          <div className="gap-spacing-2 flex flex-col items-start">
            <div className="gap-spacing-2 flex w-full items-start">
              {hasVisibleBody ? (
                <div className="body-2 text-foreground whitespace-pre-wrap break-words">
                  {message.content ?? ''}
                  {message.edited_at && (
                    <span className="text-muted-foreground/60 ml-spacing-2 text-[11px]">
                      (edited)
                    </span>
                  )}
                </div>
              ) : null}
              {isOwn && (
                <div className="ml-auto flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={startEdit}
                    className="text-muted-foreground hover:bg-hover-subtle hover:text-foreground rounded p-1 transition-colors"
                    aria-label="Edit message"
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete()}
                    className="text-muted-foreground hover:bg-hover-subtle hover:text-foreground rounded p-1 transition-colors"
                    aria-label="Delete message"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
            {hasAttachments && <ChatAttachmentPreviews documents={attachmentDocuments} />}
          </div>
        )}
      </div>
    </div>
  )
}
