'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronRight, Circle, CircleCheck, CircleSlash, UserRound } from 'lucide-react'
import {
  fetchMissionById,
  fetchSubtasks,
  formatMissionRowDate,
  formatMissionStepTitle,
  formatSubtaskStatusLabel,
  isBlockingHumanGate,
  isDependencyBlocked,
  isHumanGateSubtask,
  isLiveMission,
  type Mission,
  type MissionSubtask,
} from '@/lib/missions'
import { cn } from '@/lib/utils/cn'
import type { ConversationMissionRow } from './shell-conversation-summary'
import { SHELL_RIGHT_PANEL_MESSAGES } from './shell-right-panel.messages.config'
import { ShellRightPanelEmpty } from './ShellRightPanelEmpty'

type SubtaskState = { loading: boolean; rows: MissionSubtask[]; failed: boolean }

const EMPTY_STATE: SubtaskState = { loading: false, rows: [], failed: false }

/** Guards a thread that launched an unusual number of missions. */
const MAX_MISSIONS = 20

/**
 * The step's leading mark: its number until the step has something more
 * specific to say. Replacing the number rather than sitting beside it keeps
 * the list to two columns, which is what makes it scannable at this width.
 */
function StepBadge({ subtask, index }: { subtask: MissionSubtask; index: number }) {
  const base = 'size-spacing-5 shrink-0 flex items-center justify-center rounded-full'

  if (subtask.status === 'done') {
    return (
      <span className={cn(base, 'text-primary')}>
        <CircleCheck className="icon-sm" aria-hidden />
      </span>
    )
  }
  // A human gate is marked for the whole run, not only once it blocks — the
  // point of showing a plan is seeing where it will stop for you.
  if (isHumanGateSubtask(subtask)) {
    return (
      <span
        className={cn(
          base,
          isBlockingHumanGate(subtask)
            ? 'text-primary'
            : 'bg-secondary text-muted-foreground',
        )}
        role="img"
        aria-label={SHELL_RIGHT_PANEL_MESSAGES.progressGateStepLabel}
      >
        <UserRound className="icon-sm" aria-hidden />
      </span>
    )
  }
  if (subtask.status === 'blocked' || subtask.status === 'cancelled') {
    return (
      <span className={cn(base, 'text-destructive')}>
        <CircleSlash className="icon-sm" aria-hidden />
      </span>
    )
  }
  if (subtask.status === 'in_progress') {
    return (
      <span className={cn(base, 'text-primary')}>
        <Circle className="icon-sm" aria-hidden />
      </span>
    )
  }
  return (
    <span className={cn(base, 'bg-secondary body-4 text-muted-foreground tabular-nums')}>
      {index + 1}
    </span>
  )
}

