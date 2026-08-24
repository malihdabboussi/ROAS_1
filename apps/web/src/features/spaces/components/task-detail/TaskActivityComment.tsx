'use client'

import { useCallback, useState } from 'react'
import { Bot, Copy, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Tooltip } from '@/components/ui/tooltip'
import type { MissionDeliverable } from '@/lib/missions'
import { cn } from '@/lib/utils/cn'
import { linkPreviewToDeliverable } from '../../lib/collect-task-deliverables'
import { mergeCommentLinkPreviews } from '../../lib/doc-mention-link-previews'
import {
  deleteItemComment,
  updateItemComment,
  type LinkPreview,
  type SpaceItemActivity,
} from '../../services/spaces.service'
import { LinkPreviewCard } from './LinkPreviewCard'
import type { SendToAgentInstructionsSeed } from './SendTaskToAgentModal'
import {
  TaskActivityCommentAttachments,
  type TaskActivityCommentAttachment,
} from './TaskActivityCommentAttachments'

interface TaskActivityCommentProps {
  spaceId: string
  itemId: string
  entry: {
    id: string
    user_id: string | null
    event_type: string
    payload: Record<string, unknown>
    created_at: string
  }
  metaLabel: string
  currentUserId: string | null
  canEdit: boolean
  formatRelativeTime: (dateStr: string) => string
  onOpenDeliverablePreview?: (deliverable: MissionDeliverable) => void
  onOpenTaskById?: (taskId: string) => void
  onOpenConversationById?: (conversationId: string) => void
  onSendToAgent?: (seed: SendToAgentInstructionsSeed) => void
  onUpdated: (updated: SpaceItemActivity) => void
  onDeleted: (activityId: string) => void
}

function isHtml(text: string): boolean {
  return /<[a-z][\s\S]*>/i.test(text)
}

function stripHtml(html: string): string {
  if (typeof window === 'undefined') return html
  const el = document.createElement('div')
  el.innerHTML = html
  return el.textContent ?? ''
}

function stripPreviewedUrls(html: string, previewUrls: Set<string>): string {
  if (!html || previewUrls.size === 0) return html
  if (typeof window === 'undefined') return html
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html')
  const wrapper = doc.body.firstElementChild
  if (!wrapper) return html
  for (const p of Array.from(wrapper.querySelectorAll('p'))) {
    const text = (p.textContent ?? '').trim()
    const hrefs = Array.from(p.querySelectorAll('a')).map((a) => a.getAttribute('href') ?? '')
    const isOnlyOurUrl =
      (hrefs.length > 0 && hrefs.every((h) => previewUrls.has(h))) ||
      (text.length > 0 && previewUrls.has(text))
    if (isOnlyOurUrl) p.remove()
  }
  return wrapper.innerHTML
}

function isEditableComment(eventType: string, userId: string | null, currentUserId: string | null) {
  if (!currentUserId || userId !== currentUserId) return false
  return eventType === 'comment' || eventType === 'user.comment'
}

