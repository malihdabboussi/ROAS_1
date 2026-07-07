'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Check,
  ChevronRight,
  Code2,
  Copy,
  Download,
  Edit2,
  FolderInput,
  FolderOpen,
  Fullscreen,
  Globe,
  Inbox,
  Settings,
  Trash2,
  Unlink,
} from 'lucide-react'
import { LucideIcon } from '@/components/ui/IconPicker'
import type {
  FormArtifactMenuDropdownProps,
  FormArtifactMenuSubmenuKind,
} from './form-artifact-menu-types'

const HOVER_CLOSE_DELAY_MS = 140
const SUBMENU_WIDTH = 224

function campaignIconName(c: { config?: Record<string, unknown> | null }): string {
  const fromConfig = (c.config as Record<string, unknown> | undefined)?.icon
  return typeof fromConfig === 'string' && fromConfig.length > 0 ? fromConfig : 'folder'
}

export function FormArtifactMenuDropdown({
  form,
  anchorRef,
  actions,
  onClose,
  onRequestDelete,
  onOpenSettings,
  onRequestRename,
  onOpenResponses,
  onOpenFullView,
  pointerPosition,
}: FormArtifactMenuDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null)
  const moveButtonRef = useRef<HTMLButtonElement>(null)
  const copyButtonRef = useRef<HTMLButtonElement>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [openSubmenu, setOpenSubmenu] = useState<FormArtifactMenuSubmenuKind>(null)
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
  }, [anchorRef, pointerPosition])

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
    if (left + SUBMENU_WIDTH > vw - pad) left = rect.left - SUBMENU_WIDTH - 4
    if (top + 240 > vh - pad) top = Math.max(pad, vh - 240 - pad)
    setSubPos({ top, left })
  }, [openSubmenu])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-form-menu]') && !anchorRef.current?.contains(target)) {
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

  const currentCampaign = actions.campaigns.find((c) => c.id === form.campaign_id)
  const otherCampaigns = actions.campaigns.filter((c) => c.id !== form.campaign_id)
  const close = () => onClose()
  const wrap = (fn: () => void | Promise<void>) => async () => {
    try {
      await fn()
    } finally {
      close()
    }
  }

  const itemCls =
    'gap-spacing-2 body-3 rounded-spacing-2 text-muted-foreground hover:bg-hover-subtle hover:text-foreground px-spacing-2 py-spacing-1 flex w-full items-center text-left transition-colors disabled:opacity-50 disabled:hover:bg-transparent'
  const itemIcon = 'icon-sm shrink-0'
  const submenuRowCls =
    'gap-spacing-2 body-3 rounded-spacing-2 text-muted-foreground hover:bg-hover-subtle hover:text-foreground px-spacing-2 py-spacing-1 flex w-full items-center text-left transition-colors'
  const quickCellCls =
    'body-3 text-muted-foreground hover:bg-hover-subtle hover:text-foreground h-spacing-7 px-spacing-2 flex min-w-0 flex-1 items-center justify-center truncate rounded-none text-center transition-colors'

  return createPortal(
    <>
      <div
        data-form-menu
        ref={dropdownRef}
        className="z-dropdown rounded-spacing-2 border-border surface-card p-spacing-2 fixed min-w-56 border shadow-lg"
        style={{ top: pos.top, left: pos.left, transform: 'translateX(-100%)' }}
      >
        <div className="border-border mb-spacing-2 overflow-hidden rounded-md border">
          <div className="divide-border flex w-full divide-x">
            {actions.isPublished && actions.liveUrl ? (
              <button type="button" onClick={wrap(actions.copyLink)} className={quickCellCls}>
                Copy link
              </button>
            ) : null}
            <button type="button" onClick={wrap(actions.copyId)} className={quickCellCls}>
              Copy ID
            </button>
            {actions.isPublished && actions.liveUrl ? (
              <button type="button" onClick={wrap(actions.openInNewTab)} className={quickCellCls}>
                New tab
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-spacing-1 px-spacing-1">
          {onOpenFullView ? (
            <>
              <button type="button" onClick={wrap(() => onOpenFullView())} className={itemCls}>
                <Fullscreen className={itemIcon} />
                <span>Full screen view</span>
              </button>
              <div className="border-border border-t" />
            </>
          ) : null}

          <button
            type="button"
            onClick={wrap(() => (onRequestRename ? onRequestRename() : actions.rename()))}
            className={itemCls}
          >
            <Edit2 className={itemIcon} />
            <span>Rename</span>
          </button>
          {onOpenSettings ? (
            <button type="button" onClick={wrap(() => onOpenSettings())} className={itemCls}>
              <Settings className={itemIcon} />
              <span>Form settings</span>
            </button>
          ) : null}

          <div className="border-border border-t" />

          {actions.isPublished ? (
            <button type="button" onClick={wrap(actions.unpublish)} className={itemCls}>
              <Unlink className={itemIcon} />
              <span>Unpublish</span>
            </button>
          ) : (
            <button type="button" onClick={wrap(actions.publish)} className={itemCls}>
              <Globe className={itemIcon} />
              <span>Publish</span>
            </button>
          )}
          <button type="button" onClick={wrap(actions.copyEmbedCode)} className={itemCls}>
            <Code2 className={itemIcon} />
            <span>Copy embed code</span>
          </button>

          <div className="border-border border-t" />

          {onOpenResponses ? (
            <button type="button" onClick={wrap(() => onOpenResponses())} className={itemCls}>
              <Inbox className={itemIcon} />
              <span>View responses</span>
            </button>
          ) : null}
          <button type="button" onClick={wrap(actions.exportResponsesCsv)} className={itemCls}>
            <Download className={itemIcon} />
            <span>Export responses (CSV)</span>
          </button>
          {actions.goToTargetSpace ? (
            <button
              type="button"
              onClick={wrap(actions.goToTargetSpace)}
              className={itemCls}
              disabled={!form.space_id}
            >
              <FolderOpen className={itemIcon} />
              <span>Go to target space</span>
            </button>
          ) : null}

          <div className="border-border border-t" />

          <button
            type="button"
            onClick={wrap(actions.duplicateInCurrentCampaign)}
            className={itemCls}
            disabled={!form.campaign_id}
          >
            <Copy className={itemIcon} />
            <span>Duplicate</span>
          </button>
          <button
            ref={copyButtonRef}
            type="button"
            onMouseEnter={() => {
              cancelClose()
              if (!actions.campaignsLoading && actions.campaigns.length > 1) setOpenSubmenu('copy')
            }}
            onMouseLeave={scheduleClose}
            onFocus={() => {
              cancelClose()
              if (!actions.campaignsLoading && actions.campaigns.length > 1) setOpenSubmenu('copy')
            }}
            onClick={() => setOpenSubmenu((s) => (s === 'copy' ? null : 'copy'))}
            className={itemCls}
            disabled={actions.campaignsLoading || actions.campaigns.length <= 1}
            aria-haspopup="menu"
            aria-expanded={openSubmenu === 'copy'}
          >
            <Copy className={itemIcon} />
            <span className="flex-1">Copy to</span>
            <ChevronRight className="icon-xs shrink-0" />
          </button>
          <button
            ref={moveButtonRef}
            type="button"
            onMouseEnter={() => {
              cancelClose()
              if (!actions.campaignsLoading && actions.campaigns.length > 1) setOpenSubmenu('move')
            }}
            onMouseLeave={scheduleClose}
            onFocus={() => {
              cancelClose()
              if (!actions.campaignsLoading && actions.campaigns.length > 1) setOpenSubmenu('move')
            }}
            onClick={() => setOpenSubmenu((s) => (s === 'move' ? null : 'move'))}
            className={itemCls}
            disabled={actions.campaignsLoading || actions.campaigns.length <= 1}
            aria-haspopup="menu"
            aria-expanded={openSubmenu === 'move'}
          >
            <FolderInput className={itemIcon} />
            <span className="flex-1">Move to</span>
            <ChevronRight className="icon-xs shrink-0" />
          </button>

          <div className="border-border border-t" />

          <button
            type="button"
            onClick={() => {
              setOpenSubmenu(null)
              onRequestDelete()
            }}
            className="gap-spacing-2 body-3 rounded-spacing-2 px-spacing-2 py-spacing-1 flex w-full items-center text-left text-destructive transition-colors hover:bg-destructive/10 [&_svg]:text-destructive"
          >
            <Trash2 className={itemIcon} />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {openSubmenu ? (
        <div
          data-form-menu
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
          className="z-dropdown rounded-spacing-2 border-border surface-card py-spacing-2 px-spacing-3 flex flex-col gap-spacing-1 fixed overflow-y-auto border shadow-lg"
          style={{
            top: subPos.top,
            left: subPos.left,
            width: SUBMENU_WIDTH,
            maxHeight: `calc(100vh - ${subPos.top + 8}px)`,
          }}
        >
          {currentCampaign ? (
            <>
              <button
                type="button"
                disabled
                className="gap-spacing-2 body-3 rounded-spacing-2 text-muted-foreground px-spacing-2 py-spacing-1 flex w-full cursor-default items-center text-left opacity-70"
              >
                <LucideIcon name={campaignIconName(currentCampaign)} className="icon-sm shrink-0" />
                <span className="min-w-0 flex-1 truncate">{currentCampaign.name}</span>
                <Check className="icon-sm shrink-0 text-success" />
              </button>
              <div className="border-border border-t" />
            </>
          ) : null}
          {otherCampaigns.length === 0 ? (
            <p className="px-spacing-2 py-spacing-1 body-3 text-muted-foreground/70">
              No other campaigns
            </p>
          ) : (
            otherCampaigns.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  if (openSubmenu === 'move') void actions.moveToCampaign(c.id)
                  else void actions.copyToCampaign(c.id)
                  close()
                }}
                className={submenuRowCls}
              >
                <LucideIcon name={campaignIconName(c)} className="icon-sm shrink-0" />
                <span className="min-w-0 truncate">{c.name}</span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </>,
    document.body,
  )
}
