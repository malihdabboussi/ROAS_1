'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FLOWS_UI } from '@/lib/flows/flows-ui-labels'
import { VIBEY_SPACE_FLOATING_CONTROL } from '@/lib/ui/floating-control-attrs'
import { cn } from '@/lib/utils/cn'

function modEnterSaveHint(): string {
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.userAgent)
  return isMac ? '⌘+Enter to save' : 'Ctrl+Enter to save'
}

export function FlowsInlineDescriptionField({
  value,
  onCommit,
  disabled,
  maxWidthClass = 'max-w-spacing-72',
}: {
  value?: string | null
  onCommit: (description: string | null) => void | Promise<void>
  disabled?: boolean
  maxWidthClass?: string
}) {
  const text = value?.trim() ?? ''
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(text)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const draftRef = useRef(draft)
  const textRef = useRef(text)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  draftRef.current = draft
  textRef.current = text

  useEffect(() => {
    if (!open) setDraft(text)
  }, [open, text])

  const reposition = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const panelWidth = 280
    const gap = 6
    const padding = 8
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : panelWidth
    let left = rect.left
    if (left + panelWidth > viewportWidth - padding) {
      left = Math.max(padding, viewportWidth - panelWidth - padding)
    }
    setPos({ top: rect.bottom + gap, left })
  }, [])

  const commit = useCallback(async () => {
    const trimmed = draftRef.current.trim()
    const next = trimmed || null
    const current = textRef.current || null
    if (next !== current) {
      await onCommit(next)
    }
    setOpen(false)
  }, [onCommit])

  useLayoutEffect(() => {
    if (!open) return
    reposition()
  }, [open, reposition])

  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()
    window.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)
    return () => {
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
    }
  }, [open, reposition])

  useEffect(() => {
    if (!open) return
    const handleOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return
      void commit()
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDraft(textRef.current)
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside, true)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleOutside, true)
      document.removeEventListener('keydown', handleKey)
    }
  }, [commit, open])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) setOpen(true)
        }}
        className={cn(
          'min-w-0 truncate text-left transition-colors hover:text-foreground',
          maxWidthClass,
          text ? 'body-4 text-muted-foreground' : 'typo-caption text-muted-foreground',
        )}
      >
        {text || FLOWS_UI.addDescription}
      </button>
      {open && pos && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={panelRef}
              {...{ [VIBEY_SPACE_FLOATING_CONTROL]: '' }}
              className="dropdown-menu-solid fixed z-[99999] w-[280px] overflow-hidden rounded-xl"
              style={{ top: pos.top, left: pos.left }}
            >
              <div className="p-2">
                <textarea
                  ref={inputRef}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                      event.preventDefault()
                      void commit()
                    }
                    if (event.key === 'Escape') {
                      event.preventDefault()
                      setDraft(textRef.current)
                      setOpen(false)
                    }
                  }}
                  placeholder={FLOWS_UI.descriptionPlaceholder}
                  rows={4}
                  className="min-w-0 w-full resize-none bg-transparent text-xs leading-relaxed text-foreground outline-none placeholder:text-muted-foreground"
                />
              </div>
              <div className="border-border border-t px-2 py-1.5">
                <span className="typo-caption text-muted-foreground">{modEnterSaveHint()}</span>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
