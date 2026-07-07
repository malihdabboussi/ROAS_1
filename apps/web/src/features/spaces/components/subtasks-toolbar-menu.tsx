'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check } from 'lucide-react'
import {
  resolveMissionsSubtasksDisplay,
  resolveSubtasksDisplay,
  type MissionsConfig,
  type SubtasksDisplayMode,
  type ViewDef,
} from '../types/space-schema'
import { VIBEY_SPACE_FLOATING_CONTROL } from '@/lib/ui/floating-control-attrs'

export const SUBTASKS_TOOLBAR_OPTIONS = [
  { id: 'collapsed' as const, label: 'Collapsed' },
  { id: 'expanded' as const, label: 'Expanded' },
  { id: 'separate' as const, label: 'Separate' },
]

export interface SubtasksToolbarMenuProps {
  open: boolean
  onClose: () => void
  anchorRef: React.RefObject<HTMLElement | null>
  onViewPatch: (patch: Partial<ViewDef>) => void | Promise<void>
  activeView: ViewDef
  isMissionsView: boolean
  missionsMc: MissionsConfig
}

export function SubtasksToolbarMenu({
  open,
  onClose,
  anchorRef,
  onViewPatch,
  activeView,
  isMissionsView,
  missionsMc,
}: SubtasksToolbarMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  const toolbarSubtasksMode: SubtasksDisplayMode = isMissionsView
    ? resolveMissionsSubtasksDisplay(missionsMc)
    : resolveSubtasksDisplay(activeView)

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return
    const rect = anchorRef.current.getBoundingClientRect()
    setPos({ top: rect.bottom + 6, left: rect.left })
  }, [open, anchorRef])

  useEffect(() => {
    if (!open) return
    const handleOutside = (e: MouseEvent) => {
      const t = e.target as Node
      if (!menuRef.current?.contains(t) && !anchorRef.current?.contains(t)) onClose()
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleOutside, true)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleOutside, true)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open, onClose, anchorRef])

  if (!open || !pos || typeof document === 'undefined') return null

  return createPortal(
    <div
      ref={menuRef}
      {...{ [VIBEY_SPACE_FLOATING_CONTROL]: '' }}
      className="dropdown-menu-solid fixed z-[99999] w-[11.5rem] rounded-xl py-2 shadow-lg"
      style={{ top: pos.top, left: pos.left }}
    >
      <p className="px-3 pb-1.5 text-xs font-medium text-[var(--color-muted-foreground)]">
        Show subtasks
      </p>
      {SUBTASKS_TOOLBAR_OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => {
            onClose()
            if (isMissionsView) {
              void onViewPatch({
                missions_config: {
                  ...missionsMc,
                  subtasks_display: opt.id,
                  subtasks_expanded: opt.id !== 'collapsed',
                },
              })
            } else {
              void onViewPatch({
                subtasks_display: opt.id,
                subtasks_expanded: opt.id === 'expanded',
              })
            }
          }}
          className="flex w-full items-center justify-between px-3 py-1.5 text-xs text-[var(--foreground)] transition-colors hover:bg-[var(--color-hover-subtle)]"
        >
          <span>{opt.label}</span>
          {toolbarSubtasksMode === opt.id ? (
            <Check className="h-3 w-3 shrink-0 text-[var(--color-primary)]" />
          ) : null}
        </button>
      ))}
      <p className="px-3 pt-2 text-[10px] leading-snug text-[var(--color-muted-foreground)]">
        Use this to filter subtasks
      </p>
    </div>,
    document.body,
  )
}
