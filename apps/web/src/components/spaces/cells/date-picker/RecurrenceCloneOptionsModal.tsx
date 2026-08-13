'use client'

import type { RefObject } from 'react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import type { RecurrenceCloneInclude } from '@/lib/spaces'
import { DEFAULT_CLONE_INCLUDE, withCloneIncludeEverything } from '@/lib/spaces/recurrence-flags'
import { cn } from '@/lib/utils/cn'

type RowKey = Exclude<keyof RecurrenceCloneInclude, 'include_everything'>

const ROWS: { key: RowKey; label: string }[] = [
  { key: 'description', label: 'Description' },
  { key: 'assignee', label: 'Assignee' },
  { key: 'priority', label: 'Priority' },
  { key: 'tags', label: 'Tags' },
  { key: 'custom_fields', label: 'Custom fields' },
  { key: 'subtasks', label: 'Subtasks' },
]

const PANEL_MAX_W = 400
const VIEWPORT_PAD = 8
/** Used to decide above vs below before first layout measure. */
const PANEL_EST_H = 380

interface Props {
  open: boolean
  anchorRef: RefObject<HTMLElement | null>
  onClose: () => void
  value: RecurrenceCloneInclude
  onChange: (next: RecurrenceCloneInclude) => void
  embedded?: boolean
}

export function RecurrenceCloneOptionsModal({
  open,
  anchorRef,
  onClose,
  value,
  onChange,
  embedded = false,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null)

  const reposition = useCallback(() => {
    if (!open || !anchorRef.current) return
    const width = Math.min(PANEL_MAX_W, window.innerWidth - VIEWPORT_PAD * 2)
    const rect = anchorRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_PAD
    const placeAbove = spaceBelow < PANEL_EST_H + 4 && rect.top > PANEL_EST_H + VIEWPORT_PAD
    const top = placeAbove ? Math.max(VIEWPORT_PAD, rect.top - PANEL_EST_H - 4) : rect.bottom + 4
    const gap = 4
    let left = rect.right + gap
    if (left + width > window.innerWidth - VIEWPORT_PAD) {
      left = window.innerWidth - width - VIEWPORT_PAD
    }
    if (left < VIEWPORT_PAD) left = VIEWPORT_PAD
    setPos({ top, left, width })
  }, [open, anchorRef])

  useLayoutEffect(() => {
    if (!open) {
      setPos(null)
      return
    }
    reposition()
  }, [open, value, embedded, reposition])

  useEffect(() => {
    if (!open) return
    const onScroll = () => reposition()
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [open, reposition])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (panelRef.current?.contains(t) || anchorRef.current?.contains(t)) return
      onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onDown, true)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown, true)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose, anchorRef])

  if (!open || typeof document === 'undefined') return null

  const c = { ...DEFAULT_CLONE_INCLUDE, ...value }
  const includeAll = c.include_everything === true

  return createPortal(
    <div
      data-recurrence-clone-options
      className="fixed z-[100002]"
      style={
        pos
          ? {
              position: 'fixed',
              top: pos.top,
              left: pos.left,
              width: pos.width,
              maxWidth: 'min(100vw - 16px, 400px)',
            }
          : {
              position: 'fixed',
              left: 0,
              top: 0,
              width: 1,
              height: 1,
              overflow: 'hidden',
              opacity: 0,
              pointerEvents: 'none',
            }
      }
      role="dialog"
      aria-labelledby="rec-clone-opts-title"
    >
      <div
        ref={panelRef}
        className={cn(
          'dropdown-menu-solid flex max-h-[min(90vh,420px)] min-h-0 w-full flex-col overflow-hidden rounded-2xl shadow-xl',
          embedded ? 'max-h-[min(70vh,360px)]' : '',
        )}
      >
        <div className="border-border px-spacing-3 py-spacing-2 flex items-center justify-between border-b">
          <h2 id="rec-clone-opts-title" className="body-2 text-foreground font-semibold">
            Include in new task
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground rounded-md p-1"
            aria-label="Close"
          >
            <X className="icon-sm" />
          </button>
        </div>
        <div className="px-spacing-3 py-spacing-2 min-h-0 flex-1 overflow-y-auto">
          <label className="text-foreground body-3 mb-spacing-2 gap-spacing-2 flex items-center">
            <input
              type="checkbox"
              className="checkbox-glass-green"
              checked={includeAll}
              onChange={(e) => onChange(withCloneIncludeEverything(c, e.target.checked))}
            />
            Include everything
          </label>
          <div className="border-border my-spacing-2 border-t" />
          <div className="gap-y-spacing-1-5 sm:gap-x-spacing-3 grid grid-cols-1 sm:grid-cols-2">
            {ROWS.map(({ key, label }) => (
              <label
                key={key}
                className={cn(
                  'text-foreground gap-spacing-2 flex items-center',
                  embedded ? 'body-4' : 'body-3',
                  includeAll && 'pointer-events-none opacity-50',
                )}
              >
                <input
                  type="checkbox"
                  className="checkbox-glass-green"
                  disabled={includeAll}
                  checked={includeAll || c[key] === true}
                  onChange={(e) =>
                    onChange({
                      ...c,
                      include_everything: false,
                      [key]: e.target.checked,
                    })
                  }
                />
                {label}
              </label>
            ))}
          </div>
        </div>
        <div className="gap-spacing-2 px-spacing-3 py-spacing-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="button-glass-neutral hover:bg-hover-subtle body-3 px-spacing-3 py-1-5 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onClose}
            className="button-glass-accent body-3 px-spacing-3 py-1-5 rounded-lg"
          >
            Save
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
