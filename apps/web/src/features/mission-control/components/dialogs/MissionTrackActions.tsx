'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Plus } from 'lucide-react'
import {
  listMissionExtendOptions,
  useQuickMissionsLauncher,
  type MissionTrackActionId,
} from '@/lib/missions'
import { MISSION_CONTROL_MESSAGES } from '../../config/messages.config'
import type { Mission, MissionSubtask } from '../../types'

const MENU_WIDTH = 280
const MENU_HEIGHT = 360

interface MissionTrackActionsProps {
  mission: Mission
  subtasks: MissionSubtask[]
  onExtend: (action: MissionTrackActionId) => Promise<void>
}

export function MissionTrackActions({ mission, subtasks, onExtend }: MissionTrackActionsProps) {
  const options = listMissionExtendOptions(mission, subtasks)
  const { openLauncher } = useQuickMissionsLauncher()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [busyAction, setBusyAction] = useState<MissionTrackActionId | null>(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const continueOptions = options.filter((option) => option.kind === 'continue')
  const playbookOptions = options.filter((option) => option.kind === 'playbook')

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const left = Math.min(Math.max(8, rect.left), window.innerWidth - MENU_WIDTH - 8)
    const top =
      rect.bottom + 4 + MENU_HEIGHT > window.innerHeight
        ? Math.max(8, rect.top - MENU_HEIGHT)
        : rect.bottom + 4
    setPos({ top, left })
  }, [open])

  if (options.length === 0) return null

  return (
    <div className="px-spacing-1 py-spacing-2">
      <button
        ref={triggerRef}
        type="button"
        disabled={busyAction !== null}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((current) => !current)}
        className="body-3 text-primary hover:bg-hover-subtle gap-spacing-2 px-spacing-2 py-spacing-1-5 flex w-full items-center rounded-lg text-left transition-colors disabled:opacity-50"
      >
        <Plus className="icon-sm text-primary shrink-0" />
        {busyAction
          ? MISSION_CONTROL_MESSAGES.TRACK_QUEUING
          : MISSION_CONTROL_MESSAGES.TRACK_EXTEND}
      </button>
      {open && typeof document !== 'undefined'
        ? createPortal(
            <>
              <div className="z-dropdown fixed inset-0" onClick={() => setOpen(false)} />
              <div
                className="dropdown-menu-solid z-dropdown py-spacing-1 fixed w-[280px] overflow-hidden rounded-xl"
                data-mission-extend-menu
                role="menu"
                style={{ top: pos.top, left: pos.left }}
              >
                {continueOptions.length > 0 ? (
                  <>
                    <p className="px-spacing-3 py-spacing-1 typo-section-label text-muted-foreground">
                      {MISSION_CONTROL_MESSAGES.TRACK_CONTINUE_SECTION}
                    </p>
                    {continueOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        role="menuitem"
                        disabled={busyAction !== null}
                        onClick={() => {
                          setOpen(false)
                          void (async () => {
                            setBusyAction(option.id)
                            try {
                              await onExtend(option.id)
                            } finally {
                              setBusyAction(null)
                            }
                          })()
                        }}
                        className="gap-spacing-1 px-spacing-3 py-spacing-1-5 hover:bg-hover-subtle flex w-full flex-col items-start text-left disabled:opacity-50"
                      >
                        <span className="body-3 text-foreground">{option.title}</span>
                        <span className="typo-caption text-muted-foreground">
                          {option.description}
                        </span>
                      </button>
                    ))}
                    <div className="my-spacing-1 bg-border h-px" />
                  </>
                ) : null}
                {playbookOptions.length > 0 ? (
                  <>
                    <p className="px-spacing-3 py-spacing-1 typo-section-label text-muted-foreground">
                      {MISSION_CONTROL_MESSAGES.TRACK_PLAYBOOKS_SECTION}
                    </p>
                    {playbookOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setOpen(false)
                          openLauncher(option.id, {
                            spaceId: mission.space_id,
                            parentMissionId: mission.id,
                          })
                        }}
                        className="gap-spacing-1 px-spacing-3 py-spacing-1-5 hover:bg-hover-subtle flex w-full flex-col items-start text-left"
                      >
                        <span className="body-3 text-foreground">{option.title}</span>
                        <span className="typo-caption text-muted-foreground">
                          {option.description}
                        </span>
                      </button>
                    ))}
                  </>
                ) : null}
              </div>
            </>,
            document.body,
          )
        : null}
    </div>
  )
}
