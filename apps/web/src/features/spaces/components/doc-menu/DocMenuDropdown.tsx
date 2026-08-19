'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import {
  Bot,
  ChevronRight,
  Copy,
  Download,
  Edit2,
  FileCode,
  FileText,
  FolderInput,
  FolderMinus,
  Fullscreen,
  Palette,
  Share2,
  Trash2,
} from 'lucide-react'
import { ConfirmDialog } from '@/features/settings/components/settings-content/ConfirmDialog'
import { useOtherSpacesByCampaign } from '../../hooks/use-other-spaces-by-campaign'
import { useSpacesStore } from '../../store/use-spaces-store'
import { OtherSpacesSubmenuList } from '../OtherSpacesSubmenuList'
import {
  useDocMenuActions,
  type DocMenuTarget,
  type UseDocMenuActionsArgs,
} from './use-doc-menu-actions'
import { useDocMenuDropdownPosition } from './use-doc-menu-dropdown-position'

const HOVER_CLOSE_DELAY_MS = 140

type SubmenuKind = 'move' | 'copy' | 'export' | null

export interface DocMenuDropdownProps {
  doc: DocMenuTarget
  campaignId?: string | null
  anchorRef?: RefObject<HTMLElement | null>
  pointerPosition?: { x: number; y: number } | null
  onClose: () => void
  onChanged?: UseDocMenuActionsArgs['onChanged']
  onOpenDoc?: UseDocMenuActionsArgs['onOpenDoc']
  onShare?: () => void
  onDelete?: UseDocMenuActionsArgs['onDelete']
}

