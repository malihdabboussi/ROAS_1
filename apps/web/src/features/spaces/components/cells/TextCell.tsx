'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FileText } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { htmlToPlainTextPreview } from '../space-item-values'
import type { BaseCellProps } from './cell-types'

function toText(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

/** Save shortcut label for notes dropdown footer (dropdown opens only on client). */
function modEnterSaveHint(): string {
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.userAgent)
  return isMac ? '⌘+Enter to save' : 'Ctrl+Enter to save'
}

/** One-line preview for list cells (notes may be HTML from the doc editor). */
function listPreviewText(fieldId: string, raw: string): string {
  if (!raw) return ''
  if (fieldId !== 'notes') return raw
  return htmlToPlainTextPreview(raw)
}

export function TextCell({
  field,
  value,
  onChange,
  readonly,
  nameAsListOpenTarget,
  nameListHoverGroup,
  listInlineEditActive,
  onListInlineTitleEditEnd,
  fieldRowVariant: _fieldRowVariant = 'default',
  openOnMount,
  bulkInlineEditor,
}: BaseCellProps & { fieldRowVariant?: 'default' | 'kanban' }) {
  const text = toText(value)
  const previewText = useMemo(() => listPreviewText(field.id, text), [field.id, text])
  const isInlineTextField =
    listInlineEditActive !== undefined ||
    nameAsListOpenTarget ||
    field.id === 'title' ||
    field.id === 'first_name' ||
    field.id === 'last_name'
  const useDropdown = !isInlineTextField

  const [editing, setEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const empty = !text.trim()
  const showInput = !empty || editing

  const [open, setOpen] = useState(() => Boolean(useDropdown && openOnMount && !bulkInlineEditor))
  const [draft, setDraft] = useState(text)
  /** Inline list/kanban title + direct text fields: local draft while editing; commit on blur. */
  const [inlineDraft, setInlineDraft] = useState(text)
  const listInlineWasActive = useRef(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const dropdownInputRef = useRef<HTMLTextAreaElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const draftRef = useRef(draft)
  const textRef = useRef(text)
  const inlineDraftRef = useRef(inlineDraft)
  draftRef.current = draft
  textRef.current = text
  inlineDraftRef.current = inlineDraft

  useEffect(() => {
    if (!editing && !listInlineEditActive) {
      setInlineDraft(text)
    }
  }, [text, editing, listInlineEditActive])

  useEffect(() => {
    setDraft(text)
  }, [text])

  function commitInlineDraft() {
    const current = inlineDraftRef.current
    if (current !== textRef.current) onChange(current)
  }

  function commit() {
    const trimmed = draftRef.current.trim()
    if (trimmed !== textRef.current) onChange(trimmed)
    setOpen(false)
  }

  useLayoutEffect(() => {
    const active = Boolean(listInlineEditActive)
    if (!active) {
      listInlineWasActive.current = false
      setEditing(false)
      return
    }
    setEditing(true)
    if (!listInlineWasActive.current) {
      listInlineWasActive.current = true
      setInlineDraft(toText(value))
    }
    const id = requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })
    return () => cancelAnimationFrame(id)
  }, [listInlineEditActive])

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const dropW = 260
    const maxLeft = window.innerWidth - dropW - 8
    setPos({ top: rect.bottom + 4, left: Math.max(8, Math.min(rect.left, maxLeft)) })
  }, [open])

  useEffect(() => {
    if (open) setTimeout(() => dropdownInputRef.current?.focus(), 50)
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleOutside = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (!dropdownRef.current?.contains(t) && !triggerRef.current?.contains(t)) commit()
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDraft(textRef.current)
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  if (readonly) {
    if (nameAsListOpenTarget) {
      const linkHover =
        (nameListHoverGroup ?? 'self') === 'row'
          ? 'group-hover/row:text-emerald-500'
          : 'group-hover:text-emerald-500'
      if (!text?.trim()) {
        return (
          <div
            className={cn(
              'flex min-h-7 w-full min-w-0 cursor-pointer items-center text-left text-xs text-[var(--color-muted-foreground)] transition-colors',
              linkHover,
            )}
          >
            -
          </div>
        )
      }
      return (
        <div className="flex min-h-7 w-full min-w-0 items-center">
          <span
            className={cn(
              'body-3 text-foreground min-w-0 flex-1 cursor-pointer truncate transition-colors',
              linkHover,
            )}
          >
            {text}
          </span>
        </div>
      )
    }
    return previewText ? (
      <span
        className={cn(
          'block min-w-0 truncate',
          field.id === 'title' ? 'body-3 text-foreground' : 'text-sm text-[var(--foreground)]',
        )}
        title={previewText || undefined}
      >
        {previewText}
      </span>
    ) : (
      <span className="text-xs text-[var(--color-muted-foreground)]">-</span>
    )
  }

  if (!readonly && useDropdown && bulkInlineEditor) {
    return (
      <div className="w-full p-1" onMouseDown={(e) => e.stopPropagation()}>
        <textarea
          ref={dropdownInputRef}
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              commit()
            }
          }}
          placeholder="Type a note…"
          rows={3}
          className="w-full min-w-0 resize-none bg-transparent text-xs leading-relaxed text-[var(--foreground)] outline-none placeholder:text-[var(--color-muted-foreground)]"
        />
        <div className="mt-1 flex justify-end">
          <button
            type="button"
            onClick={commit}
            className="rounded px-2 py-0.5 text-[11px] font-medium text-emerald-400 transition-colors hover:bg-emerald-500/10"
          >
            Save
          </button>
        </div>
      </div>
    )
  }

  if (useDropdown) {
    return (
      <>
        <button
          ref={triggerRef}
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            if (open) commit()
            else {
              setDraft(text)
              setOpen(true)
            }
          }}
          className="flex w-full min-w-0 max-w-full items-center gap-1.5 text-left"
          title={previewText || (field.id === 'notes' ? 'Add note' : undefined)}
        >
          <FileText
            className={`h-3.5 w-3.5 shrink-0 ${text ? 'text-[var(--foreground)]' : 'text-[var(--color-muted-foreground)]'}`}
          />
          {previewText ? (
            <span className="min-w-0 flex-1 truncate text-xs text-[var(--foreground)]">
              {previewText}
            </span>
          ) : null}
        </button>
        {open &&
          pos &&
          typeof document !== 'undefined' &&
          createPortal(
            <div
              ref={dropdownRef}
              className="dropdown-menu-solid fixed z-[99999] w-[280px] overflow-hidden rounded-xl"
              style={{ top: pos.top, left: pos.left }}
            >
              <div className="flex gap-1.5 p-2">
                <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
                <textarea
                  ref={dropdownInputRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault()
                      commit()
                    }
                    if (e.key === 'Escape') {
                      e.preventDefault()
                      setDraft(text)
                      setOpen(false)
                    }
                  }}
                  placeholder={field.id === 'notes' ? 'Type a note…' : 'Type…'}
                  rows={4}
                  className="min-w-0 flex-1 resize-none bg-transparent text-xs leading-relaxed text-[var(--foreground)] outline-none placeholder:text-[var(--color-muted-foreground)]"
                />
              </div>
              {field.id === 'notes' ? (
                <div className="border-t border-[var(--color-border)] px-2 py-1.5">
                  <span className="text-[10px] text-[var(--color-muted-foreground)]">
                    {modEnterSaveHint()}
                  </span>
                </div>
              ) : null}
            </div>,
            document.body,
          )}
      </>
    )
  }

  const isNameField = field.id === 'title'
  const inlineEditing = Boolean(listInlineEditActive || editing)
  const inlineInputValue = inlineEditing ? inlineDraft : text

  return showInput ? (
    <div
      className={cn(
        'flex min-h-7 w-full items-center',
        !listInlineEditActive && !isNameField && empty && 'gap-1.5',
      )}
    >
      {!listInlineEditActive && !isNameField && empty && (
        <FileText
          className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]"
          aria-hidden
        />
      )}
      <input
        ref={inputRef}
        type="text"
        value={inlineInputValue}
        onPointerDown={(e) => e.stopPropagation()}
        onChange={(e) => setInlineDraft(e.target.value)}
        onFocus={() => {
          setEditing(true)
          if (!listInlineEditActive) setInlineDraft(textRef.current)
        }}
        onBlur={(e) => {
          commitInlineDraft()
          if (listInlineEditActive) onListInlineTitleEditEnd?.()
          if (!e.currentTarget.value.trim()) setEditing(false)
        }}
        className={cn(
          'h-7 min-w-0 bg-transparent outline-none',
          isNameField ? 'body-3 text-foreground' : 'text-sm text-[var(--foreground)]',
          listInlineEditActive ? 'w-full' : 'flex-1',
        )}
        placeholder=""
      />
    </div>
  ) : (
    <button
      type="button"
      className="flex min-h-7 w-full cursor-text items-center gap-1.5 text-left"
      aria-label="Add text"
      onPointerDown={(e) => {
        e.stopPropagation()
        e.preventDefault()
        setInlineDraft('')
        setEditing(true)
      }}
    >
      {field.id === 'title' ? null : (
        <FileText
          className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]"
          aria-hidden
        />
      )}
    </button>
  )
}
