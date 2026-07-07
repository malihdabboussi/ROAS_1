'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertCircle, ExternalLink, Globe } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'
import {
  SPACES_CELL_TOAST_ERRORS,
  SPACES_CELL_TOAST_SUCCESS,
} from '../../config/spaces-toast-errors.config'
import type { BaseCellProps } from './cell-types'

function toUrl(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function isValidUrl(str: string): boolean {
  try {
    const u = new URL(str.includes('://') ? str : `https://${str}`)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false
    return u.hostname.includes('.')
  } catch {
    return false
  }
}

export function UrlCell({
  field: _field,
  value,
  onChange,
  readonly,
  fieldRowVariant = 'default',
  openOnMount,
  bulkInlineEditor,
}: BaseCellProps & { fieldRowVariant?: 'default' | 'kanban' }) {
  const url = toUrl(value)
  const kanbanEmpty = fieldRowVariant === 'kanban' && !url
  const [open, setOpen] = useState(!!openOnMount && !bulkInlineEditor)
  const [draft, setDraft] = useState(url)
  const [error, setError] = useState('')
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  useEffect(() => {
    setDraft(url)
  }, [url])
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
      if (url) {
        onChange('')
        toast.success(SPACES_CELL_TOAST_SUCCESS.URL_CLEARED.userMessage)
      }
      setOpen(false)
      return
    }
    if (!isValidUrl(trimmed)) {
      setError('Enter a valid URL')
      toast.error(SPACES_CELL_TOAST_ERRORS.INVALID_URL.userMessage)
      return
    }
    const normalized = trimmed.includes('://') ? trimmed : `https://${trimmed}`
    setError('')
    if (normalized !== url) {
      onChange(normalized)
      toast.success(SPACES_CELL_TOAST_SUCCESS.URL_SAVED.userMessage)
    }
    setOpen(false)
  }

  if (!readonly && bulkInlineEditor) {
    return (
      <div className="w-full p-1" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex flex-col gap-1.5">
          <input
            ref={inputRef}
            type="url"
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
            placeholder="https://…"
            className={`w-full min-w-0 bg-transparent text-xs text-[var(--foreground)] outline-none placeholder:text-[var(--color-muted-foreground)] ${error ? 'text-red-400' : ''}`}
          />
          {error ? (
            <div className="flex items-center gap-1.5 text-[11px] text-red-400">
              <AlertCircle className="h-3 w-3 shrink-0" />
              {error}
            </div>
          ) : (
            <div className="flex justify-end">
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
      </div>
    )
  }

  if (readonly) {
    return url ? (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="block min-w-0 max-w-full truncate text-sm text-blue-400 transition-colors hover:text-blue-300"
        title={url}
      >
        {url.replace(/^https?:\/\//, '')}
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
        title={url || 'Add URL'}
      >
        {url ? (
          <span className="min-w-0 flex-1 truncate text-xs text-[var(--foreground)]">
            {url.replace(/^https?:\/\//, '')}
          </span>
        ) : (
          <Globe className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
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
              <Globe className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
              <input
                ref={inputRef}
                type="url"
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
                placeholder="https://…"
                className={`min-w-0 flex-1 bg-transparent text-xs text-[var(--foreground)] outline-none placeholder:text-[var(--color-muted-foreground)] ${error ? 'text-red-400' : ''}`}
              />
            </div>
            {error && (
              <div className="flex items-center gap-1.5 border-t border-[var(--color-border)] px-2 py-1.5 text-[11px] text-red-400">
                <AlertCircle className="h-3 w-3 shrink-0" />
                {error}
              </div>
            )}
            {!error && draft.trim() && isValidUrl(draft.trim()) && (
              <div className="border-t border-[var(--color-border)] px-2 py-1.5">
                <a
                  href={draft.trim().includes('://') ? draft.trim() : `https://${draft.trim()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-blue-400 transition-colors hover:text-blue-300"
                >
                  <ExternalLink className="h-3 w-3 shrink-0" />
                  Open link
                </a>
              </div>
            )}
          </div>,
          document.body,
        )}
    </>
  )
}