export function ShellRightPanelProgress({ missions }: { missions: ConversationMissionRow[] }) {
  const capped = useMemo(() => missions.slice(0, MAX_MISSIONS), [missions])
  const [summaries, setSummaries] = useState<Record<string, Mission>>({})
  const [showResting, setShowResting] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [subtasksByMission, setSubtasksByMission] = useState<Record<string, SubtaskState>>({})
  const inFlightRef = useRef<Set<string>>(new Set())

  // One summary per mission, fetched up front: it carries status and step
  // counts, so the list can be filtered and counted without expanding a thing.
  useEffect(() => {
    let cancelled = false
    void Promise.all(
      capped.map((row) =>
        fetchMissionById(row.id)
          .then((mission) => [row.id, mission] as const)
          .catch(() => null),
      ),
    ).then((results) => {
      if (cancelled) return
      const next: Record<string, Mission> = {}
      for (const entry of results) if (entry) next[entry[0]] = entry[1]
      setSummaries(next)
    })
    return () => {
      cancelled = true
    }
  }, [capped])

  // A mission with no summary yet counts as live: it is better to show a row
  // that later resolves to done than to hide one that is still running.
  const live = useMemo(
    () => capped.filter((row) => !summaries[row.id] || isLiveMission(summaries[row.id]!)),
    [capped, summaries],
  )
  const restingCount = capped.length - live.length
  const visible = showResting ? capped : live

  // Expanded by default — the first mission still in flight is the one you
  // opened the panel to look at. Summaries arrive after the first render, so
  // the default can land on a mission that then filters out as done; when the
  // expanded one is no longer on screen, fall to the first that is.
  useEffect(() => {
    setExpanded((current) => {
      if (current && visible.some((row) => row.id === current)) return current
      return visible[0]?.id ?? null
    })
  }, [visible])

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
    return <ShellRightPanelEmpty art="missions" message={SHELL_RIGHT_PANEL_MESSAGES.progressEmpty} />
  }

  return (
    <div className="flex flex-col">
      {restingCount > 0 ? (
        <div className="gap-spacing-2 px-spacing-3 pb-spacing-1 flex items-center">
          <span className="body-4 text-muted-foreground min-w-0 flex-1 truncate">
            {SHELL_RIGHT_PANEL_MESSAGES.progressLiveCount(live.length)}
          </span>
          <button
            type="button"
            onClick={() => setShowResting((value) => !value)}
            aria-pressed={showResting}
            className="body-4 text-muted-foreground hover:text-foreground shrink-0 transition-colors"
          >
            {showResting
              ? SHELL_RIGHT_PANEL_MESSAGES.progressHideDone
              : SHELL_RIGHT_PANEL_MESSAGES.progressShowDone(restingCount)}
          </button>
        </div>
      ) : null}

      <ul className="flex flex-col">
        {visible.map((mission) => {
          const open = expanded === mission.id
          const state = subtasksByMission[mission.id] ?? EMPTY_STATE
          const summary = summaries[mission.id]
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
                <span className="min-w-0 flex-1">
                  <span className="body-3 text-foreground block truncate">
                    {summary?.title?.trim() || mission.title}
                  </span>
                  {/* Missions are named after the playbook that produced them,
                      so several runs share one name — the date is what tells
                      them apart until they are named distinctly at creation. */}
                  <span className="body-4 text-muted-foreground block truncate">
                    {formatMissionRowDate(mission.createdAt)}
                  </span>
                </span>
                <MissionCounts state={state} summary={summary} />
              </button>
              {open ? <StepList state={state} /> : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function MissionCounts({ state, summary }: { state: SubtaskState; summary?: Mission }) {
  if (state.rows.some(isBlockingHumanGate)) {
    return (
      <span className="body-4 text-primary shrink-0">
        {SHELL_RIGHT_PANEL_MESSAGES.progressYourTurn}
      </span>
    )
  }
  // Prefer loaded steps, fall back to the summary so a collapsed mission still
  // shows its progress.
  const total = state.rows.length || summary?.subtask_total || 0
  if (total === 0) return null
  const done = state.rows.length
    ? state.rows.filter((row) => row.status === 'done').length
    : (summary?.subtask_done ?? 0)
  return (
    <span className="body-4 text-muted-foreground shrink-0 tabular-nums">
      {done}/{total}
    </span>
  )
}

function StepList({ state }: { state: SubtaskState }) {
  const byId = useMemo(() => new Map(state.rows.map((row) => [row.id, row] as const)), [state.rows])

  if (state.loading) {
    return (
      <p className="body-4 text-muted-foreground px-spacing-3 py-spacing-1">
        {SHELL_RIGHT_PANEL_MESSAGES.progressLoading}
      </p>
    )
  }
  if (state.failed) {
    return (
      <p className="body-4 text-destructive px-spacing-3 py-spacing-1">
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
    <ol className="pb-spacing-1">
      {state.rows.map((subtask, index) => {
        const blocked = isDependencyBlocked(subtask, byId)
        const label = formatSubtaskStatusLabel(subtask.status, {
          dependencyBlocked: blocked,
          executionStatus: subtask.execution_state?.execution_status,
        })
        return (
          <li
            key={subtask.id}
            className="gap-spacing-2 px-spacing-3 py-spacing-1 flex items-center"
            title={subtask.title}
          >
            <StepBadge subtask={subtask} index={index} />
            <span
              className={cn(
                'body-4 min-w-0 flex-1 truncate',
                subtask.status === 'done' ? 'text-muted-foreground' : 'text-foreground',
              )}
            >
              {formatMissionStepTitle(subtask.title)}
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
    </ol>
  )
}
