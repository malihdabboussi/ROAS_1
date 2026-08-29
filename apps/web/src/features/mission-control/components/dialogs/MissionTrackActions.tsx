'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Plus } from 'lucide-react'
import { useShellStore } from '@/components/shell/use-shell-store'
import { useChatStore } from '@/features/studio/store/use-chat-store'
import {
  listMissionExtendOptions,
  useQuickMissionsLauncher,
  type MissionTrackActionId,
} from '@/lib/missions'
import { MISSION_CONTROL_MESSAGES } from '../../config/messages.config'
import type { Mission, MissionSubtask } from '../../types'

const MENU_WIDTH = 280
const MENU_HEIGHT = 384

const CHAT_ACTIONS = [
  {
    id: 'continue',
    title: 'Continue this mission',
    description: 'Review where it stopped and choose the next safe action.',
    prompt: (missionId: string) =>
      `Continue mission ${missionId}. Review its current state, explain the next action, and get my brief confirmation before extending or changing the mission.`,
  },
  {
    id: 'extend',
    title: 'Extend this mission',
    description: 'Add a step here or continue through a linked Mission.',
    prompt: (missionId: string) =>
      `Extend mission ${missionId}. Show me its current outcome and steps, then ask whether I want to add a step to this Mission or start a linked child Mission. Explain the exact impact and get my confirmation before creating anything.`,
  },
  {
    id: 'retry-step',
    title: 'Retry from a step',
    description: 'Choose a step to rerun with its downstream work reset safely.',
    prompt: (missionId: string) =>
      `Retry mission ${missionId} from a step. Show me the eligible steps, explain which downstream work will be reset, and get my confirmation before retrying.`,
  },
  {
    id: 'restart-stage',
    title: 'Restart from a stage',
    description: 'Return to an earlier stage and safely reset downstream work.',
    prompt: (missionId: string) =>
      `Restart mission ${missionId} from a stage. Show me the eligible stages and explain exactly which downstream steps and deliverables will remain or reset. Get my confirmation before restarting anything.`,
  },
  {
    id: 'skip-remove',
    title: 'Skip or remove a step',
    description: 'See dependent work before taking a step off the track.',
    prompt: (missionId: string) =>
      `Skip or remove a step from mission ${missionId}. Show me the current steps and their dependencies, ask which step I mean, and summarize exactly what will be cancelled or removed downstream. Require my explicit confirmation before changing anything.`,
  },
  {
    id: 'replace-step',
    title: 'Replace a step',
    description: 'Swap a step while preserving the Mission and its history.',
    prompt: (missionId: string) =>
      `Replace a step in mission ${missionId}. Show me the current steps, dependencies, and downstream impact, then ask what the replacement should produce and who should own it. Summarize the exact change and get my confirmation before applying it.`,
  },
  {
    id: 'branch',
    title: 'Branch from here',
    description: 'Continue an alternative path as a linked child Mission.',
    prompt: (missionId: string) =>
      `Branch mission ${missionId} into a linked child mission. Ask where the new path should begin and what outcome it should produce, then confirm the new child Mission before creating it.`,
  },
] as const

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
  const sourceConversationId =
    typeof mission.input?.source_conversation_id === 'string'
      ? mission.input.source_conversation_id
      : null

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

  if (options.length === 0 && !sourceConversationId) return null

  const openInChat = (prompt: string) => {
    if (!sourceConversationId) return
    useChatStore.getState().setPendingComposerText(prompt)
    useShellStore.getState().openChatDrawer(sourceConversationId)
  }

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
                className="dropdown-menu-solid z-dropdown py-spacing-1 fixed max-h-96 w-[280px] overflow-y-auto rounded-xl"
                data-mission-extend-menu
                role="menu"
                style={{ top: pos.top, left: pos.left }}
              >
                {sourceConversationId ? (
                  <>
                    <p className="px-spacing-3 py-spacing-1 typo-section-label text-muted-foreground">
                      {MISSION_CONTROL_MESSAGES.TRACK_CHAT_SECTION}
                    </p>
                    {CHAT_ACTIONS.map((action) => (
                      <button
                        key={action.id}
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setOpen(false)
                          openInChat(action.prompt(mission.id))
                        }}
                        className="gap-spacing-1 px-spacing-3 py-spacing-1-5 hover:bg-hover-subtle flex w-full flex-col items-start text-left"
                      >
                        <span className="body-3 text-foreground">{action.title}</span>
                        <span className="typo-caption text-muted-foreground">
                          {action.description}
                        </span>
                      </button>
                    ))}
                    {options.length > 0 ? <div className="my-spacing-1 bg-border h-px" /> : null}
                  </>
                ) : null}
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
