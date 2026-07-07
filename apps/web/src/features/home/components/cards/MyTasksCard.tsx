'use client'

import { useEffect, useMemo, useState } from 'react'
import { Calendar, CheckSquare } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { TasksEmptyIllustration } from '@/features/home/components/HomeEmptyIllustrations'
import {
  HomeFeedScopeHoverReveal,
  HomeFeedScopePicker,
} from '@/features/home/components/HomeFeedScopePicker'
import {
  formatHomeShortDate,
  HomeListCardShell,
} from '@/features/home/components/HomeListCardShell'
import type { HomeFeedScopeState } from '@/features/home/types/home-feed-scope'
import { formatInboxStatusLabel } from '@/features/inbox/lib/inbox-status-label'
import { OptionDot } from '@/features/spaces/components/OptionBadge'
import {
  resolveMissionSubtaskStatusDotColor,
  resolveStatusDotColorFromId,
  resolveStatusLabelFromId,
} from '@/features/spaces/components/space-item-values'
import { cachedSpaces } from '@/features/spaces/hooks/use-cached-spaces'
import { fetchSpaceById } from '@/features/spaces/services/spaces.service'
import type { YourTurnItem } from '@/features/spaces/services/your-turn.service'
import type { FieldDef } from '@/features/spaces/types/space-schema'
import { cachedFetch } from '@/lib/cache/keyed-fetch-cache'
import { cn } from '@/lib/utils/cn'

const TASK_KINDS = new Set<YourTurnItem['kind']>(['space_item', 'mission_subtask'])

function isOverdue(dueAt: string | null, now: Date = new Date()): boolean {
  if (!dueAt) return false
  return new Date(dueAt).getTime() < now.getTime()
}

function useSpaceStatusFieldsBySpaceId(spaceIds: string[]) {
  const [fieldsBySpaceId, setFieldsBySpaceId] = useState<Map<string, FieldDef | null>>(new Map())

  const spaceIdsKey = useMemo(
    () => [...new Set(spaceIds.filter(Boolean))].sort().join(','),
    [spaceIds],
  )

  useEffect(() => {
    const ids = spaceIdsKey ? spaceIdsKey.split(',') : []
    if (ids.length === 0) {
      setFieldsBySpaceId(new Map())
      return
    }

    let cancelled = false
    // Reuse spaces already in the shared cachedSpaces resource; only fetch the
    // (rare) missing ones, deduped + cached 60s so feed reloads don't re-fan-out.
    const knownSpaces = cachedSpaces.peek()
    void Promise.all(
      ids.map(async (spaceId) => {
        try {
          const space =
            knownSpaces?.find((row) => row.id === spaceId) ??
            (await cachedFetch(`space:${spaceId}`, () => fetchSpaceById(spaceId), {
              ttlMs: 60_000,
            }))
          const statusField = space.schema?.fields?.find((field) => field.id === 'status') ?? null
          return [spaceId, statusField] as const
        } catch {
          return [spaceId, null] as const
        }
      }),
    ).then((entries) => {
      if (!cancelled) setFieldsBySpaceId(new Map(entries))
    })

    return () => {
      cancelled = true
    }
  }, [spaceIdsKey])

  return fieldsBySpaceId
}

function MyTaskStatusDot({
  item,
  statusField,
}: {
  item: YourTurnItem
  statusField: FieldDef | null | undefined
}) {
  const statusLabel =
    item.kind === 'mission_subtask'
      ? formatInboxStatusLabel(item.status)
      : resolveStatusLabelFromId(item.status, statusField)

  const dotColor =
    item.kind === 'mission_subtask'
      ? resolveMissionSubtaskStatusDotColor(item.status)
      : resolveStatusDotColorFromId(item.status, statusField)

  return (
    <Tooltip label={statusLabel} side="top">
      <span className="inline-flex shrink-0">
        <OptionDot color={dotColor} size="sm" />
      </span>
    </Tooltip>
  )
}

export function MyTasksCard({
  scope,
  updateScope,
  loading,
  items,
  onOpen,
}: {
  scope: HomeFeedScopeState
  updateScope: (patch: Partial<HomeFeedScopeState>) => void
  loading: boolean
  items: YourTurnItem[]
  onOpen: (item: YourTurnItem) => void | Promise<void>
}) {
  const taskItems = items.filter((item) => TASK_KINDS.has(item.kind))
  const spaceIds = useMemo(
    () => taskItems.map((item) => item.space_id).filter((id): id is string => id != null),
    [taskItems],
  )
  const statusFieldsBySpaceId = useSpaceStatusFieldsBySpaceId(spaceIds)

  return (
    <HomeListCardShell
      icon={CheckSquare}
      title="My tasks"
      headerRight={
        <HomeFeedScopeHoverReveal>
          <HomeFeedScopePicker variant="my_tasks" scope={scope} onChange={updateScope} />
        </HomeFeedScopeHoverReveal>
      }
      loading={loading}
      emptyMessage={
        <div className="flex flex-col items-center gap-4 py-8">
          <TasksEmptyIllustration />
          <p className="body-3 text-muted-foreground max-w-[240px] text-center">
            No tasks assigned to you right now.
          </p>
        </div>
      }
      hasRows={taskItems.length > 0}
    >
      <ul className="space-y-0.5">
        {taskItems.slice(0, 15).map((item) => {
          const dueForDisplay = item.due_at ? formatHomeShortDate(new Date(item.due_at)) : null
          const overdue = isOverdue(item.due_at)
          const statusField =
            item.space_id != null ? (statusFieldsBySpaceId.get(item.space_id) ?? null) : null

          return (
            <li key={`${item.kind}:${item.id}`}>
              <button
                type="button"
                onClick={() => void onOpen(item)}
                className="hover:bg-hover-subtle body-3 text-foreground flex w-full min-w-0 items-center gap-2.5 rounded-md px-2.5 py-2 text-left font-medium transition-colors"
              >
                <MyTaskStatusDot item={item} statusField={statusField} />
                <span className="min-w-0 flex-1 truncate">{item.title}</span>
                <span
                  className={cn(
                    'typo-caption flex shrink-0 items-center gap-1 tabular-nums',
                    dueForDisplay && overdue ? 'text-destructive' : 'text-muted-foreground',
                  )}
                >
                  {dueForDisplay ? (
                    <>
                      <Calendar className="h-3 w-3 shrink-0" aria-hidden />
                      {dueForDisplay}
                    </>
                  ) : (
                    'No due date'
                  )}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </HomeListCardShell>
  )
}
