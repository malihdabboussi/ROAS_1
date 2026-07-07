'use client'

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  ChevronRight,
  Copy,
  Edit3,
  ExternalLink,
  Hash,
  LayoutGrid,
  Palette,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import { getIconColor, IconPicker, LucideIcon, type IconColorId } from '@/components/ui/IconPicker'
import type { AdCampaign, AdSet } from '@/lib/artifacts/artifact-types'

const ROW_CLS =
  'flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-[var(--foreground)] hover:bg-[var(--color-hover-subtle)]'
const DANGER_ROW_CLS =
  'flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-red-400 hover:bg-[var(--color-hover-subtle)]'
const ROW_ICON_CLS = 'h-3.5 w-3.5 text-[var(--color-muted-foreground)]'
const QUICK_CELL_CLS =
  'body-3 text-muted-foreground hover:bg-[var(--color-hover-subtle)] hover:text-foreground flex min-h-7 min-w-0 flex-1 items-center justify-center truncate px-2 text-center transition-colors'
const Divider = () => <div className="my-1 h-px bg-[var(--color-border)]" aria-hidden />

const SUBMENU_WIDTH = 220
const HOVER_CLOSE_DELAY_MS = 140

export type PaidAdsRowMenuTarget =
  | {
      kind: 'campaign'
      data: AdCampaign
      iconName: string
      iconColorId: IconColorId
    }
  | {
      kind: 'ad_set'
      data: AdSet
      adAccountId: string | null
      hasAds: boolean
      iconName: string
      iconColorId: IconColorId
    }

export interface PaidAdsRowMenuActions {
  onClose: () => void
  onCopyLink: () => void
  onCopyId: () => void
  onOpenInNewTab: () => void
  onStartRename: () => void
  onDuplicate: () => void
  onAddAdSet?: () => void
  onPauseOnMeta: () => void
  onActivateOnMeta: () => void
  onRefreshMetaStatus: () => void
  onCopyMetaId: () => void
  onOpenInMeta: () => void
  onOpenCanvas?: () => void
  onPatchIcon: (patch: { icon?: string; icon_color?: IconColorId }) => void
  onDeleteKeepAds: () => void
  onDeleteAll: () => void
}

