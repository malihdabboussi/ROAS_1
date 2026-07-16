'use client'

import { useMemo, useRef, useState } from 'react'
import { ArrowLeft, Check, Send } from 'lucide-react'
import { PresentationCommentsEmptyMockup } from '@/components/artifacts/PresentationCommentsEmptyMockup'
import type { FunnelComment } from '@/lib/artifacts/artifact-types'
import { cn } from '@/lib/utils/cn'
import { PresentationCommentComposer } from './PresentationCommentComposer'

interface FunnelCommentsChatViewProps {
  funnelName: string
  comments: FunnelComment[]
  onAddComment: (body: string) => void
  onResolveComment: (commentId: string, resolved: boolean) => void
  onSendCommentsToVibe: (comments: FunnelComment[]) => void
  onBack: () => void
}

export function FunnelCommentsChatView({
  funnelName,
  comments,
  onAddComment,
  onResolveComment,
  onSendCommentsToVibe,
  onBack,
}: FunnelCommentsChatViewProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const unresolved = comments.filter((comment) => !comment.resolved)
  const resolvedCount = comments.length - unresolved.length
  const selectedComments = useMemo(
    () => comments.filter((comment) => selectedIds.has(comment.id)),
    [comments, selectedIds],
  )

  const handleSend = (content: string) => {
    const value = content.trim()
    if (!value) return
    onAddComment(value)
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    })
  }

  return (
    <div className="surface-bg flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="border-border pt-spacing-2 pb-spacing-1 relative shrink-0 border-b px-3 md:px-4">
        <div className="gap-spacing-2 mx-auto flex w-full max-w-3xl items-center">
          <button
            type="button"
            onClick={onBack}
            className="text-muted-foreground hover:text-foreground h-spacing-8 w-spacing-8 rounded-spacing-2 hover:bg-hover-subtle flex shrink-0 items-center justify-center transition-colors"
            aria-label="Back to conversation"
            title="Back to conversation"
          >
            <ArrowLeft className="icon-sm" aria-hidden />
          </button>
          <div className="min-w-0 flex-1">
            <p className="body-2 text-foreground font-semibold">Comments</p>
            <p className="body-4 text-muted-foreground truncate">{funnelName}</p>
          </div>
          {selectedComments.length > 0 ? (
            <button
              type="button"
              onClick={() => onSendCommentsToVibe(selectedComments)}
              className="button-compact button-glass-primary gap-spacing-1 shrink-0"
            >
              <Send className="icon-xs" />
              Send to ROAS
            </button>
          ) : null}
        </div>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-3 md:px-4">
        <div
          className={cn(
            'gap-spacing-3 mx-auto flex w-full max-w-3xl flex-col',
            unresolved.length === 0 ? 'py-spacing-4 min-h-full justify-center' : 'py-spacing-4',
          )}
        >
          {unresolved.map((comment) => (
            <div
              key={comment.id}
              className="surface-card border-border rounded-spacing-3 p-spacing-3 border"
            >
              <div className="gap-spacing-2 flex items-start justify-between">
                <label className="gap-spacing-2 flex min-w-0 flex-1 items-start">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(comment.id)}
                    onChange={(event) => {
                      setSelectedIds((prev) => {
                        const next = new Set(prev)
                        if (event.target.checked) next.add(comment.id)
                        else next.delete(comment.id)
                        return next
                      })
                    }}
                    className="checkbox-glass-green mt-0.5 shrink-0"
                  />
                  <span className="min-w-0">
                    <span className="body-3 text-foreground block font-semibold">
                      {comment.author_name}
                    </span>
                    {comment.funnel_page_id ? (
                      <span className="body-4 text-muted-foreground mt-spacing-1 block">
                        Page {comment.funnel_page_id.slice(0, 8)}
                      </span>
                    ) : null}
                    <span className="body-3 text-foreground mt-spacing-1 block whitespace-pre-wrap">
                      {comment.body}
                    </span>
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => onResolveComment(comment.id, true)}
                  className="body-4 text-muted-foreground hover:text-foreground inline-flex shrink-0 items-center gap-1"
                >
                  <Check className="icon-xs" />
                  Resolve
                </button>
              </div>
            </div>
          ))}
          {unresolved.length === 0 ? (
            <div className="gap-spacing-6 flex flex-col items-center text-center">
              <PresentationCommentsEmptyMockup />
              <p className="body-3 text-muted-foreground max-w-xs">No open comments</p>
            </div>
          ) : null}
          {resolvedCount > 0 ? (
            <p className="body-3 text-muted-foreground text-center">
              {resolvedCount} resolved comment{resolvedCount === 1 ? '' : 's'} hidden
            </p>
          ) : null}
        </div>
      </div>

      <div className="relative flex flex-col items-center px-3 pb-3 pt-2 md:px-4">
        <div className="w-full max-w-3xl">
          <PresentationCommentComposer onSend={handleSend} placeholder="Add a comment..." />
        </div>
      </div>
    </div>
  )
}
