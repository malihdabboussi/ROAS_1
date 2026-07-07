'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertCircle, Hash } from 'lucide-react'
import { toast } from 'sonner'
import {
  SPACES_CELL_TOAST_ERRORS,
  SPACES_CELL_TOAST_SUCCESS,
} from '../../config/spaces-toast-errors.config'
import type { BaseCellProps } from './cell-types'

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const n = parseFloat(value)
    return Number.isNaN(n) ? null : n
  }
  return null
}

export function NumberCell({
  value,
  onChange,
  readonly,
  openOnMount,
  bulkInlineEditor,
}: BaseCellProps & { fieldRowVariant?: 'default' | 'kanban' }) {
  const num = toNumber(value)
  const [open, setOpen] = useState(!!openOnMount && !bulkInlineEditor)
  const [draft, setDraft] = useState(num != null ? String(num) : '')
  const [error, setError] = useState('')
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  useEffect(() => {
    setDraft(num != null ? String(num) : '')
  }, [num])
  useEffect(() => {
    if (!open) setError('')
  }, [open])

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const dropW = 200
    const maxLeft = window.innerWidth - dropW - 8
    setPos({ top: rect.bottom + 4, left: Math.max(8, Math.min(rect.left, maxLeft)) })
  }, [open])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  useEffect(() => {
    if (bulkInlineEditor) setTimeout(() => inputRef.current?.focus(), 50)
  }, [bulkInlineEditor])

  useEffect(() => {
    if (!open) return
    const handleOutside = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (!dropdownRef.current?.contains(t) && !triggerRef.current?.contains(t)) setOpen(false)
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  function commit() {
    const trimmed = draft.trim()
    if (!trimmed) {
      if (num != null) {
        onChange(null)
        toast.success(SPACES_CELL_TOAST_SUCCESS.NUMBER_CLEARED.userMessage)
      }
      setOpen(false)
      return
    }
    const parsed = Number(trimmed)
    if (Number.isNaN(parsed)) {
      setError('Enter a valid number')
      toast.error(SPACES_CELL_TOAST_ERRORS.INVALID_GENERIC_NUMBER.userMessage)
      return
    }
    setError('')
    if (parsed !== num) {
      onChange(parsed)
      toast.success(SPACES_CELL_TOAST_SUCCESS.NUMBER_SAVED.userMessage)
    }
    setOpen(false)
  }

  if (!readonly && bulkInlineEditor) {
    return (
      <div className="w-full p-1" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1.5">
          <input
            ref={inputRef}
            type="text"
            inputMode="decimal"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value)
              setError('')
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                commit()
              }
            }}
            placeholder="0"
            className={`min-w-0 flex-1 bg-transparent text-xs text-[var(--foreground)] outline-none placeholder:text-[var(--color-muted-foreground)] ${error ? 'text-red-400' : ''}`}
          />
        </div>
        {error ? (
          <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-red-400">
            <AlertCircle className="h-3 w-3 shrink-0" />
            {error}
          </div>
        ) : (
          <div className="mt-1 flex justify-end">
            <button
              type="button"
              onClick={commit}
              className="rounded px-2 py-0.5 text-[11px] font-medium text-emerald-400 transition-colors hover:bg-emerald-500/10"
            >
              Save
            </button>
          </div>
        )}
      </div>
    )
  }

  if (readonly) {
    return num != null ? (
      <span className="text-sm text-[var(--foreground)]">{num.toLocaleString()}</span>
    ) : (
      <span className="text-xs text-[var(--color-muted-foreground)]">-</span>
    )
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((o) => !o)
        }}
        className="flex w-full min-w-0 items-center gap-1.5 text-left"
        title={num != null ? String(num) : 'Add number'}
      >
        {num != null ? (
          <span className="min-w-0 flex-1 truncate text-xs text-[var(--foreground)]">
            {num.toLocaleString()}
          </span>
        ) : (
          <Hash className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
        )}
      </button>
      {open &&
        pos &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={dropdownRef}
            className="dropdown-menu-solid fixed z-[99999] w-[200px] overflow-hidden rounded-xl"
            style={{ top: pos.top, left: pos.left }}
          >
            <div className="flex items-center gap-1.5 p-2">
              <Hash className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
              <input
                ref={inputRef}
                type="text"
                inputMode="decimal"
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value)
                  setError('')
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    commit()
                  }
                }}
                placeholder="0"
                className={`min-w-0 flex-1 bg-transparent text-xs text-[var(--foreground)] outline-none placeholder:text-[var(--color-muted-foreground)] ${error ? 'text-red-400' : ''}`}
              />
            </div>
            {error && (
              <div className="flex items-center gap-1.5 border-t border-[var(--color-border)] px-2 py-1.5 text-[11px] text-red-400">
                <AlertCircle className="h-3 w-3 shrink-0" />
                {error}
              </div>
            )}
          </div>,
          document.body,
        )}
    </>
  )
}
