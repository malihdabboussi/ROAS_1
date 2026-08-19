'use client'

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import {
  BarChart3,
  CalendarClock,
  CalendarOff,
  ChevronRight,
  Copy,
  Edit2,
  FileEdit,
  FolderInput,
  Fullscreen,
  Send,
  Trash2,
} from 'lucide-react'
import { SpacesArtifactDeleteConfirmModal } from '../SpacesArtifactDeleteConfirmModal'
import {
  SOCIAL_POST_CAMPAIGN_SUBMENU_WIDTH,
  SocialPostCampaignSubmenu,
} from './SocialPostCampaignSubmenu'
import { useSocialPostMenuActions, type SocialPostMenuTarget } from './use-social-post-menu-actions'

const HOVER_CLOSE_DELAY_MS = 140

interface SocialPostMenuDropdownProps {
  post: SocialPostMenuTarget
  anchorRef: RefObject<HTMLButtonElement | null>
  onClose: () => void
  onChanged?: () => void
  onOpenFullView?: () => void
  /** Open the Schedule dialog (preview-only — card menu omits this). */
  onSchedule?: () => void
  /** Called after a successful delete (e.g. preview pane dismisses selection). */
  onDeleted?: () => void
  pointerPosition?: { x: number; y: number } | null
}

type SubmenuKind = 'move' | 'copy' | null

