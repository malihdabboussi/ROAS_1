'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Archive,
  ArchiveRestore,
  ChevronRight,
  Copy,
  CopyPlus,
  FolderInput,
  Pencil,
  Pin,
  PinOff,
  Share2,
  Trash2,
} from 'lucide-react'
import { fetchCampaigns, type Campaign } from '@/lib/campaigns/campaign-api'
import { ConversationActionsMenuItem as MenuItem } from './ConversationActionsMenuItem'
import { ConversationActionsQuickActions } from './ConversationActionsQuickActions'
import {
  CONVERSATION_ACTIONS_SUBMENU_WIDTH,
  ConversationActionsSubmenu,
  type ConversationActionsSubmenuKind,
} from './ConversationActionsSubmenu'

const HOVER_CLOSE_DELAY_MS = 140

export interface ConversationActionsMenuProps {
  open: boolean
  anchor: { top: number; left: number } | null
  isPinned: boolean
  isArchived: boolean
  currentCampaignId: string | null
  showCopyLink: boolean
  showShare: boolean
  /** When false, Share conversation is visible but disabled (e.g. personal account). */
  shareEnabled?: boolean
  canEdit: boolean
  canAdmin: boolean
  onClose: () => void
  onCopyLink: () => void
  onCopyId?: () => void
  onOpenInNewTab?: () => void
  onShare: () => void
  onRename: () => void
  onTogglePin: () => void
  onMoveTo: (campaignId: string | null) => void
  onDuplicate: () => void
  onDuplicateTo: (campaignId: string | null) => void
  onToggleArchive: () => void
  onDelete: () => void
}

