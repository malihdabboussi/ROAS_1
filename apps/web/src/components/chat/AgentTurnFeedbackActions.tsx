'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Copy, Split, ThumbsDown, ThumbsUp, X } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import {
  agentTurnFeedbackChipsForThumb,
  filterAgentTurnFeedbackTagsForThumb,
  type AgentTurnFeedbackTag,
  type AgentTurnFeedbackTargetKind,
} from '@/lib/agent-feedback/types'
import { useAgentTurnFeedback } from '@/lib/agent-feedback/use-agent-turn-feedback'
import { positionFloatingMenuFromAnchorRect } from '@/lib/ui/floating-menu-anchor'
import { cn } from '@/lib/utils/cn'

interface AgentTurnFeedbackActionsProps {
  targetKind: AgentTurnFeedbackTargetKind
  targetId: string
  sourceSurface: string
  content?: string | null
  canFork?: boolean
  onFork?: () => void | Promise<void>
  forking?: boolean
  className?: string
}

const FEEDBACK_POPOVER_WIDTH = 288
const FEEDBACK_POPOVER_HEIGHT_ESTIMATE = 280
const VIEWPORT_MARGIN = 8
const POPOVER_GAP = 8

export function AgentTurnFeedbackActions({
  targetKind,
  targetId,
  sourceSurface,
  content,
  canFork = false,
  onFork,
  forking = false,
  className,
}: AgentTurnFeedbackActionsProps) {
  const { feedback, saving, canPersist, save } = useAgentTurnFeedback({
    targetKind,
    targetId,
    sourceSurface,
  })
  const [copied, setCopied] = useState(false)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 })
  const [draftThumb, setDraftThumb] = useState<boolean | null>(null)
  const [draftTags, setDraftTags] = useState<AgentTurnFeedbackTag[]>([])
  const [draftText, setDraftText] = useState('')
  const anchorRef = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const hasContent = Boolean(content?.trim())
  const selectedThumb = draftThumb ?? feedback?.thumbs_up ?? null

  useEffect(() => {
    if (popoverOpen) return
    const nextThumb = feedback?.thumbs_up ?? null
    const nextTags = feedback?.tags ?? []
    const nextText = feedback?.feedback_text ?? ''
    const tagsMatch =
      draftTags.length === nextTags.length &&
      draftTags.every((tag, index) => tag === nextTags[index])

    if (draftThumb !== nextThumb) setDraftThumb(nextThumb)
    if (!tagsMatch) setDraftTags(nextTags)
    if (draftText !== nextText) setDraftText(nextText)
  }, [
    draftTags,
    draftText,
    draftThumb,
    feedback?.feedback_text,
    feedback?.tags,
    feedback?.thumbs_up,
    popoverOpen,
  ])

  const updatePopoverPosition = useCallback(() => {
    if (!anchorRef.current) return
    const anchorRect = anchorRef.current.getBoundingClientRect()
    const measuredHeight = popoverRef.current?.offsetHeight
    const menuHeight = Math.min(
      measuredHeight && measuredHeight > 0 ? measuredHeight : FEEDBACK_POPOVER_HEIGHT_ESTIMATE,
      window.innerHeight - VIEWPORT_MARGIN * 2,
    )
    const nextPosition = positionFloatingMenuFromAnchorRect(anchorRect, {
      menuWidth: FEEDBACK_POPOVER_WIDTH,
      menuHeight,
      gap: POPOVER_GAP,
      viewportMargin: VIEWPORT_MARGIN,
      horizontalAlign: 'end',
    })
    setPopoverPos((prev) =>
      prev.top === nextPosition.top && prev.left === nextPosition.left ? prev : nextPosition,
    )
  }, [])

  useLayoutEffect(() => {
    if (!popoverOpen) return
    updatePopoverPosition()
  }, [popoverOpen, draftTags, draftText, selectedThumb, updatePopoverPosition])

  useEffect(() => {
    if (!popoverOpen) return
    const handleReposition = () => updatePopoverPosition()
    window.addEventListener('scroll', handleReposition, true)
    window.addEventListener('resize', handleReposition)
    return () => {
      window.removeEventListener('scroll', handleReposition, true)
      window.removeEventListener('resize', handleReposition)
    }
  }, [popoverOpen, updatePopoverPosition])

  useEffect(() => {
    if (!popoverOpen) return
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (popoverRef.current?.contains(target)) return
      if (anchorRef.current?.contains(target)) return
      setPopoverOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [popoverOpen])

  const handleCopy = useCallback(() => {
    if (!hasContent) return
    void navigator.clipboard.writeText(content ?? '')
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [content, hasContent])

  const handleThumb = useCallback(
    (thumbsUp: boolean) => {
      if (!canPersist) return
      const nextTags = filterAgentTurnFeedbackTagsForThumb(draftTags, thumbsUp)
      setDraftTags(nextTags)
      setDraftThumb(thumbsUp)
      setPopoverOpen(true)
      void save({
        thumbs_up: thumbsUp,
        tags: nextTags,
        feedback_text: draftText.trim() || null,
      }).catch(() => undefined)
    },
    [canPersist, draftTags, draftText, save],
  )

  const toggleTag = useCallback((tag: AgentTurnFeedbackTag) => {
    setDraftTags((current) =>
      current.includes(tag) ? current.filter((value) => value !== tag) : [...current, tag],
    )
  }, [])

  const saveDetails = useCallback(() => {
    if (selectedThumb == null) return
    const tags = filterAgentTurnFeedbackTagsForThumb(draftTags, selectedThumb)
    void save({
      thumbs_up: selectedThumb,
      tags,
      feedback_text: draftText.trim() || null,
    }).catch(() => undefined)
  }, [draftTags, draftText, save, selectedThumb])

  const visibleChips = useMemo(() => {
    if (selectedThumb == null) return []
    return agentTurnFeedbackChipsForThumb(selectedThumb)
  }, [selectedThumb])

  const actionButtonClass = useMemo(
    () =>
      'rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50',
    [],
  )

  const popoverMaxHeight =
    typeof window === 'undefined'
      ? FEEDBACK_POPOVER_HEIGHT_ESTIMATE
      : Math.max(160, window.innerHeight - popoverPos.top - VIEWPORT_MARGIN)

  const popover =
    popoverOpen && canPersist ? (
      <div
        ref={popoverRef}
        role="dialog"
        aria-label="Turn feedback details"
        style={{
          top: popoverPos.top,
          left: popoverPos.left,
          width: FEEDBACK_POPOVER_WIDTH,
          maxHeight: popoverMaxHeight,
        }}
        className="surface-card z-dropdown p-spacing-3 border-border fixed overflow-y-auto rounded-lg border shadow-lg"
      >
        <div className="mb-spacing-2 flex items-center justify-between">
          <span className="body-4 text-foreground font-medium">Feedback details</span>
          <button
            type="button"
            aria-label="Close feedback"
            onClick={() => setPopoverOpen(false)}
            className="btn-icon-bare text-muted-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="gap-spacing-1 mb-spacing-2 flex flex-wrap">
          {visibleChips.map((chip) => (
            <button
              key={chip.value}
              type="button"
              onClick={() => toggleTag(chip.value)}
              className={cn(
                'body-4 rounded-full px-2 py-1',
                draftTags.includes(chip.value) ? 'chip-glass-blue' : 'chip-glass-neutral',
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>
        <textarea
          value={draftText}
          onChange={(event) => setDraftText(event.target.value.slice(0, 2000))}
          placeholder="Optional note"
          className="input-glass body-4 min-h-20 w-full resize-none rounded-lg"
        />
        <div className="mt-spacing-2 flex justify-end">
          <button
            type="button"
            onClick={saveDetails}
            aria-busy={saving}
            disabled={selectedThumb == null}
            className="button-compact button-glass-neutral disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    ) : null

  return (
    <div className={cn('py-spacing-4', className)}>
      <div ref={anchorRef} className="gap-spacing-1 flex shrink-0 items-center">
        <Tooltip label="Copy message" side="top" delayMs={150}>
          <button
            type="button"
            aria-label="Copy message"
            onClick={handleCopy}
            disabled={!hasContent}
            className={actionButtonClass}
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </Tooltip>
        {onFork && canFork ? (
          <Tooltip label="Fork chat" side="top" delayMs={150}>
            <button
              type="button"
              aria-label="Fork chat"
              onClick={() => void onFork()}
              disabled={forking}
              className={actionButtonClass}
            >
              <Split className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
        ) : null}
        {canPersist ? (
          <>
            <Tooltip label="Thumbs up" side="top" delayMs={150}>
              <button
                type="button"
                aria-label="Thumbs up"
                aria-pressed={selectedThumb === true}
                onClick={() => handleThumb(true)}
                className={cn(actionButtonClass, selectedThumb === true && 'text-primary')}
              >
                <ThumbsUp className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
            <Tooltip label="Thumbs down" side="top" delayMs={150}>
              <button
                type="button"
                aria-label="Thumbs down"
                aria-pressed={selectedThumb === false}
                onClick={() => handleThumb(false)}
                className={cn(actionButtonClass, selectedThumb === false && 'text-destructive')}
              >
                <ThumbsDown className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
          </>
        ) : null}
      </div>

      {typeof document !== 'undefined' && popover ? createPortal(popover, document.body) : null}
    </div>
  )
}
