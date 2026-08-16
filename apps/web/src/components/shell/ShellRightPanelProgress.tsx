'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronRight, CircleDashed, CircleDot, CircleSlash, UserRound } from 'lucide-react'
import {
  fetchSubtasks,
  formatSubtaskStatusLabel,
  isBlockingHumanGate,
  isDependencyBlocked,
  isHumanGateSubtask,
  type MissionSubtask,
} from '@/lib/missions'
import { cn } from '@/lib/utils/cn'
import type { ConversationMissionRow } from './shell-conversation-summary'
import { SHELL_RIGHT_PANEL_MESSAGES } from './shell-right-panel.messages.config'

type SubtaskState = { loading: boolean; rows: MissionSubtask[]; failed: boolean }

const EMPTY_STATE: SubtaskState = { loading: false, rows: [], failed: false }

function StepIcon({ subtask, blocked }: { subtask: MissionSubtask; blocked: boolean }) {
  if (subtask.status === 'done') {
    return <CircleDot className="icon-sm text-primary shrink-0" aria-hidden />
  }
  // A human gate is marked as one for the whole run, not only once it starts
  // blocking — the point of showing a plan is seeing where it will stop for
  // you before it gets there. Emphasis is reserved for the gate that is
  // actually holding the mission up now.
  if (isHumanGateSubtask(subtask)) {
    return (
      <UserRound
        className={cn(
          'icon-sm shrink-0',
          isBlockingHumanGate(subtask) ? 'text-primary' : 'text-muted-foreground',
        )}
        // Labelled rather than aria-hidden: the icon is the only thing marking
        // this step as a gate, so hiding it would lose that fact entirely.
        role="img"
        aria-label={SHELL_RIGHT_PANEL_MESSAGES.progressGateStepLabel}
      />
    )
  }
  if (subtask.status === 'blocked' || subtask.status === 'cancelled') {
    return <CircleSlash className="icon-sm text-destructive shrink-0" aria-hidden />
  }
  return (
    <CircleDashed
      className={cn(
        'icon-sm shrink-0',
        subtask.status === 'in_progress' && !blocked ? 'text-foreground' : 'text-muted-foreground',
      )}
      aria-hidden
    />
  )
}

/**
 * Mission progress for the current thread.
 *
 * Steps are fetched per mission and only when that mission is expanded — a
 * conversation can start several missions, and loading every step list up
 * front would fire N requests for rows nobody has asked to see.
 */
export function ShellRightPanelProgress({ missions }: { missions: ConversationMissionRow[] }) {
  const [expanded, setExpanded] = useState<string | null>(missions[0]?.id ?? null)
  const [subtasksByMission, setSubtasksByMission] = useState<Record<string, SubtaskState>>({})
  const inFlightRef = useRef<Set<string>>(new Set())

  const loadSubtasks = useCallback(async (missionId: string) => {
    if (inFlightRef.current.has(missionId)) return
    inFlightRef.current.add(missionId)
    setSubtasksByMission((prev) => ({
      ...prev,
      [missionId]: { ...(prev[missionId] ?? EMPTY_STATE), loading: true, failed: false },
    }))
    try {
      const rows = await fetchSubtasks(missionId)
      setSubtasksByMission((prev) => ({
        ...prev,
        [missionId]: { loading: false, rows, failed: false },
      }))
    } catch {
      setSubtasksByMission((prev) => ({
        ...prev,
        [missionId]: { loading: false, rows: [], failed: true },
      }))
    } finally {
      inFlightRef.current.delete(missionId)
    }
  }, [])

  useEffect(() => {
    if (expanded && !subtasksByMission[expanded]) void loadSubtasks(expanded)
  }, [expanded, loadSubtasks, subtasksByMission])

  if (missions.length === 0) {
    return <p className="body-3 text-muted-foreground">{SHELL_RIGHT_PANEL_MESSAGES.progressEmpty}</p>
  }

  return (
    <ul className="gap-spacing-1 flex flex-col">
      {missions.map((mission) => {
        const open = expanded === mission.id
        const state = subtasksByMission[mission.id] ?? EMPTY_STATE
        return (
          <li key={mission.id}>
            <button
              type="button"
              onClick={() => setExpanded(open ? null : mission.id)}
              aria-expanded={open}
              className="gap-spacing-2 px-spacing-3 py-spacing-1-5 hover:bg-hover-subtle flex w-full items-center rounded-lg text-left transition-colors"
            >
              <ChevronRight
                className={cn(
                  'icon-sm text-muted-foreground shrink-0 transition-transform',
                  open && 'rotate-90',
                )}
                aria-hidden
              />
              <span className="body-3 text-foreground min-w-0 flex-1 truncate">
                {mission.title}
              </span>
              <MissionCounts state={state} />
            </button>
            {open ? <StepList state={state} /> : null}
          </li>
        )
      })}
    </ul>
  )
}

function MissionCounts({ state }: { state: SubtaskState }) {
  const gated = state.rows.filter(isBlockingHumanGate).length
  if (gated > 0) {
    return (
      <span className="body-4 text-primary shrink-0">
        {SHELL_RIGHT_PANEL_MESSAGES.progressYourTurn}
      </span>
    )
  }
  if (state.rows.length === 0) return null
  const done = state.rows.filter((row) => row.status === 'done').length
  return (
    <span className="body-4 text-muted-foreground shrink-0">
      {done}/{state.rows.length}
    </span>
  )
}

function StepList({ state }: { state: SubtaskState }) {
  const byId = useMemo(
    () => new Map(state.rows.map((row) => [row.id, row] as const)),
    [state.rows],
  )

  if (state.loading) {
    return (
      <p className="body-4 text-muted-foreground px-spacing-3 py-spacing-1">
        {SHELL_RIGHT_PANEL_MESSAGES.progressLoading}
      </p>
    )
  }
  if (state.failed) {
    return (
      <p className="body-4 text-muted-foreground px-spacing-3 py-spacing-1">
        {SHELL_RIGHT_PANEL_MESSAGES.progressLoadFailed}
      </p>
    )
  }
  if (state.rows.length === 0) {
    return (
      <p className="body-4 text-muted-foreground px-spacing-3 py-spacing-1">
        {SHELL_RIGHT_PANEL_MESSAGES.progressNoSteps}
      </p>
    )
  }

  return (
    <ol className="pl-spacing-6">
      {state.rows.map((subtask, index) => {
        const blocked = isDependencyBlocked(subtask, byId)
        const label = formatSubtaskStatusLabel(subtask.status, {
          dependencyBlocked: blocked,
          executionStatus: subtask.execution_state?.execution_status,
        })
        return (
          <li
            key={subtask.id}
            className="gap-spacing-2 px-spacing-3 py-spacing-1 flex items-start"
          >
            <span className="body-4 text-muted-foreground w-spacing-4 shrink-0 tabular-nums">
              {index + 1}
            </span>
            <StepIcon subtask={subtask} blocked={blocked} />
            <span
              className={cn(
                'body-4 min-w-0 flex-1',
                subtask.status === 'done' ? 'text-muted-foreground' : 'text-foreground',
              )}
            >
              {subtask.title}
            </span>
            <span
              className={cn(
                'body-4 shrink-0',
                isBlockingHumanGate(subtask) ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              {label}
            </span>
          </li>
        )
      })}
      {state.rows.some(isHumanGateSubtask) ? (
        <li className="px-spacing-3 py-spacing-1">
          <p className="body-4 text-muted-foreground">
            {SHELL_RIGHT_PANEL_MESSAGES.progressGateHint}
          </p>
        </li>
      ) : null}
    </ol>
  )
}
