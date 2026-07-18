'use client'

import { useEffect, useRef } from 'react'
import { FileText, Layers3, ListChecks } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { ShellRightPanelTab } from './use-shell-store'

export type ShellRightPanelSurface = Extract<ShellRightPanelTab, 'tasks' | 'files' | 'sources'>

const SURFACES: {
  id: ShellRightPanelSurface
  label: string
  Icon: typeof ListChecks
}[] = [
  { id: 'tasks', label: 'Tasks', Icon: ListChecks },
  { id: 'files', label: 'Files', Icon: FileText },
  { id: 'sources', label: 'Sources', Icon: Layers3 },
]

type ShellRightPanelPickerProps = {
  activeSurface: ShellRightPanelTab
  panelOpen: boolean
  onSelect: (surface: ShellRightPanelSurface) => void
  onClose: () => void
}

export function ShellRightPanelPicker({
  activeSurface,
  panelOpen,
  onSelect,
  onClose,
}: ShellRightPanelPickerProps) {
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return (
    <div
      ref={rootRef}
      role="menu"
      aria-label="Right panel surfaces"
      className="border-border bg-card shadow-2 absolute right-0 top-full z-50 mt-1 min-w-[180px] rounded-xl border p-1"
    >
      {SURFACES.map(({ id, label, Icon }) => {
        const active = panelOpen && activeSurface === id
        return (
          <button
            key={id}
            type="button"
            role="menuitem"
            onClick={() => {
              onSelect(id)
              onClose()
            }}
            className={cn(
              'body-3 text-foreground hover:bg-hover-subtle flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left',
              active && 'bg-hover-subtle font-medium',
            )}
          >
            <Icon className="icon-sm text-muted-foreground shrink-0" aria-hidden />
            <span className="min-w-0 flex-1 truncate">{label}</span>
          </button>
        )
      })}
    </div>
  )
}
