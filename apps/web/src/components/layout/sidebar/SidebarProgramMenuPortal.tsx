'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Copy, Edit2, Plus, Share2, Star, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Program } from '@/lib/programs'
import { HUB_DOCK_PORTAL_GUARD } from '@/lib/ui/floating-control-attrs'
import { openInNewTab } from '@/lib/utils/open-in-new-tab'
import type { SectionMenuAnchorRect } from './SidebarHqSpacesRows'

const MENU_WIDTH = 224

export function SidebarProgramMenuPortal({
  program,
  anchorRect,
  onClose,
  onRename,
  onCreateCampaign,
  onDelete,
  onShare,
  onToggleFavorite,
}: {
  program: Program
  anchorRect: SectionMenuAnchorRect
  onClose: () => void
  onRename?: () => void
  onCreateCampaign: () => void
  onDelete?: () => void
  onShare?: () => void
  onToggleFavorite: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const isSystem = Boolean(program.system_kind)

  useLayoutEffect(() => {
    if (!ref.current) {
      setPos(null)
      return
    }
    const dropRect = ref.current.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const pad = 8
    let top = anchorRect.bottom + 4
    let left = anchorRect.right
    if (top + dropRect.height > vh - pad) top = anchorRect.top - dropRect.height - 4
    if (top < pad) top = pad
    if (left + dropRect.width > vw - pad) left = Math.max(pad, vw - dropRect.width - pad)
    setPos({ top, left })
  }, [anchorRect])

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (!target.closest('[data-program-menu]')) onClose()
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const rowCls =
    'gap-spacing-2 body-3 text-muted-foreground hover:bg-hover-subtle hover:text-foreground flex w-full items-center rounded-spacing-2 px-spacing-2 py-spacing-1 text-left transition-colors'

  return createPortal(
    <div
      ref={ref}
      data-program-menu
      {...{ [HUB_DOCK_PORTAL_GUARD]: '' }}
      className="surface-card border-border z-dropdown rounded-spacing-2 p-spacing-2 fixed min-w-56 border shadow-lg"
      style={{
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        width: MENU_WIDTH,
        visibility: pos ? 'visible' : 'hidden',
      }}
    >
      <div className="gap-spacing-1 px-spacing-1 flex flex-col">
        <button
          type="button"
          className={rowCls}
          onClick={() => {
            onToggleFavorite()
            onClose()
          }}
        >
          <Star className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {program.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
        </button>
        {onRename && !isSystem ? (
          <button
            type="button"
            className={rowCls}
            onClick={() => {
              onRename()
              onClose()
            }}
          >
            <Edit2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Rename
          </button>
        ) : null}
        {onShare ? (
          <button
            type="button"
            className={rowCls}
            onClick={() => {
              onShare()
              onClose()
            }}
          >
            <Share2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Share
          </button>
        ) : null}
        <button
          type="button"
          className={rowCls}
          onClick={() => {
            const url = `${window.location.origin}/programs/${program.id}`
            void navigator.clipboard.writeText(url).then(
              () => toast.success('Link copied'),
              () => openInNewTab(url),
            )
            onClose()
          }}
        >
          <Copy className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Copy link
        </button>
        <div className="border-border my-spacing-1 border-t" />
        <button
          type="button"
          className={rowCls}
          onClick={() => {
            onCreateCampaign()
            onClose()
          }}
        >
          <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden />
          New campaign
        </button>
        {onDelete && !isSystem ? (
          <>
            <div className="border-border my-spacing-1 border-t" />
            <button
              type="button"
              className="gap-spacing-2 body-3 text-destructive hover:bg-destructive/10 rounded-spacing-2 px-spacing-2 py-spacing-1 [&_svg]:text-destructive flex w-full items-center text-left transition-colors"
              onClick={() => {
                onDelete()
                onClose()
              }}
            >
              <Trash2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Delete
            </button>
          </>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}
