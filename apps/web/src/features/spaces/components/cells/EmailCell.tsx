'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertCircle, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'
import {
  SPACES_CELL_TOAST_ERRORS,
  SPACES_CELL_TOAST_SUCCESS,
} from '../../config/spaces-toast-errors.config'
import type { BaseCellProps } from './cell-types'

function toEmail(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function EmailCell({
  field: _field,
  value,
  onChange,
  readonly,
  fieldRowVariant = 'default',
  openOnMount,
  bulkInlineEditor,
}: BaseCellProps & { fieldRowVariant?: 'default' | 'kanban' }) {
  const email = toEmail(value)
  const kanbanEmpty = fieldRowVariant === 'kanban' && !email
  const [open, setOpen] = useState(!!openOnMount && !bulkInlineEditor)
  const [draft, setDraft] = useState(email)
  const [error, setError] = useState('')
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  useEffect(() => {
    setDraft(email)
  }, [email])
  useEffect(() => {
    if (!open) setError('')
  }, [open])

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const dropW = 260
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
      if (email) {
        onChange('')
        toast.success(SPACES_CELL_TOAST_SUCCESS.EMAIL_CLEARED.userMessage)
      }
      setOpen(false)
      return
    }
    if (!EMAIL_RE.test(trimmed)) {
      setError('Enter a valid email address')
      toast.error(SPACES_CELL_TOAST_ERRORS.INVALID_EMAIL.userMessage)
      return
    }
    setError('')
    if (trimmed !== email) {
      onChange(trimmed)
      toast.success(SPACES_CELL_TOAST_SUCCESS.EMAIL_SAVED.userMessage)
    }
    setOpen(false)
  }

  if (!readonly && bulkInlineEditor) {
    return (
      <div className="w-full p-1" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1.5">
          <input
            ref={inputRef}
            type="email"
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
            placeholder="email@example.com"
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
    return email ? (
      <a
        href={`mailto:${email}`}
        className="block min-w-0 max-w-full truncate text-sm text-blue-400 transition-colors hover:text-blue-300"
        title={email}
      >
        {email}
      </a>
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
        className={cn(
          'flex min-w-0 max-w-full items-center gap-1.5 text-left',
          kanbanEmpty ? 'h-full w-full justify-center' : 'w-full',
        )}
        title={email || 'Add email'}
      >
        {email ? (
          <span className="min-w-0 flex-1 truncate text-xs text-[var(--foreground)]">{email}</span>
        ) : (
          <Mail className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
        )}
      </button>
      {open &&
        pos &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={dropdownRef}
            className="dropdown-menu-solid fixed z-[99999] w-[260px] overflow-hidden rounded-xl"
            style={{ top: pos.top, left: pos.left }}
          >
            <div className="flex items-center gap-1.5 p-2">
              <Mail className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
              <input
                ref={inputRef}
                type="email"
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
                placeholder="email@example.com"
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
