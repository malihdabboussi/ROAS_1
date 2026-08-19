'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Copy, Pin, PinOff, Settings2, Trash2 } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/dialogs/ConfirmDialog'
import {
  spaceCustomizeDeleteModalTitle,
  SPACES_CUSTOMIZE_VIEW_LABELS,
} from '../config/spaces-customize-view.config'
import type { ViewDef } from '../types/space-schema'

export type ViewTabContextMenuState = {
  viewId: string
  x: number
  y: number
  tabEl: HTMLElement
}

interface ViewTabContextMenuProps {
  state: ViewTabContextMenuState
  view: ViewDef | null
  /** Total visible views — delete is disabled when only one remains. */
  viewCount: number
  onClose: () => void
  onTogglePin?: (viewId: string, pinned: boolean) => void | Promise<void>
  onCustomize?: (viewId: string, anchorEl: HTMLElement) => void
  onDuplicate?: (viewId: string) => void | Promise<void>
  onDelete?: (viewId: string) => void | Promise<void>
}

/**
 * Lightweight right-click menu for space view tabs. Pinning is the headline
 * action; the full Customize panel stays one click away.
 */
export function ViewTabContextMenu({
  state,
  view,
  viewCount,
  onClose,
  onTogglePin,
  onCustomize,
  onDuplicate,
  onDelete,
}: ViewTabContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: -9999, left: -9999 })
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const pinned = view?.pinned_to_start ?? false

  useLayoutEffect(() => {
    if (!menuRef.current) return
    const rect = menuRef.current.getBoundingClientRect()
    const pad = 8
    let top = state.y + 2
    let left = state.x + 2
    if (left + rect.width > window.innerWidth - pad) {
      left = Math.max(pad, window.innerWidth - rect.width - pad)
    }
    if (top + rect.height > window.innerHeight - pad) {
      top = Math.max(pad, state.y - rect.height - 2)
    }
    setPos({ top, left })
  }, [state.x, state.y])

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('[data-view-tab-menu]')) onClose()
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handlePointerDown, true)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown, true)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  const itemCls =
    'gap-spacing-2 body-3 rounded-spacing-2 text-muted-foreground hover:bg-[var(--color-hover-subtle)] hover:text-foreground px-spacing-2 py-spacing-1 flex w-full items-center text-left transition-colors disabled:opacity-50 disabled:hover:bg-transparent'
  const itemIcon = 'h-3.5 w-3.5 shrink-0'

  if (confirmingDelete) {
    return (
      <ConfirmDialog
        open
        title={spaceCustomizeDeleteModalTitle(view?.name ?? 'view')}
        description={SPACES_CUSTOMIZE_VIEW_LABELS.MODAL_DELETE_BODY}
        confirmText={SPACES_CUSTOMIZE_VIEW_LABELS.MODAL_DELETE_CONFIRM}
        onConfirm={() => {
          setConfirmingDelete(false)
          void onDelete?.(state.viewId)
          onClose()
        }}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmingDelete(false)
            onClose()
          }
        }}
      />
    )
  }

  return createPortal(
    <div
      data-view-tab-menu
      ref={menuRef}
      role="menu"
      aria-label={`Actions for ${view?.name ?? 'view'}`}
      className="z-dropdown rounded-spacing-2 border-border surface-card p-spacing-2 fixed min-w-44 border shadow-lg"
      style={{ top: pos.top, left: pos.left }}
    >
      {onTogglePin ? (
        <button
          type="button"
          role="menuitem"
          className={itemCls}
          onClick={() => {
            void onTogglePin(state.viewId, !pinned)
            onClose()
          }}
        >
          {pinned ? <PinOff className={itemIcon} /> : <Pin className={itemIcon} />}
          {pinned ? SPACES_CUSTOMIZE_VIEW_LABELS.UNPIN_VIEW : SPACES_CUSTOMIZE_VIEW_LABELS.PIN_VIEW}
        </button>
      ) : null}
      {onCustomize ? (
        <button
          type="button"
          role="menuitem"
          className={itemCls}
          onClick={() => {
            onCustomize(state.viewId, state.tabEl)
            onClose()
          }}
        >
          <Settings2 className={itemIcon} />
          {SPACES_CUSTOMIZE_VIEW_LABELS.CUSTOMIZE_VIEW}
        </button>
      ) : null}
      {onDuplicate ? (
        <button
          type="button"
          role="menuitem"
          className={itemCls}
          onClick={() => {
            void onDuplicate(state.viewId)
            onClose()
          }}
        >
          <Copy className={itemIcon} />
          {SPACES_CUSTOMIZE_VIEW_LABELS.DUPLICATE_VIEW}
        </button>
      ) : null}
      {onDelete ? (
        <>
          <div className="bg-border my-spacing-1 h-px w-full" aria-hidden />
          <button
            type="button"
            role="menuitem"
            disabled={viewCount <= 1}
            className="gap-spacing-2 body-3 rounded-spacing-2 text-destructive px-spacing-2 py-spacing-1 flex w-full items-center text-left transition-colors hover:bg-[var(--color-hover-subtle)] disabled:opacity-50 disabled:hover:bg-transparent"
            onClick={() => setConfirmingDelete(true)}
          >
            <Trash2 className={itemIcon} />
            {SPACES_CUSTOMIZE_VIEW_LABELS.DELETE_VIEW}
          </button>
        </>
      ) : null}
    </div>,
    document.body,
  )
}