export function TaskActivityComment({
  spaceId,
  itemId,
  entry,
  metaLabel,
  currentUserId,
  canEdit,
  formatRelativeTime,
  onOpenDeliverablePreview,
  onOpenTaskById,
  onOpenConversationById,
  onSendToAgent,
  onUpdated,
  onDeleted,
}: TaskActivityCommentProps) {
  const messageHtml = (entry.payload.message as string) ?? ''
  const commentPreviews = mergeCommentLinkPreviews(
    Array.isArray(entry.payload.previews) ? (entry.payload.previews as LinkPreview[]) : undefined,
    messageHtml,
    spaceId,
  )
  const previewUrls = new Set(commentPreviews.map((p) => p.url))
  const displayHtml = stripPreviewedUrls(messageHtml, previewUrls)
  const editable =
    entry.payload.external_read_only !== true &&
    canEdit &&
    isEditableComment(entry.event_type, entry.user_id, currentUserId)
  const attachments = Array.isArray(entry.payload.attachments)
    ? (entry.payload.attachments as TaskActivityCommentAttachment[])
    : []

  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const startEdit = useCallback(() => {
    setEditValue(isHtml(messageHtml) ? stripHtml(messageHtml) : messageHtml)
    setEditing(true)
  }, [messageHtml])

  const cancelEdit = useCallback(() => {
    setEditing(false)
    setEditValue('')
  }, [])

  const saveEdit = useCallback(async () => {
    const trimmed = editValue.trim()
    if (!trimmed) return
    setSaving(true)
    try {
      const updated = await updateItemComment(spaceId, itemId, entry.id, trimmed)
      onUpdated(updated)
      setEditing(false)
      setEditValue('')
    } catch {
      toast.error('Could not save edit.')
    } finally {
      setSaving(false)
    }
  }, [editValue, spaceId, itemId, entry.id, onUpdated])

  const handleDelete = useCallback(async () => {
    setDeleting(true)
    try {
      await deleteItemComment(spaceId, itemId, entry.id)
      onDeleted(entry.id)
    } catch {
      toast.error('Could not delete comment.')
    } finally {
      setDeleting(false)
    }
  }, [spaceId, itemId, entry.id, onDeleted])

  const handleCopy = useCallback(() => {
    const text = isHtml(messageHtml) ? stripHtml(messageHtml) : messageHtml
    void navigator.clipboard.writeText(text.trim())
    toast.success('Copied')
  }, [messageHtml])

  const handleSendToAgent = useCallback(() => {
    if (!messageHtml.trim()) return
    onSendToAgent?.({ html: messageHtml })
  }, [messageHtml, onSendToAgent])

  const showHoverActions = editable && !editing

  return (
    <div
      className={`group/comment relative ${editing ? '' : 'hover:bg-[var(--color-hover-subtle)]/40 -mx-1 rounded-lg px-1'}`}
    >
      <div className="flex min-w-0 items-start justify-between gap-2">
        <span className="body-3 min-w-0 break-words font-medium text-[var(--color-foreground)]">
          {metaLabel}
        </span>
        <div className="relative flex h-5 shrink-0 items-center">
          <span
            className={cn(
              'body-3 text-[var(--color-muted-foreground)]/50 shrink-0 transition-all duration-200 ease-out',
              showHoverActions &&
                'group-hover/comment:pointer-events-none group-hover/comment:translate-x-1 group-hover/comment:opacity-0',
            )}
          >
            {formatRelativeTime(entry.created_at)}
          </span>
          {showHoverActions && (
            <div className="absolute right-0 flex translate-x-2 items-center gap-0.5 opacity-0 transition-all duration-200 ease-out group-hover/comment:translate-x-0 group-hover/comment:opacity-100">
              <Tooltip label="Edit">
                <button
                  type="button"
                  onClick={startEdit}
                  className="flex h-5 w-5 items-center justify-center rounded text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-foreground)]"
                  aria-label="Edit comment"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              </Tooltip>
              <Tooltip label="Copy">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex h-5 w-5 items-center justify-center rounded text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-foreground)]"
                  aria-label="Copy comment"
                >
                  <Copy className="h-3 w-3" />
                </button>
              </Tooltip>
              {onSendToAgent ? (
                <Tooltip label="Send to agent">
                  <button
                    type="button"
                    onClick={handleSendToAgent}
                    className="hover:text-primary flex h-5 w-5 items-center justify-center rounded text-[var(--color-muted-foreground)] transition-colors"
                    aria-label="Send to agent"
                  >
                    <Bot className="h-3 w-3" />
                  </button>
                </Tooltip>
              ) : null}
              <Tooltip label="Delete">
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  disabled={deleting}
                  className="hover:text-destructive flex h-5 w-5 items-center justify-center rounded text-[var(--color-muted-foreground)] transition-colors disabled:opacity-50"
                  aria-label="Delete comment"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </Tooltip>
            </div>
          )}
        </div>
      </div>

      {editing ? (
        <div className="mt-0.5">
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void saveEdit()
              }
              if (e.key === 'Escape') cancelEdit()
            }}
            rows={3}
            autoFocus
            className="body-3 w-full resize-none rounded-lg border border-emerald-500/30 bg-[var(--color-background)] px-3 py-2 text-[var(--color-foreground)] outline-none focus-visible:border-emerald-500/45"
          />
          <div className="mt-1 flex justify-end gap-2">
            <button
              type="button"
              onClick={cancelEdit}
              className="button-glass-neutral rounded px-3 py-1 text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void saveEdit()}
              disabled={saving || !editValue.trim()}
              className="button-glass-accent rounded px-3 py-1 text-xs font-medium disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      ) : (
        <div
          className="body-3 mt-0.5 min-w-0 whitespace-pre-wrap break-all text-[var(--color-foreground)] [&_.channel-mention]:font-semibold [&_.channel-mention]:text-[var(--color-primary)]"
          onClick={(e) => {
            const target = e.target as HTMLElement
            const taskChip = target.closest(
              '.entity-chip[data-entity-kind="task"]',
            ) as HTMLElement | null
            if (taskChip && onOpenTaskById) {
              const taskId = taskChip.getAttribute('data-entity-id')
              if (!taskId) return
              e.preventDefault()
              e.stopPropagation()
              onOpenTaskById(taskId)
              return
            }
            const conversationChip = target.closest(
              '.entity-chip[data-entity-kind="conversation"]',
            ) as HTMLElement | null
            if (conversationChip && onOpenConversationById) {
              const conversationId = conversationChip.getAttribute('data-entity-id')
              if (!conversationId) return
              e.preventDefault()
              e.stopPropagation()
              onOpenConversationById(conversationId)
            }
          }}
          dangerouslySetInnerHTML={{ __html: displayHtml }}
        />
      )}

      {!editing &&
        commentPreviews.map((preview, pidx) => {
          const handleOpen = onOpenDeliverablePreview
            ? () => {
                const d = linkPreviewToDeliverable(preview, {
                  rowId: entry.id,
                  userId: entry.user_id,
                  createdAt: entry.created_at,
                })
                if (d) onOpenDeliverablePreview(d)
              }
            : undefined
          return (
            <LinkPreviewCard
              key={`${preview.url}-${pidx}`}
              preview={preview}
              onPreview={handleOpen}
            />
          )
        })}

      {!editing && <TaskActivityCommentAttachments attachments={attachments} />}
    </div>
  )
}