export function SocialPostMenuDropdown({
  post,
  anchorRef,
  onClose,
  onChanged,
  onOpenFullView,
  onSchedule,
  onDeleted,
  pointerPosition,
}: SocialPostMenuDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null)
  const moveButtonRef = useRef<HTMLButtonElement>(null)
  const copyButtonRef = useRef<HTMLButtonElement>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [openSubmenu, setOpenSubmenu] = useState<SubmenuKind>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
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

  const actions = useSocialPostMenuActions({
    post,
    onChanged,
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

    if (!anchorRef.current) return
    const anchorRect = anchorRef.current.getBoundingClientRect()
    let top = anchorRect.bottom + 4
    if (top + dropRect.height > vh - pad) top = anchorRect.top - dropRect.height - 4
    if (top < pad) top = pad
    const left = anchorRect.right
    setPos({ top, left })
  }, [anchorRef, pointerPosition, deleteModalOpen])

  useLayoutEffect(() => {
    const anchor =
      openSubmenu === 'move'
        ? moveButtonRef.current
        : openSubmenu === 'copy'
          ? copyButtonRef.current
          : null
    if (!anchor) return
    const rect = anchor.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const pad = 8
    let top = rect.top
    let left = rect.right + 4
    if (left + SOCIAL_POST_CAMPAIGN_SUBMENU_WIDTH > vw - pad) {
      left = rect.left - SOCIAL_POST_CAMPAIGN_SUBMENU_WIDTH - 4
    }
    if (top + 240 > vh - pad) top = Math.max(pad, vh - 240 - pad)
    setSubPos({ top, left })
  }, [openSubmenu])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (deleteModalOpen) return
      const target = e.target as HTMLElement
      if (!target.closest('[data-social-post-menu]') && !anchorRef.current?.contains(target)) {
        onClose()
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !deleteModalOpen) onClose()
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose, anchorRef, deleteModalOpen])

  const currentCampaign = actions.campaigns.find((c) => c.id === post.campaign_id)
  const otherCampaigns = actions.campaigns.filter((c) => c.id !== post.campaign_id)

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
  /** Table row: straight vertical divides; rounding only from outer `overflow-hidden rounded-md` shell. */
  const quickCellCls =
    'body-3 text-muted-foreground hover:bg-[var(--color-hover-subtle)] hover:text-foreground flex min-h-7 min-w-0 flex-1 items-center justify-center truncate rounded-none px-2 text-center transition-colors'

  const canToggleReadyToDraft = actions.isReady && !actions.isPublished

  return createPortal(
    <>
      {!deleteModalOpen ? (
        <>
          <div
            data-social-post-menu
            ref={dropdownRef}
            className="z-dropdown rounded-spacing-2 border-border surface-card p-spacing-2 fixed min-w-56 border shadow-lg"
            style={{ top: pos.top, left: pos.left, transform: 'translateX(-100%)' }}
          >
            <div className="border-border mb-spacing-2 overflow-hidden rounded-md border">
              <div className="divide-border flex w-full divide-x">
                <button type="button" onClick={wrap(actions.copyId)} className={quickCellCls}>
                  Copy ID
                </button>
              </div>
            </div>

            <div className="gap-spacing-1 px-spacing-1 flex flex-col">
              {onOpenFullView ? (
                <>
                  <button type="button" onClick={wrap(() => onOpenFullView())} className={itemCls}>
                    <Fullscreen className={itemIcon} />
                    <span>Full screen view</span>
                  </button>
                  <div className="border-border border-t" />
                </>
              ) : null}
              <button type="button" onClick={wrap(actions.rename)} className={itemCls}>
                <Edit2 className={itemIcon} />
                <span>Rename</span>
              </button>

              <div className="border-border border-t" />

              {canToggleReadyToDraft ? (
                <button type="button" onClick={wrap(actions.markDraft)} className={itemCls}>
                  <FileEdit className={itemIcon} />
                  <span>Move to draft</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={wrap(actions.markReady)}
                  className={itemCls}
                  disabled={actions.isPublished || actions.isReady}
                >
                  <Send className={itemIcon} />
                  <span>Mark as ready</span>
                </button>
              )}
              {onSchedule ? (
                <button type="button" onClick={wrap(() => onSchedule())} className={itemCls}>
                  <CalendarClock className={itemIcon} />
                  <span>{actions.isScheduled ? 'Reschedule' : 'Schedule'}</span>
                </button>
              ) : null}
              {actions.isScheduled && !actions.isPublished ? (
                <button type="button" onClick={wrap(actions.unschedule)} className={itemCls}>
                  <CalendarOff className={itemIcon} />
                  <span>Unschedule</span>
                </button>
              ) : null}

              <div className="border-border border-t" />

              <button
                type="button"
                onClick={wrap(actions.duplicateInCurrentCampaign)}
                className={itemCls}
                disabled={!post.campaign_id}
              >
                <Copy className={itemIcon} />
                <span>Duplicate</span>
              </button>
              <button
                ref={copyButtonRef}
                type="button"
                onMouseEnter={() => {
                  cancelClose()
                  if (!actions.campaignsLoading && actions.campaigns.length > 1)
                    setOpenSubmenu('copy')
                }}
                onMouseLeave={scheduleClose}
                onFocus={() => {
                  cancelClose()
                  if (!actions.campaignsLoading && actions.campaigns.length > 1)
                    setOpenSubmenu('copy')
                }}
                onClick={() => setOpenSubmenu((s) => (s === 'copy' ? null : 'copy'))}
                className={itemCls}
                disabled={actions.campaignsLoading || actions.campaigns.length <= 1}
                aria-haspopup="menu"
                aria-expanded={openSubmenu === 'copy'}
              >
                <Copy className={itemIcon} />
                <span className="flex-1">Copy to</span>
                <ChevronRight className="h-3 w-3 shrink-0" />
              </button>
              <button
                ref={moveButtonRef}
                type="button"
                onMouseEnter={() => {
                  cancelClose()
                  if (!actions.campaignsLoading && actions.campaigns.length > 1)
                    setOpenSubmenu('move')
                }}
                onMouseLeave={scheduleClose}
                onFocus={() => {
                  cancelClose()
                  if (!actions.campaignsLoading && actions.campaigns.length > 1)
                    setOpenSubmenu('move')
                }}
                onClick={() => setOpenSubmenu((s) => (s === 'move' ? null : 'move'))}
                className={itemCls}
                disabled={actions.campaignsLoading || actions.campaigns.length <= 1}
                aria-haspopup="menu"
                aria-expanded={openSubmenu === 'move'}
              >
                <FolderInput className={itemIcon} />
                <span className="flex-1">Move to</span>
                <ChevronRight className="h-3 w-3 shrink-0" />
              </button>

              <div className="border-border border-t" />

              <button type="button" onClick={wrap(actions.viewAnalytics)} className={itemCls}>
                <BarChart3 className={itemIcon} />
                <span>View analytics</span>
              </button>

              <div className="border-border border-t" />

              <button
                type="button"
                onClick={() => {
                  setOpenSubmenu(null)
                  setDeleteModalOpen(true)
                }}
                className="gap-spacing-2 body-3 rounded-spacing-2 px-spacing-2 py-spacing-1 text-destructive [&_svg]:text-destructive flex w-full items-center text-left transition-colors hover:bg-red-500/10"
              >
                <Trash2 className={itemIcon} />
                <span>Delete</span>
              </button>
            </div>
          </div>

          {openSubmenu ? (
            <SocialPostCampaignSubmenu
              currentCampaign={currentCampaign}
              kind={openSubmenu}
              otherCampaigns={otherCampaigns}
              position={subPos}
              onClose={close}
              onCopyToCampaign={(campaignId) => void actions.copyToCampaign(campaignId)}
              onMouseEnter={cancelClose}
              onMouseLeave={scheduleClose}
              onMoveToCampaign={(campaignId) => void actions.moveToCampaign(campaignId)}
            />
          ) : null}
        </>
      ) : null}

      <SpacesArtifactDeleteConfirmModal
        open={deleteModalOpen}
        onClose={() => {
          if (!deleteBusy) setDeleteModalOpen(false)
        }}
        kind="social_post"
        entityName={actions.displayName}
        isDeleting={deleteBusy}
        onConfirm={async () => {
          setDeleteBusy(true)
          try {
            await actions.deletePost()
            setDeleteModalOpen(false)
            onDeleted?.()
            onClose()
          } finally {
            setDeleteBusy(false)
          }
        }}
      />
    </>,
    document.body,
  )
}