export function ConversationActionsMenu(props: ConversationActionsMenuProps) {
  const {
    open,
    anchor,
    isPinned,
    isArchived,
    currentCampaignId,
    showCopyLink,
    showShare,
    shareEnabled = true,
    canEdit,
    canAdmin,
    onClose,
    onCopyLink,
    onCopyId,
    onOpenInNewTab,
    onShare,
    onRename,
    onTogglePin,
    onMoveTo,
    onDuplicate,
    onDuplicateTo,
    onToggleArchive,
    onDelete,
  } = props

  const menuRef = useRef<HTMLDivElement>(null)
  const submenuRef = useRef<HTMLDivElement>(null)
  const copyRowRef = useRef<HTMLButtonElement>(null)
  const moveRowRef = useRef<HTMLButtonElement>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [openSubmenu, setOpenSubmenu] = useState<ConversationActionsSubmenuKind | null>(null)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [campaignsLoading, setCampaignsLoading] = useState(false)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const [subPos, setSubPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })

  const cancelClose = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }
  const scheduleClose = () => {
    cancelClose()
    closeTimerRef.current = setTimeout(() => setOpenSubmenu(null), HOVER_CLOSE_DELAY_MS)
  }
  useEffect(() => () => cancelClose(), [])

  useEffect(() => {
    if (!open) {
      setOpenSubmenu(null)
      return
    }
    let cancelled = false
    setCampaignsLoading(true)
    fetchCampaigns()
      .then((rows) => {
        if (!cancelled) setCampaigns(rows)
      })
      .catch(() => {
        if (!cancelled) setCampaigns([])
      })
      .finally(() => {
        if (!cancelled) setCampaignsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target
      if (!(t instanceof Node)) return
      if (menuRef.current?.contains(t)) return
      if (submenuRef.current?.contains(t)) return
      onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  useLayoutEffect(() => {
    if (!open || !anchor) {
      setPosition(null)
      return
    }
    const el = menuRef.current
    const width = el?.offsetWidth ?? 224
    const height = el?.offsetHeight ?? 320
    const margin = 8
    const vw = window.innerWidth
    const vh = window.innerHeight
    let left = anchor.left
    let top = anchor.top
    if (left + width + margin > vw) left = Math.max(margin, vw - width - margin)
    if (top + height + margin > vh) top = Math.max(margin, anchor.top - height)
    if (top < margin) top = margin
    setPosition({ top, left })
  }, [open, anchor, campaigns, openSubmenu])

  useLayoutEffect(() => {
    const anchorEl =
      openSubmenu === 'move'
        ? moveRowRef.current
        : openSubmenu === 'copy'
          ? copyRowRef.current
          : null
    if (!anchorEl) return
    const rect = anchorEl.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const pad = 8
    let left = rect.right + 4
    let top = rect.top
    if (left + CONVERSATION_ACTIONS_SUBMENU_WIDTH > vw - pad) {
      left = rect.left - CONVERSATION_ACTIONS_SUBMENU_WIDTH - 4
    }
    if (top + 240 > vh - pad) top = Math.max(pad, vh - 240 - pad)
    setSubPos({ top, left })
  }, [openSubmenu])

  const itemCls =
    'gap-spacing-2 body-3 rounded-spacing-2 text-muted-foreground hover:bg-[var(--color-hover-subtle)] hover:text-foreground px-spacing-2 py-spacing-1 flex w-full items-center text-left transition-colors disabled:opacity-50 disabled:hover:bg-transparent'
  const itemIcon = 'h-3.5 w-3.5 shrink-0'

  const close = () => onClose()

  if (!open || !anchor || typeof document === 'undefined') return null

  return createPortal(
    <>
      <div
        ref={menuRef}
        data-spaces-conversation-menu
        role="menu"
        className="z-dropdown rounded-spacing-2 border-border surface-card p-spacing-2 fixed min-w-56 overflow-visible border shadow-lg"
        style={{
          top: position?.top ?? anchor.top,
          left: position?.left ?? anchor.left,
          visibility: position ? 'visible' : 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <ConversationActionsQuickActions
          showCopyLink={showCopyLink}
          onCopyLink={onCopyLink}
          onCopyId={onCopyId}
          onOpenInNewTab={onOpenInNewTab}
          onClose={close}
        />

        <div className="gap-spacing-1 px-spacing-1 flex flex-col">
          <MenuItem
            icon={<Pencil className={itemIcon} />}
            label="Rename"
            disabled={!canEdit}
            onClick={() => {
              if (!canEdit) return
              onRename()
              close()
            }}
          />
          <MenuItem
            icon={isPinned ? <PinOff className={itemIcon} /> : <Pin className={itemIcon} />}
            label={isPinned ? 'Unpin' : 'Pin'}
            disabled={!canEdit}
            onClick={() => {
              if (!canEdit) return
              onTogglePin()
              close()
            }}
          />

          <div className="border-border border-t" />

          <MenuItem
            icon={<CopyPlus className={itemIcon} />}
            label="Duplicate"
            onClick={() => {
              onDuplicate()
              close()
            }}
          />

          <button
            ref={copyRowRef}
            type="button"
            role="menuitem"
            disabled={campaignsLoading || !canEdit}
            onMouseEnter={() => {
              cancelClose()
              setOpenSubmenu('copy')
            }}
            onMouseLeave={scheduleClose}
            onFocus={() => {
              cancelClose()
              setOpenSubmenu('copy')
            }}
            onClick={() => setOpenSubmenu((s) => (s === 'copy' ? null : 'copy'))}
            className={itemCls}
            aria-haspopup="menu"
            aria-expanded={openSubmenu === 'copy'}
          >
            <Copy className={itemIcon} />
            <span className="min-w-0 flex-1 truncate">Copy to…</span>
            <ChevronRight className="h-3 w-3 shrink-0" />
          </button>

          <button
            ref={moveRowRef}
            type="button"
            role="menuitem"
            disabled={campaignsLoading || !canEdit}
            onMouseEnter={() => {
              cancelClose()
              setOpenSubmenu('move')
            }}
            onMouseLeave={scheduleClose}
            onFocus={() => {
              cancelClose()
              setOpenSubmenu('move')
            }}
            onClick={() => setOpenSubmenu((s) => (s === 'move' ? null : 'move'))}
            className={itemCls}
            aria-haspopup="menu"
            aria-expanded={openSubmenu === 'move'}
          >
            <FolderInput className={itemIcon} />
            <span className="min-w-0 flex-1 truncate">Move to…</span>
            <ChevronRight className="h-3 w-3 shrink-0" />
          </button>

          <div className="border-border border-t" />

          <MenuItem
            icon={
              isArchived ? (
                <ArchiveRestore className={itemIcon} />
              ) : (
                <Archive className={itemIcon} />
              )
            }
            label={isArchived ? 'Unarchive' : 'Archive'}
            disabled={!canEdit}
            onClick={() => {
              if (!canEdit) return
              onToggleArchive()
              close()
            }}
          />
          <MenuItem
            icon={<Trash2 className={itemIcon} />}
            label="Delete"
            disabled={!canAdmin}
            destructive
            onClick={() => {
              if (!canAdmin) return
              onDelete()
              close()
            }}
          />
        </div>

        {showShare ? (
          <>
            <div className="border-border mt-spacing-1 border-t" />
            <div className="px-spacing-2 pt-spacing-1">
              <button
                type="button"
                disabled={!shareEnabled || !canAdmin}
                className="button-glass-blue body-3 gap-spacing-2 px-spacing-3 py-spacing-1 flex w-full items-center justify-center rounded-md font-medium disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => {
                  if (!shareEnabled || !canAdmin) return
                  onShare()
                  close()
                }}
              >
                <Share2 className="relative z-10 h-3.5 w-3.5 shrink-0" />
                <span className="relative z-10">Share conversation</span>
              </button>
            </div>
          </>
        ) : null}
      </div>

      {openSubmenu ? (
        <ConversationActionsSubmenu
          ref={submenuRef}
          kind={openSubmenu}
          campaignsLoading={campaignsLoading}
          campaigns={campaigns}
          currentCampaignId={currentCampaignId}
          position={subPos}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
          onMoveTo={(campaignId) => {
            onMoveTo(campaignId)
            close()
          }}
          onDuplicateTo={(campaignId) => {
            onDuplicateTo(campaignId)
            close()
          }}
        />
      ) : null}
    </>,
    document.body,
  )
}
