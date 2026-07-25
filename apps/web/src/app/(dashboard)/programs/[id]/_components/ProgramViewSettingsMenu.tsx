'use client'

import { useEffect, useRef, useState } from 'react'
import { Settings2 } from 'lucide-react'
import { PROGRAM_WORK_VIEW_IDS, WORK_VIEW_LABELS, type ProgramWorkViewId } from '@/lib/work-views'

interface ProgramViewSettingsMenuProps {
  visibleViews: ProgramWorkViewId[]
  onChange: (views: ProgramWorkViewId[]) => void
}

export function ProgramViewSettingsMenu({ visibleViews, onChange }: ProgramViewSettingsMenuProps) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const closeOutside = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', closeOutside)
    return () => document.removeEventListener('mousedown', closeOutside)
  }, [open])

  const toggleView = (viewId: ProgramWorkViewId) => {
    if (viewId === 'overview') return
    const selected = new Set(visibleViews)
    if (selected.has(viewId)) selected.delete(viewId)
    else selected.add(viewId)
    onChange(PROGRAM_WORK_VIEW_IDS.filter((candidate) => selected.has(candidate)))
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        aria-label="Program view settings"
        onClick={() => setOpen((current) => !current)}
        className="chip-glass-neutral h-spacing-9 w-spacing-9 flex items-center justify-center rounded-lg"
      >
        <Settings2 className="icon-sm" />
      </button>
      {open ? (
        <div className="surface-card border-border rounded-spacing-2 z-dropdown p-spacing-2 absolute right-0 top-full mt-2 w-56 border shadow-lg">
          <p className="body-4 text-muted-foreground px-spacing-2 py-spacing-1 uppercase tracking-wide">
            Visible views
          </p>
          {PROGRAM_WORK_VIEW_IDS.map((viewId) => {
            const disabled = viewId === 'overview'
            return (
              <label
                key={viewId}
                className={`rounded-spacing-2 body-3 px-spacing-2 py-spacing-2 gap-spacing-2 flex items-center ${
                  disabled ? 'opacity-60' : 'hover:bg-hover-subtle cursor-pointer'
                }`}
              >
                <input
                  type="checkbox"
                  checked={visibleViews.includes(viewId)}
                  disabled={disabled}
                  onChange={() => toggleView(viewId)}
                  className="border-border rounded"
                />
                <span>{WORK_VIEW_LABELS[viewId]}</span>
              </label>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
