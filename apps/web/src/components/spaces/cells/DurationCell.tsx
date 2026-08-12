'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertCircle, Timer } from 'lucide-react'
import { toast } from 'sonner'
import {
  SPACES_CELL_TOAST_ERRORS,
  SPACES_CELL_TOAST_SUCCESS,
} from '@/lib/config/spaces-toast-errors.config'
import type { BaseCellProps } from './cell-types'

function toMinutes(value: unknown): number | null {
  if (typeof value === 'number' && value >= 0) return Math.round(value)
  if (typeof value === 'string') {
    const n = parseFloat(value)
    if (!Number.isNaN(n) && n >= 0) return Math.round(n)
  }
  return null
}

function formatDuration(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export function DurationCell({
  value,
  onChange,
  readonly,
  fieldRowVariant = 'default',
}: BaseCellProps & { fieldRowVariant?: 'default' | 'kanban' }) {
  const totalMin = toMinutes(value)
  const isKanban = fieldRowVariant === 'kanban'
  const [open, setOpen] = useState(false)
  const [hoursStr, setHoursStr] = useState('')
  const [minsStr, setMinsStr] = useState('')
  const [error, setError] = useState('')
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const hoursRef = useRef<HTMLInputElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  useEffect(() => {
    if (totalMin != null) {
      setHoursStr(String(Math.floor(totalMin / 60)))
      setMinsStr(String(totalMin % 60))
    } else {
      setHoursStr('')
      setMinsStr('')
    }
  }, [totalMin])

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
    if (open) setTimeout(() => hoursRef.current?.focus(), 50)
  }, [open])

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
    const h = hoursStr.trim()
    const m = minsStr.trim()
    if (!h && !m) {
      if (totalMin != null) {
        onChange(null)
        toast.success(SPACES_CELL_TOAST_SUCCESS.DURATION_CLEARED.userMessage)
      }
      setOpen(false)
      return
    }
    const hours = h ? parseInt(h, 10) : 0
    const mins = m ? parseInt(m, 10) : 0
    if (Number.isNaN(hours) || Number.isNaN(mins) || hours < 0 || mins < 0 || mins > 59) {
      setError('Enter valid hours (≥0) and minutes (0–59)')
      toast.error(SPACES_CELL_TOAST_ERRORS.INVALID_DURATION.userMessage)
      return
    }
    const total = hours * 60 + mins
    setError('')
    if (total !== totalMin) {
      onChange(total)
      toast.success(SPACES_CELL_TOAST_SUCCESS.DURATION_SAVED.userMessage)
    }
    setOpen(false)
  }

  if (readonly) {
    if (totalMin == null)
      return <span className="text-xs text-[var(--color-muted-foreground)]">-</span>
    return (
      <span className="flex items-center gap-1 text-sm text-[var(--foreground)]">
        <Timer className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
        <span className="text-xs">{formatDuration(totalMin)}</span>
      </span>
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
        className="flex items-center gap-1.5 text-left"
        title={totalMin != null ? formatDuration(totalMin) : 'Set duration'}
      >
        <Timer
          className={`h-3.5 w-3.5 shrink-0 ${totalMin != null ? 'text-[var(--foreground)]' : 'text-[var(--color-muted-foreground)]'}`}
        />
        {totalMin != null && !isKanban && (
          <span className="text-xs text-[var(--foreground)]">{formatDuration(totalMin)}</span>
        )}
        {totalMin != null && isKanban && (
          <span className="text-xs text-[var(--foreground)]">{formatDuration(totalMin)}</span>
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
            <div className="flex items-center gap-1 p-2">
              <Timer className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
              <input
                ref={hoursRef}
                type="text"
                inputMode="numeric"
                value={hoursStr}
                onChange={(e) => {
                  setHoursStr(e.target.value)
                  setError('')
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    commit()
                  }
                }}
                placeholder="0"
                className={`w-10 bg-transparent text-center text-xs text-[var(--foreground)] outline-none placeholder:text-[var(--color-muted-foreground)] ${error ? 'text-red-400' : ''}`}
              />
              <span className="text-xs text-[var(--color-muted-foreground)]">h</span>
              <input
                type="text"
                inputMode="numeric"
                value={minsStr}
                onChange={(e) => {
                  setMinsStr(e.target.value)
                  setError('')
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    commit()
                  }
                }}
                placeholder="0"
                className={`w-10 bg-transparent text-center text-xs text-[var(--foreground)] outline-none placeholder:text-[var(--color-muted-foreground)] ${error ? 'text-red-400' : ''}`}
              />
              <span className="text-xs text-[var(--color-muted-foreground)]">m</span>
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
