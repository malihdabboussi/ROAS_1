'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface TaskDescriptionProps {
  description: string | null
  onDescriptionChange: (description: string | null) => void
}

export function TaskDescription({ description, onDescriptionChange }: TaskDescriptionProps) {
  const [draft, setDraft] = useState(description ?? '')
  const [editing, setEditing] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [canCollapse, setCanCollapse] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const displayTextRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    setDraft(description ?? '')
    setExpanded(false)
  }, [description])

  useEffect(() => {
    if (editing && textareaRef.current) {
      const el = textareaRef.current
      el.style.height = 'auto'
      el.style.height = `${Math.max(el.scrollHeight, 5 * 20)}px`
    }
  }, [editing, draft])

  const displayText = description ?? ''

  useEffect(() => {
    if (!displayText || editing || expanded) return
    const el = displayTextRef.current
    if (!el) return
    const measure = () => setCanCollapse(el.scrollHeight > el.clientHeight + 1)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [displayText, editing, expanded])

  function handleBlur() {
    setEditing(false)
    const trimmed = draft.trim()
    const next = trimmed || null
    if (next !== description) {
      onDescriptionChange(next)
    }
  }

  if (!editing) {
    const showCollapsedOverlay = displayText && canCollapse && !expanded

    return (
      <div className="mt-spacing-2 group relative w-full">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={`body-2 flex w-full items-start rounded-lg px-3 py-2 text-left transition-colors hover:bg-[var(--color-hover-subtle)] ${displayText ? '' : 'min-h-[100px]'} ${showCollapsedOverlay ? 'pb-10' : ''}`}
        >
          {displayText ? (
            <span
              ref={displayTextRef}
              className={`whitespace-pre-wrap text-[var(--color-foreground)] ${expanded ? '' : 'line-clamp-4'}`}
            >
              {displayText}
            </span>
          ) : (
            <span className="text-[var(--color-muted-foreground)]">Add a description...</span>
          )}
        </button>

        {showCollapsedOverlay ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex h-16 items-end justify-center rounded-b-lg pb-2 opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100">
            <div
              className="absolute inset-0 rounded-b-lg"
              style={{
                background:
                  'linear-gradient(to bottom, transparent 0%, color-mix(in srgb, var(--color-card) 55%, transparent) 45%, var(--color-card) 100%)',
              }}
            />
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                setExpanded(true)
              }}
              className="body-3 border-border bg-card text-muted-foreground hover:text-foreground pointer-events-auto relative z-10 flex items-center gap-1 rounded-full border px-3 py-0.5 transition-colors"
            >
              <ChevronDown className="h-3 w-3" />
              See all
            </button>
          </div>
        ) : null}

        {displayText && canCollapse && expanded ? (
          <div className="flex justify-center pb-1 pt-1">
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="body-3 text-muted-foreground hover:text-foreground flex items-center gap-1 px-3 py-0.5 transition-colors"
            >
              <ChevronUp className="h-3 w-3" />
              Show less
            </button>
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <textarea
      ref={textareaRef}
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          setDraft(description ?? '')
          setEditing(false)
        }
      }}
      placeholder="Add a description..."
      className="input-glass body-2 mt-spacing-2 min-h-[100px] w-full resize-none rounded-lg px-3 py-2 text-[var(--color-foreground)] outline-none placeholder:text-[var(--color-muted-foreground)]"
      rows={5}
    />
  )
}
