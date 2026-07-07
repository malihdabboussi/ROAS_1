'use client'

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { Archive, ArchiveRestore, Edit2, ExternalLink, RotateCcw, Trash2 } from 'lucide-react'
import type { Mission } from '../../types'
import { useMissionMenuActions } from './use-mission-menu-actions'

export interface MissionMenuDropdownProps {
  mission: Mission
  anchorRef?: RefObject<HTMLElement | null>
  pointerPosition?: { x: number; y: number } | null
  onClose: () => void
  onChanged?: () => void
  onOpenMission?: () => void
  onDelete?: () => void
}

export function MissionMenuDropdown({
  mission,
  anchorRef,
  pointerPosition,
  onClose,
  onChanged,
  onOpenMission,
  onDelete,
}: MissionMenuDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: -9999, left: -9999 })

  const actions = useMissionMenuActions({
    mission,
    onChanged,
    onOpenMission,
    onDelete,
  })

  useLayoutEffect(() => {
    if (!dropdownRef.current) return
    const dropRect = dropdownRef.current.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const pad = 8

    if (pointerPosition) {
      let top = pointerPosition.y
      let left = pointerPosition.x + dropRect.width
      if (top + dropRect.height > vh - pad) top = Math.max(pad, vh - dropRect.height - pad)
      if (top < pad) top = pad
      if (left > vw - pad) left = vw - pad
      if (left - dropRect.width < pad) left = pad + dropRect.width
      setPos({ top, left })
      return
    }

    if (!anchorRef?.current) return
    const anchorRect = anchorRef.current.getBoundingClientRect()
    let top = anchorRect.bottom + 4
    if (top + dropRect.height > vh - pad) top = anchorRect.top - dropRect.height - 4
    if (top < pad) top = pad
    const left = anchorRect.right
    setPos({ top, left })
  }, [anchorRef, pointerPosition])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-mission-menu]') && !anchorRef?.current?.contains(target)) {
        onClose()
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose, anchorRef])

  const close = () => onClose()
  const wrap = (fn: () => void | Promise<void>) => async () => {
    try {
      await fn()
    } finally {
      close()
    }
  }

  const itemCls =
    'gap-spacing-2 body-3 rounded-spacing-2 text-muted-foreground hover:bg-[var(--color-hover-subtle)] hover:text-foreground px-spacing-2 py-spacing-1 flex w-full items-center text-left transition-colors disabled:opacity-50 disabled:hover:bg-transparent'
  const itemIcon = 'h-3.5 w-3.5 shrink-0'
  const quickCellCls =
    'body-3 text-muted-foreground hover:bg-[var(--color-hover-subtle)] hover:text-foreground flex min-h-7 min-w-0 flex-1 items-center justify-center truncate rounded-none px-2 text-center transition-colors'

  return createPortal(
    <div
      data-mission-menu
      ref={dropdownRef}
      className="z-dropdown rounded-spacing-2 border-border surface-card p-spacing-2 fixed min-w-56 border shadow-lg"
      style={{ top: pos.top, left: pos.left, transform: 'translateX(-100%)' }}
    >
      <div className="border-border mb-spacing-2 overflow-hidden rounded-md border">
        <div className="divide-border flex w-full divide-x">
          <button type="button" onClick={wrap(actions.copyLink)} className={quickCellCls}>
            Copy link
          </button>
          <button type="button" onClick={wrap(actions.copyId)} className={quickCellCls}>
            Copy ID
          </button>
          <button type="button" onClick={wrap(actions.openInNewTab)} className={quickCellCls}>
            New tab
          </button>
        </div>
      </div>

      <div className="gap-spacing-1 px-spacing-1 flex flex-col">
        {onOpenMission ? (
          <button type="button" onClick={wrap(actions.openMission)} className={itemCls}>
            <ExternalLink className={itemIcon} />
            <span>Open mission</span>
          </button>
        ) : null}

        <div className="border-border border-t" />

        <button type="button" onClick={wrap(actions.archive)} className={itemCls}>
          {actions.isArchived ? (
            <ArchiveRestore className={itemIcon} />
          ) : (
            <Archive className={itemIcon} />
          )}
          <span>{actions.isArchived ? 'Unarchive' : 'Archive'}</span>
        </button>
        {actions.showRetry ? (
          <button type="button" onClick={wrap(actions.retry)} className={itemCls}>
            <RotateCcw className={itemIcon} />
            <span>Retry</span>
          </button>
        ) : null}
        <button type="button" onClick={wrap(actions.rename)} className={itemCls}>
          <Edit2 className={itemIcon} />
          <span>Rename</span>
        </button>

        {onDelete ? (
          <>
            <div className="border-border border-t" />
            <button
              type="button"
              onClick={wrap(actions.deleteMission)}
              className="gap-spacing-2 body-3 rounded-spacing-2 px-spacing-2 py-spacing-1 flex w-full items-center text-left text-red-600 transition-colors hover:bg-red-500/10 [&_svg]:text-red-600"
            >
              <Trash2 className={itemIcon} />
              <span>Delete</span>
            </button>
          </>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}
