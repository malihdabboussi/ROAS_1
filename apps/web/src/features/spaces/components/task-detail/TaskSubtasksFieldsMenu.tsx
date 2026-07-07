'use client'

import { useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { ViewFieldsVisibilityContent } from '../CustomizeViewPanel'
import type { SpaceSchema, ViewDef } from '../../types/space-schema'

interface TaskSubtasksFieldsMenuProps {
  activeView: ViewDef
  open: boolean
  position: { top: number; left: number } | null
  spaceSchema: SpaceSchema
  onClose: () => void
  onViewPatch: (patch: Partial<ViewDef>) => Promise<void>
}

export function TaskSubtasksFieldsMenu({
  activeView,
  open,
  position,
  spaceSchema,
  onClose,
  onViewPatch,
}: TaskSubtasksFieldsMenuProps) {
  const fieldsMenuRef = useRef<HTMLDivElement | null>(null)

  if (typeof document === 'undefined' || !open || !position) return null

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[150]"
        style={{ background: 'transparent' }}
        aria-hidden
        onClick={onClose}
      />
      <div
        ref={fieldsMenuRef}
        className="dropdown-menu-solid fixed z-[200] flex max-h-[min(480px,70vh)] w-[320px] flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--background)] py-0 shadow-2xl"
        style={{ top: position.top, left: position.left }}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <span className="text-sm font-semibold text-[var(--foreground)]">Fields</span>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md p-1 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <ViewFieldsVisibilityContent
          schema={spaceSchema}
          activeView={activeView}
          onViewPatch={async (p) => {
            await onViewPatch(p)
          }}
          autoFocusSearch={false}
        />
      </div>
    </>,
    document.body,
  )
}
