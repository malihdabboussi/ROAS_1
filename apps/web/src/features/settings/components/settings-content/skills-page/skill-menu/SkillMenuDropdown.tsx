'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ChevronRight,
  Copy,
  Download,
  Edit2,
  FileCode,
  FileText,
  FolderInput,
  Power,
  PowerOff,
  Trash2,
} from 'lucide-react'
import type { MissionAgent, MissionAgentSkill } from '@/features/mission-control/types'
import { OtherAgentsSubmenuList } from './OtherAgentsSubmenuList'
import type { SkillMenuActionsContext } from './skill-menu.types'
import { useSkillMenuActions } from './use-skill-menu-actions'

const HOVER_CLOSE_DELAY_MS = 140
const SUBMENU_WIDTH = 220

type SubmenuKind = 'export' | 'copy' | 'move' | null

export function SkillMenuDropdown({
  skill,
  agents,
  pointerPosition,
  onClose,
  onSelectSkill,
  onToggleEnabled,
  onSkillsChanged,
  onRequestDelete,
}: {
  skill: MissionAgentSkill
  agents: MissionAgent[]
  pointerPosition: { x: number; y: number }
  onClose: () => void
} & SkillMenuActionsContext) {
  const dropdownRef = useRef<HTMLDivElement>(null)
  const exportButtonRef = useRef<HTMLButtonElement>(null)
  const copyButtonRef = useRef<HTMLButtonElement>(null)
  const moveButtonRef = useRef<HTMLButtonElement>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [openSubmenu, setOpenSubmenu] = useState<SubmenuKind>(null)
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: -9999, left: -9999 })
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

  const actions = useSkillMenuActions({
    skill,
    agents,
    skillsViewKey: 'all',
    onSelectSkill,
    onToggleEnabled,
    onSkillsChanged,
    onRequestDelete,
  })

  useLayoutEffect(() => {
    if (!dropdownRef.current) return
    const dropRect = dropdownRef.current.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const pad = 8
    let top = pointerPosition.y
    let left = pointerPosition.x + dropRect.width
    if (top + dropRect.height > vh - pad) top = Math.max(pad, vh - dropRect.height - pad)
    if (top < pad) top = pad
    if (left > vw - pad) left = vw - pad
    if (left - dropRect.width < pad) left = pad + dropRect.width
    setPos({ top, left })
  }, [pointerPosition])

  useLayoutEffect(() => {
    const anchor =
      openSubmenu === 'export'
        ? exportButtonRef.current
        : openSubmenu === 'copy'
          ? copyButtonRef.current
          : openSubmenu === 'move'
            ? moveButtonRef.current
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
      if (!target.closest('[data-skill-menu]')) onClose()
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
  }, [onClose])

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

  return createPortal(
    <>
      <div
        data-skill-menu
        ref={dropdownRef}
        className="z-dropdown rounded-spacing-2 border-border surface-card p-spacing-2 fixed min-w-56 border shadow-lg"
        style={{ top: pos.top, left: pos.left, transform: 'translateX(-100%)' }}
      >
        <div className="border-border mb-spacing-2 overflow-hidden rounded-md border">
          <div className="divide-border flex w-full divide-x">
            <button type="button" onClick={wrap(actions.copyKey)} className={quickCellCls}>
              Copy key
            </button>
            <button type="button" onClick={wrap(actions.copyId)} className={quickCellCls}>
              Copy ID
            </button>
            <button type="button" onClick={wrap(actions.openSkill)} className={quickCellCls}>
              Open skill
            </button>
          </div>
        </div>

        <div className="gap-spacing-1 px-spacing-1 flex flex-col">
          {actions.canWrite ? (
            <>
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
                  setOpenSubmenu('export')
                }}
                onMouseLeave={scheduleClose}
                onFocus={() => {
                  cancelClose()
                  setOpenSubmenu('export')
                }}
                onClick={() => setOpenSubmenu((s) => (s === 'export' ? null : 'export'))}
                className={itemCls}
                aria-haspopup="menu"
                aria-expanded={openSubmenu === 'export'}
              >
                <Download className={itemIcon} />
                <span className="flex-1">Export</span>
                <ChevronRight className="h-3 w-3 shrink-0" />
              </button>

              <div className="border-border border-t" />

              <button
                ref={copyButtonRef}
                type="button"
                onMouseEnter={() => {
                  cancelClose()
                  if (actions.canTransfer) setOpenSubmenu('copy')
                }}
                onMouseLeave={scheduleClose}
                onFocus={() => {
                  cancelClose()
                  if (actions.canTransfer) setOpenSubmenu('copy')
                }}
                onClick={() => setOpenSubmenu((s) => (s === 'copy' ? null : 'copy'))}
                className={itemCls}
                disabled={!actions.canTransfer}
                aria-haspopup="menu"
                aria-expanded={openSubmenu === 'copy'}
              >
                <Copy className={itemIcon} />
                <span className="flex-1">Copy to agent</span>
                <ChevronRight className="h-3 w-3 shrink-0" />
              </button>
              <button
                ref={moveButtonRef}
                type="button"
                onMouseEnter={() => {
                  cancelClose()
                  if (actions.canTransfer) setOpenSubmenu('move')
                }}
                onMouseLeave={scheduleClose}
                onFocus={() => {
                  cancelClose()
                  if (actions.canTransfer) setOpenSubmenu('move')
                }}
                onClick={() => setOpenSubmenu((s) => (s === 'move' ? null : 'move'))}
                className={itemCls}
                disabled={!actions.canTransfer}
                aria-haspopup="menu"
                aria-expanded={openSubmenu === 'move'}
              >
                <FolderInput className={itemIcon} />
                <span className="flex-1">Move to agent</span>
                <ChevronRight className="h-3 w-3 shrink-0" />
              </button>

              <div className="border-border border-t" />

              {actions.isEnabled ? (
                <button
                  type="button"
                  onClick={wrap(() => actions.toggleEnabled(false))}
                  className={itemCls}
                >
                  <PowerOff className={itemIcon} />
                  <span>Disable skill</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={wrap(() => actions.toggleEnabled(true))}
                  className={itemCls}
                >
                  <Power className={itemIcon} />
                  <span>Enable skill</span>
                </button>
              )}

              <div className="border-border border-t" />

              <button
                type="button"
                onClick={() => {
                  setOpenSubmenu(null)
                  cancelClose()
                  actions.requestDelete()
                  close()
                }}
                className="gap-spacing-2 body-3 rounded-spacing-2 px-spacing-2 py-spacing-1 flex w-full items-center text-left text-red-600 transition-colors hover:bg-red-500/10 [&_svg]:text-red-600"
              >
                <Trash2 className={itemIcon} />
                <span>Delete</span>
              </button>
            </>
          ) : null}
        </div>
      </div>

      {openSubmenu ? (
        <div
          data-skill-menu
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
          {openSubmenu === 'export' ? (
            <>
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
                  actions.exportJson()
                  close()
                }}
                className={submenuRowCls}
              >
                <FileText className={itemIcon} />
                <span>JSON</span>
              </button>
            </>
          ) : (
            <OtherAgentsSubmenuList
              agents={actions.writableTargetAgents}
              sourceAgentKey={skill.agent_key}
              rowClassName={submenuRowCls}
              onPick={(agentKey) => {
                if (openSubmenu === 'move') void actions.moveToAgent(agentKey)
                else void actions.copyToAgent(agentKey)
                close()
              }}
            />
          )}
        </div>
      ) : null}
    </>,
    document.body,
  )
}