export function DocMenuDropdown({
  doc,
  campaignId,
  anchorRef,
  pointerPosition,
  onClose,
  onChanged,
  onOpenDoc,
  onShare,
  onDelete,
}: DocMenuDropdownProps) {
  const moveButtonRef = useRef<HTMLButtonElement>(null)
  const copyButtonRef = useRef<HTMLButtonElement>(null)
  const exportButtonRef = useRef<HTMLButtonElement>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [openSubmenu, setOpenSubmenu] = useState<SubmenuKind>(null)
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false)
  const [removing, setRemoving] = useState(false)

  const { dropdownRef, pos, subPos, submenuWidth } = useDocMenuDropdownPosition({
    anchorRef,
    pointerPosition,
    openSubmenu,
    moveButtonRef,
    copyButtonRef,
    exportButtonRef,
  })

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

  const actions = useDocMenuActions({ doc, campaignId, onChanged, onOpenDoc, onDelete })
  const sourceCampaignId = useSpacesStore((s) => {
    const space = s.spaces.find((sp) => sp.id === doc.space_id)
    return typeof space?.campaign_id === 'string' ? space.campaign_id : null
  })
  const { groups: otherSpaceGroups, totalCount: otherSpacesCount } = useOtherSpacesByCampaign(
    doc.space_id,
  )

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (removeConfirmOpen) return
      const target = e.target as HTMLElement
      if (!target.closest('[data-doc-menu]') && !anchorRef?.current?.contains(target)) onClose()
    }
    const handleKey = (e: KeyboardEvent) => {
      if (removeConfirmOpen) return
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose, anchorRef, removeConfirmOpen])

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
  const submenuRowCls =
    'gap-spacing-2 body-3 rounded-spacing-2 text-muted-foreground hover:bg-[var(--color-hover-subtle)] hover:text-foreground px-spacing-2 py-spacing-1 flex w-full items-center text-left transition-colors'
  const quickCellCls =
    'body-3 text-muted-foreground hover:bg-[var(--color-hover-subtle)] hover:text-foreground flex min-h-7 min-w-0 flex-1 items-center justify-center truncate rounded-none px-2 text-center transition-colors'

  const canTransfer = otherSpacesCount > 0 && !actions.isSyntheticDoc
  const spaceSubmenuOpen = openSubmenu === 'move' || openSubmenu === 'copy'

  return createPortal(
    <>
      <div
        data-doc-menu
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
          {onOpenDoc ? (
            <button type="button" onClick={wrap(actions.openDoc)} className={itemCls}>
              <Fullscreen className={itemIcon} />
              <span>Open full mode</span>
            </button>
          ) : null}
          <button type="button" onClick={wrap(actions.rename)} className={itemCls}>
            <Edit2 className={itemIcon} />
            <span>Rename</span>
          </button>
          <button type="button" onClick={wrap(actions.duplicate)} className={itemCls}>
            <Copy className={itemIcon} />
            <span>Duplicate</span>
          </button>

          <button
            ref={exportButtonRef}
            type="button"
            onMouseEnter={() => {
              cancelClose()
              if (actions.canExport) setOpenSubmenu('export')
            }}
            onMouseLeave={scheduleClose}
            onFocus={() => {
              cancelClose()
              if (actions.canExport) setOpenSubmenu('export')
            }}
            onClick={() => setOpenSubmenu((s) => (s === 'export' ? null : 'export'))}
            className={itemCls}
            disabled={!actions.canExport}
            aria-haspopup="menu"
            aria-expanded={openSubmenu === 'export'}
          >
            <Download className={itemIcon} />
            <span className="flex-1">Export</span>
            <ChevronRight className="h-3 w-3 shrink-0" />
          </button>

          <div className="border-border border-t" />

          <button type="button" onClick={wrap(actions.sendToAgent)} className={itemCls}>
            <Bot className={itemIcon} />
            <span>Send to agent</span>
          </button>

          <div className="border-border border-t" />

          <button
            ref={copyButtonRef}
            type="button"
            onMouseEnter={() => {
              cancelClose()
              if (canTransfer) setOpenSubmenu('copy')
            }}
            onMouseLeave={scheduleClose}
            onFocus={() => {
              cancelClose()
              if (canTransfer) setOpenSubmenu('copy')
            }}
            onClick={() => setOpenSubmenu((s) => (s === 'copy' ? null : 'copy'))}
            className={itemCls}
            disabled={!canTransfer}
            aria-haspopup="menu"
            aria-expanded={openSubmenu === 'copy'}
          >
            <Copy className={itemIcon} />
            <span className="flex-1">Copy to space</span>
            <ChevronRight className="h-3 w-3 shrink-0" />
          </button>
          <button
            ref={moveButtonRef}
            type="button"
            onMouseEnter={() => {
              cancelClose()
              if (canTransfer) setOpenSubmenu('move')
            }}
            onMouseLeave={scheduleClose}
            onFocus={() => {
              cancelClose()
              if (canTransfer) setOpenSubmenu('move')
            }}
            onClick={() => setOpenSubmenu((s) => (s === 'move' ? null : 'move'))}
            className={itemCls}
            disabled={!canTransfer}
            aria-haspopup="menu"
            aria-expanded={openSubmenu === 'move'}
          >
            <FolderInput className={itemIcon} />
            <span className="flex-1">Move to space</span>
            <ChevronRight className="h-3 w-3 shrink-0" />
          </button>

          {actions.canRemoveFromSpace ? (
            <button
              type="button"
              onClick={() => {
                setOpenSubmenu(null)
                cancelClose()
                setRemoveConfirmOpen(true)
              }}
              className={itemCls}
            >
              <FolderMinus className={itemIcon} />
              <span>Remove from space</span>
            </button>
          ) : null}

          {onDelete ? (
            <>
              <div className="border-border border-t" />
              <button
                type="button"
                onClick={wrap(actions.deleteDoc)}
                className="gap-spacing-2 body-3 rounded-spacing-2 px-spacing-2 py-spacing-1 text-destructive [&_svg]:text-destructive flex w-full items-center text-left transition-colors hover:bg-red-500/10"
              >
                <Trash2 className={itemIcon} />
                <span>Delete</span>
              </button>
            </>
          ) : null}

          {onShare ? (
            <>
              <div className="border-border border-t" />
              <button
                type="button"
                onClick={wrap(onShare)}
                className="button-glass-blue body-3 gap-spacing-2 px-spacing-3 py-spacing-1 flex w-full items-center justify-center rounded-md font-medium"
              >
                <Share2 className="relative z-10 h-3.5 w-3.5 shrink-0" />
                <span className="relative z-10">Share</span>
              </button>
            </>
          ) : null}
        </div>
      </div>

      {openSubmenu ? (
        <div
          data-doc-menu
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
          className="z-dropdown rounded-spacing-2 border-border surface-card py-spacing-2 px-spacing-3 gap-spacing-1 fixed flex flex-col overflow-y-auto border shadow-lg"
          style={{
            top: subPos.top,
            left: subPos.left,
            width: submenuWidth,
            maxHeight: `calc(100vh - ${subPos.top + 8}px)`,
          }}
        >
          {openSubmenu === 'export' ? (
            <>
              <button
                type="button"
                onClick={() => {
                  void actions.openInCanva()
                  close()
                }}
                disabled={actions.openingCanva}
                className={submenuRowCls}
              >
                <Palette className={itemIcon} />
                <span>{actions.openingCanva ? 'Opening Canva…' : 'Open in Canva'}</span>
              </button>
              {actions.canExportDocBody ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      void actions.exportPdf()
                      close()
                    }}
                    disabled={actions.exportingPdf}
                    className={submenuRowCls}
                  >
                    <FileText className={itemIcon} />
                    <span>{actions.exportingPdf ? 'Exporting…' : 'PDF'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      actions.exportMarkdown()
                      close()
                    }}
                    className={submenuRowCls}
                  >
                    <FileCode className={itemIcon} />
                    <span>Markdown</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      actions.exportHtml()
                      close()
                    }}
                    className={submenuRowCls}
                  >
                    <FileText className={itemIcon} />
                    <span>HTML</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void actions.exportDocx()
                      close()
                    }}
                    disabled={actions.exportingDocx}
                    className={submenuRowCls}
                  >
                    <FileText className={itemIcon} />
                    <span>{actions.exportingDocx ? 'Exporting…' : 'DOCX'}</span>
                  </button>
                </>
              ) : null}
              {actions.hasVisualHtml ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      void actions.exportVisualPdf()
                      close()
                    }}
                    disabled={actions.exportingVisualPdf}
                    className={submenuRowCls}
                  >
                    <FileText className={itemIcon} />
                    <span>{actions.exportingVisualPdf ? 'Exporting…' : 'Visual PDF'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      actions.exportVisualHtml()
                      close()
                    }}
                    className={submenuRowCls}
                  >
                    <FileCode className={itemIcon} />
                    <span>Visual HTML</span>
                  </button>
                </>
              ) : null}
              {!actions.canExportDocBody && !actions.hasVisualHtml ? (
                <p className="px-spacing-2 py-spacing-1 body-3 text-muted-foreground/70">
                  Nothing to export
                </p>
              ) : null}
            </>
          ) : (
            <OtherSpacesSubmenuList
              groups={otherSpaceGroups}
              sourceCampaignId={sourceCampaignId}
              menuOpen={spaceSubmenuOpen}
              rowClassName={submenuRowCls}
              iconClassName={itemIcon}
              onPick={(spaceId) => {
                if (openSubmenu === 'move') void actions.moveToSpace(spaceId)
                else void actions.copyToSpace(spaceId)
                close()
              }}
            />
          )}
        </div>
      ) : null}

      <ConfirmDialog
        open={removeConfirmOpen}
        onOpenChange={(open) => {
          if (!open && !removing) setRemoveConfirmOpen(false)
        }}
        title="Remove from space?"
        description={`"${doc.title || 'Untitled'}" will be removed from this space and kept in your General workspace.`}
        confirmText="Remove"
        confirmDisabled={removing}
        confirmingText="Removing..."
        onConfirm={async () => {
          setRemoving(true)
          try {
            await actions.removeFromSpace()
            setRemoveConfirmOpen(false)
            close()
          } finally {
            setRemoving(false)
          }
        }}
      />
    </>,
    document.body,
  )
}
