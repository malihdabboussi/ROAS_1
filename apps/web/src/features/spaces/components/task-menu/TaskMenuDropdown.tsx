'use client'

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import {
  Bot,
  CheckCircle2,
  ChevronRight,
  Copy,
  ExternalLink,
  FolderInput,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react'
import type { TeamRosterEntry } from '@/lib/team/team-roster-api'
import { useOtherSpacesByCampaign } from '../../hooks/use-other-spaces-by-campaign'
import { useSpacesStore } from '../../store/use-spaces-store'
import type { FieldDef } from '../../types/space-schema'
import { OtherSpacesSubmenuList } from '../OtherSpacesSubmenuList'
import { SendTaskToAgentModal } from '../task-detail/SendTaskToAgentModal'
import { TaskDuplicateModal } from './TaskDuplicateModal'
import { useTaskMenuActions, type UseTaskMenuActionsArgs } from './use-task-menu-actions'

const HOVER_CLOSE_DELAY_MS = 140
const SUBMENU_WIDTH = 240

type SubmenuKind = 'move' | 'copy' | null

export interface TaskMenuDropdownProps {
  task: UseTaskMenuActionsArgs['task']
  /** Anchor element when triggered from a button. */
  anchorRef?: RefObject<HTMLElement | null>
  /** Position the menu at this viewport coordinate (right-click). */
  pointerPosition?: { x: number; y: number } | null
  onClose: () => void
  /** Re-fetch / re-render after a mutation. */
  onChanged?: UseTaskMenuActionsArgs['onChanged']
  /** Open the full task detail modal. */
  onOpenDetail?: UseTaskMenuActionsArgs['onOpenDetail']
  /** Trigger the row's "add subtask" composer. */
  onAddSubtask?: UseTaskMenuActionsArgs['onAddSubtask']
  subtaskCount?: number
  /** Confirm + delete (parent owns confirm UI). */
  onDelete?: UseTaskMenuActionsArgs['onDelete']
  /** Opens send-to-agent modal in parent (e.g. task detail modal). */
  onSendToAgent?: () => void
  roster?: TeamRosterEntry[]
  allFields?: FieldDef[]
}

export function TaskMenuDropdown({
  task,
  anchorRef,
  pointerPosition,
  onClose,
  onChanged,
  onOpenDetail,
  onAddSubtask,
  subtaskCount,
  onDelete,
  onSendToAgent,
  roster,
  allFields,
}: TaskMenuDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null)
  const moveButtonRef = useRef<HTMLButtonElement>(null)
  const copyButtonRef = useRef<HTMLButtonElement>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [openSubmenu, setOpenSubmenu] = useState<SubmenuKind>(null)
  const [duplicateOpen, setDuplicateOpen] = useState(false)
  const [sendToAgentOpen, setSendToAgentOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: -9999, left: -9999 })
  const [subPos, setSubPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })

  const campaignId = useSpacesStore((s) => {
    const space = s.spaces.find((sp) => sp.id === task.space_id)
    return typeof space?.campaign_id === 'string' ? space.campaign_id : null
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

  const actions = useTaskMenuActions({
    task,
    onChanged,
    onOpenDetail,
    onAddSubtask,
    onDelete,
  })
  const { groups: otherSpaceGroups, totalCount: otherSpacesCount } = useOtherSpacesByCampaign(
    task.space_id,
  )

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
      if (duplicateOpen) return
      const target = e.target as HTMLElement
      if (!target.closest('[data-task-menu]') && !anchorRef?.current?.contains(target)) {
        onClose()
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (duplicateOpen) return
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKey)
    }
  }, [duplicateOpen, onClose, anchorRef])

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

  const hasOtherSpaces = otherSpacesCount > 0
  const spaceSubmenuOpen = openSubmenu === 'move' || openSubmenu === 'copy'

  const dismissDuplicateFlow = () => {
    setDuplicateOpen(false)
    onClose()
  }

  return createPortal(
    <>
      {!duplicateOpen ? (
        <div
          data-task-menu
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
            {onOpenDetail ? (
              <button type="button" onClick={wrap(actions.openDetail)} className={itemCls}>
                <ExternalLink className={itemIcon} />
                <span>Open task</span>
              </button>
            ) : null}
            {onAddSubtask ? (
              <button type="button" onClick={wrap(actions.addSubtask)} className={itemCls}>
                <Plus className={itemIcon} />
                <span>Add subtask</span>
              </button>
            ) : null}

            <div className="border-border border-t" />

            <button type="button" onClick={wrap(actions.toggleDone)} className={itemCls}>
              {actions.isDone ? (
                <RotateCcw className={itemIcon} />
              ) : (
                <CheckCircle2 className={itemIcon} />
              )}
              <span>{actions.isDone ? 'Reopen task' : 'Mark as done'}</span>
            </button>
            <button
              type="button"
              onClick={wrap(() => {
                if (onSendToAgent) {
                  onSendToAgent()
                } else if (roster && allFields) {
                  setSendToAgentOpen(true)
                }
              })}
              className={itemCls}
            >
              <Bot className={itemIcon} />
              <span>Send to agent</span>
            </button>

            <div className="border-border border-t" />

            <button
              type="button"
              onClick={() => {
                setOpenSubmenu(null)
                cancelClose()
                setDuplicateOpen(true)
              }}
              className={itemCls}
            >
              <Copy className={itemIcon} />
              <span>Duplicate</span>
            </button>
            <button
              ref={copyButtonRef}
              type="button"
              onMouseEnter={() => {
                cancelClose()
                if (hasOtherSpaces) setOpenSubmenu('copy')
              }}
              onMouseLeave={scheduleClose}
              onFocus={() => {
                cancelClose()
                if (hasOtherSpaces) setOpenSubmenu('copy')
              }}
              onClick={() => setOpenSubmenu((s) => (s === 'copy' ? null : 'copy'))}
              className={itemCls}
              disabled={!hasOtherSpaces}
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
                if (hasOtherSpaces) setOpenSubmenu('move')
              }}
              onMouseLeave={scheduleClose}
              onFocus={() => {
                cancelClose()
                if (hasOtherSpaces) setOpenSubmenu('move')
              }}
              onClick={() => setOpenSubmenu((s) => (s === 'move' ? null : 'move'))}
              className={itemCls}
              disabled={!hasOtherSpaces}
              aria-haspopup="menu"
              aria-expanded={openSubmenu === 'move'}
            >
              <FolderInput className={itemIcon} />
              <span className="flex-1">Move to space</span>
              <ChevronRight className="h-3 w-3 shrink-0" />
            </button>

            {onDelete ? (
              <>
                <div className="border-border border-t" />
                <button
                  type="button"
                  onClick={wrap(actions.deleteTask)}
                  className="gap-spacing-2 body-3 rounded-spacing-2 px-spacing-2 py-spacing-1 text-destructive [&_svg]:text-destructive flex w-full items-center text-left transition-colors hover:bg-red-500/10"
                >
                  <Trash2 className={itemIcon} />
                  <span>Delete</span>
                </button>
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      {!duplicateOpen && openSubmenu ? (
        <div
          data-task-menu
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
          className="z-dropdown rounded-spacing-2 border-border surface-card py-spacing-2 px-spacing-3 gap-spacing-1 fixed flex flex-col overflow-y-auto border shadow-lg"
          style={{
            top: subPos.top,
            left: subPos.left,
            width: SUBMENU_WIDTH,
            maxHeight: `calc(100vh - ${subPos.top + 8}px)`,
          }}
        >
          <OtherSpacesSubmenuList
            groups={otherSpaceGroups}
            sourceCampaignId={campaignId}
            menuOpen={spaceSubmenuOpen}
            rowClassName={submenuRowCls}
            iconClassName={itemIcon}
            onPick={(spaceId) => {
              if (openSubmenu === 'move') void actions.moveToSpace(spaceId)
              else void actions.copyToSpace(spaceId)
              close()
            }}
          />
        </div>
      ) : null}
      <TaskDuplicateModal
        open={duplicateOpen}
        task={task}
        subtaskCount={subtaskCount}
        onClose={dismissDuplicateFlow}
        onSubmit={async (payload) => {
          await actions.duplicate(payload)
        }}
      />
      {roster && allFields ? (
        <SendTaskToAgentModal
          open={sendToAgentOpen}
          onClose={() => setSendToAgentOpen(false)}
          spaceItem={task}
          roster={roster}
          allFields={allFields}
          campaignId={campaignId}
          onSent={() => {
            setSendToAgentOpen(false)
            onChanged?.()
          }}
        />
      ) : null}
    </>,
    document.body,
  )
}