export function PaidAdsRowMenu({
  target,
  position,
  actions,
}: {
  target: PaidAdsRowMenuTarget
  position: { top: number; left: number }
  actions: PaidAdsRowMenuActions
}) {
  const ref = useRef<HTMLDivElement>(null)
  const colorIconRowRef = useRef<HTMLDivElement>(null)
  const deleteRowRef = useRef<HTMLButtonElement>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [deleteSubOpen, setDeleteSubOpen] = useState(false)
  const [iconPickerOpen, setIconPickerOpen] = useState(false)
  const [menuPos, setMenuPos] = useState(position)
  const [subPos, setSubPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })

  const cancelClose = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }
  const scheduleClose = () => {
    cancelClose()
    closeTimerRef.current = setTimeout(() => setDeleteSubOpen(false), HOVER_CLOSE_DELAY_MS)
  }
  useEffect(() => () => cancelClose(), [])

  const { onClose } = actions

  useEffect(() => {
    const handlePointer = (e: PointerEvent) => {
      const t = e.target
      if (!(t instanceof Node)) return
      if (ref.current?.contains(t)) return
      if (t instanceof Element && t.closest('[data-paid-ads-row-menu]')) return
      if (t instanceof Element && t.closest('[data-icon-picker-popup]')) return
      onClose()
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (iconPickerOpen) {
        setIconPickerOpen(false)
        return
      }
      onClose()
    }
    document.addEventListener('pointerdown', handlePointer, true)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('pointerdown', handlePointer, true)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose, iconPickerOpen])

  useLayoutEffect(() => {
    const el = ref.current
    const width = el?.offsetWidth ?? 230
    const height = el?.offsetHeight ?? 320
    const margin = 8
    const vw = window.innerWidth
    const vh = window.innerHeight
    let left = position.left
    let top = position.top
    if (left + width + margin > vw) left = Math.max(margin, vw - width - margin)
    if (top + height + margin > vh) top = Math.max(margin, position.top - height)
    if (top < margin) top = margin
    setMenuPos({ top, left })
  }, [position, target, deleteSubOpen])

  useLayoutEffect(() => {
    if (!deleteSubOpen || !deleteRowRef.current) return
    const rect = deleteRowRef.current.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const pad = 8
    let left = rect.right + 4
    let top = rect.top
    if (left + SUBMENU_WIDTH > vw - pad) left = rect.left - SUBMENU_WIDTH - 4
    if (top + 100 > vh - pad) top = Math.max(pad, vh - 100 - pad)
    setSubPos({ top, left })
  }, [deleteSubOpen])

  if (typeof document === 'undefined') return null

  const isCampaign = target.kind === 'campaign'
  const data = target.data
  const metaId = isCampaign ? (data as AdCampaign).meta_campaign_id : (data as AdSet).meta_adset_id
  const onMeta = !!metaId
  const isActive = data.meta_effective_status === 'ACTIVE'
  const canOpenCanvas = !isCampaign && (target as { hasAds: boolean }).hasAds
  const iconPalette = getIconColor(target.iconColorId)

  const wrap = (handler: () => void) => () => {
    handler()
    onClose()
  }

  const renderRow = (icon: ReactNode, label: string, onClick: () => void, danger = false) => (
    <button type="button" className={danger ? DANGER_ROW_CLS : ROW_CLS} onClick={wrap(onClick)}>
      {icon}
      <span>{label}</span>
    </button>
  )

  return createPortal(
    <>
      <div
        ref={ref}
        data-paid-ads-row-menu
        className="dropdown-menu-solid fixed w-[230px] overflow-visible rounded-xl py-1 shadow-lg"
        style={{ top: menuPos.top, left: menuPos.left, zIndex: 100001 }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="px-spacing-2 pb-spacing-1">
          <div className="border-border overflow-hidden rounded-md border">
            <div className="divide-border flex w-full divide-x">
              <button type="button" onClick={wrap(actions.onCopyLink)} className={QUICK_CELL_CLS}>
                Copy link
              </button>
              <button type="button" onClick={wrap(actions.onCopyId)} className={QUICK_CELL_CLS}>
                Copy ID
              </button>
              <button
                type="button"
                onClick={wrap(actions.onOpenInNewTab)}
                className={QUICK_CELL_CLS}
              >
                New tab
              </button>
            </div>
          </div>
        </div>

        <Divider />
        {renderRow(<Edit3 className={ROW_ICON_CLS} />, 'Rename', actions.onStartRename)}
        <div
          ref={colorIconRowRef}
          data-paid-ads-icon-picker-row
          className={ROW_CLS}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <IconPicker
            value={target.iconName}
            color={target.iconColorId}
            size="sm"
            className="w-full"
            triggerFullWidth
            placement="right"
            closeOnSelect={false}
            positionAnchorRef={colorIconRowRef}
            outsideClickIgnoreSelector="[data-paid-ads-row-menu]"
            popupZIndexClass="z-[100003]"
            open={iconPickerOpen}
            onOpenChange={setIconPickerOpen}
            onChange={(name) => actions.onPatchIcon({ icon: name })}
            onColorChange={(colorId) => actions.onPatchIcon({ icon_color: colorId })}
            customTrigger={
              <span className="flex w-full items-center gap-2">
                <Palette className={ROW_ICON_CLS} />
                <span className="min-w-0 flex-1 truncate text-left">Color &amp; Icon</span>
                <LucideIcon
                  name={target.iconName}
                  className={`h-3.5 w-3.5 shrink-0 ${iconPalette.textColor}`}
                />
              </span>
            }
          />
        </div>
        {renderRow(<Copy className={ROW_ICON_CLS} />, 'Duplicate', actions.onDuplicate)}
        {isCampaign && actions.onAddAdSet
          ? renderRow(<Plus className={ROW_ICON_CLS} />, 'Add ad set', actions.onAddAdSet)
          : null}
        {!isCampaign && canOpenCanvas && actions.onOpenCanvas
          ? renderRow(<LayoutGrid className={ROW_ICON_CLS} />, 'Open canvas', actions.onOpenCanvas)
          : null}

        {onMeta ? (
          <>
            <Divider />
            {isActive
              ? renderRow(
                  <Pause className={ROW_ICON_CLS} />,
                  'Pause on Meta',
                  actions.onPauseOnMeta,
                )
              : renderRow(
                  <Play className={ROW_ICON_CLS} />,
                  'Activate on Meta',
                  actions.onActivateOnMeta,
                )}
            {renderRow(
              <RefreshCw className={ROW_ICON_CLS} />,
              'Refresh Meta status',
              actions.onRefreshMetaStatus,
            )}
            <Divider />
            <button type="button" className={ROW_CLS} onClick={wrap(actions.onOpenInMeta)}>
              <ExternalLink className={ROW_ICON_CLS} />
              <span>Open in Meta Ads Manager</span>
            </button>
            {renderRow(<Hash className={ROW_ICON_CLS} />, 'Copy Meta ID', actions.onCopyMetaId)}
          </>
        ) : null}

        <Divider />
        <button
          ref={deleteRowRef}
          type="button"
          onMouseEnter={() => {
            cancelClose()
            setDeleteSubOpen(true)
          }}
          onMouseLeave={scheduleClose}
          onFocus={() => {
            cancelClose()
            setDeleteSubOpen(true)
          }}
          onClick={() => setDeleteSubOpen((v) => !v)}
          className={DANGER_ROW_CLS}
          aria-haspopup="menu"
          aria-expanded={deleteSubOpen}
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span className="flex-1">Delete</span>
          <ChevronRight className="h-3 w-3 shrink-0" />
        </button>
      </div>

      {deleteSubOpen ? (
        <div
          data-paid-ads-row-menu
          className="dropdown-menu-solid fixed w-[220px] overflow-hidden rounded-xl py-1 shadow-lg"
          style={{ top: subPos.top, left: subPos.left, zIndex: 100002 }}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          <button type="button" className={DANGER_ROW_CLS} onClick={wrap(actions.onDeleteKeepAds)}>
            <Trash2 className="h-3.5 w-3.5" />
            <span>Keep ads</span>
          </button>
          <button type="button" className={DANGER_ROW_CLS} onClick={wrap(actions.onDeleteAll)}>
            <Trash2 className="h-3.5 w-3.5" />
            <span>{isCampaign ? 'Delete with all ad sets and ads' : 'Delete with all ads'}</span>
          </button>
        </div>
      ) : null}
    </>,
    document.body,
  )
}
