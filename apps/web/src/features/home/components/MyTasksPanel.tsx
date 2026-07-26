'use client'

import { useEffect, useMemo, useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Calendar, CheckSquare, Search, X } from 'lucide-react'
import { OptionDot } from '@/components/ui/status/OptionBadge'
import { Tooltip } from '@/components/ui/tooltip'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { TasksEmptyIllustration } from '@/features/home/components/HomeEmptyIllustrations'
import { HomeFeedScopePicker } from '@/features/home/components/HomeFeedScopePicker'
import { formatHomeShortDate } from '@/features/home/components/HomeListCardShell'
import { filterMyTasksBySearch, groupMyTasksByDue } from '@/features/home/lib/group-my-tasks-by-due'
import type { HomeFeedScopeState } from '@/features/home/types/home-feed-scope'
import { cachedFetch } from '@/lib/cache/keyed-fetch-cache'
import { formatNotificationStatusLabel } from '@/lib/notifications'
import {
  fetchSpaceById,
  resolveMissionSubtaskStatusDotColor,
  resolveStatusDotColorFromId,
  resolveStatusLabelFromId,
  type FieldDef,
} from '@/lib/spaces'
import { cn } from '@/lib/utils/cn'
import type { YourTurnItem } from '@/lib/your-turn/types'

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
    void Promise.all(
      ids.map(async (spaceId) => {
        try {
          const space = await cachedFetch(`space:${spaceId}`, () => fetchSpaceById(spaceId), {
            ttlMs: 60_000,
          })
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

function StatusDot({
  item,
  statusField,
}: {
  item: YourTurnItem
  statusField: FieldDef | null | undefined
}) {
  const statusLabel =
    item.kind === 'mission_subtask'
      ? formatNotificationStatusLabel(item.status)
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

export function MyTasksPanel({
  open,
  onOpenChange,
  scope,
  updateScope,
  loading,
  items,
  onOpenItem,
  embedded = false,
  presentation = 'dialog',
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  scope: HomeFeedScopeState
  updateScope: (patch: Partial<HomeFeedScopeState>) => void
  loading: boolean
  items: YourTurnItem[]
  onOpenItem: (item: YourTurnItem) => void | Promise<void>
  embedded?: boolean
  presentation?: 'dialog' | 'page'
}) {
  const [search, setSearch] = useState('')
  const filtered = useMemo(() => filterMyTasksBySearch(items, search), [items, search])
  const groups = useMemo(() => groupMyTasksByDue(filtered), [filtered])
  const spaceIds = useMemo(
    () => filtered.map((item) => item.space_id).filter((id): id is string => id != null),
    [filtered],
  )
  const statusFieldsBySpaceId = useSpaceStatusFieldsBySpaceId(spaceIds)
  const totalCount = filtered.length
  const pagePresentation = presentation === 'page'

  useEffect(() => {
    if (!open) setSearch('')
  }, [open])

  const content = (
    <div
      className={cn(
        'surface-card wizard-container-border border-border bg-card flex w-full flex-col overflow-hidden',
        pagePresentation
          ? 'h-full min-h-0 border-0 shadow-none'
          : embedded
            ? 'h-full min-h-0 border-0 shadow-none'
            : 'rounded-spacing-4 max-h-[88vh] max-w-3xl border shadow-2xl',
      )}
    >
      <div className="px-spacing-6 pt-spacing-5 pb-spacing-3 shrink-0">
        <div className="gap-spacing-3 flex items-start justify-between">
          <div className="min-w-0 flex-1">
            {embedded || pagePresentation ? (
              <>
                <h1 className="title-h6 text-foreground flex items-center gap-2">
                  <CheckSquare className="text-muted-foreground h-5 w-5 shrink-0" aria-hidden />
                  MY TASKS
                </h1>
                <p className="body-3 text-muted-foreground mt-spacing-1">
                  Everything assigned to you — grouped by when it’s due.
                  {totalCount > 0 ? (
                    <span className="text-muted-foreground"> · {totalCount}</span>
                  ) : null}
                </p>
              </>
            ) : (
              <>
                <DialogPrimitive.Title className="title-h6 text-foreground flex items-center gap-2">
                  <CheckSquare className="text-muted-foreground h-5 w-5 shrink-0" aria-hidden />
                  My tasks
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="body-3 text-muted-foreground mt-spacing-1">
                  Everything assigned to you — grouped by when it’s due.
                  {totalCount > 0 ? (
                    <span className="text-muted-foreground"> · {totalCount}</span>
                  ) : null}
                </DialogPrimitive.Description>
              </>
            )}
          </div>
          {!embedded && !pagePresentation ? (
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="btn-icon-bare shrink-0"
              aria-label="Close"
            >
              <X className="icon-xs" />
            </button>
          ) : null}
        </div>

        <div className="mt-spacing-4 gap-spacing-2 flex flex-wrap items-center">
          <div className="relative min-w-0 flex-1">
            <Search
              className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
              aria-hidden
            />
            <input
              className="input-glass body-3 h-spacing-9 rounded-spacing-2 w-full pl-9 pr-3"
              placeholder="Search tasks…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <HomeFeedScopePicker
            variant="my_tasks"
            scope={scope}
            onChange={updateScope}
            showSummary={pagePresentation}
          />
        </div>
      </div>

      <div className="px-spacing-4 pb-spacing-5 flex min-h-0 flex-1 flex-col overflow-y-auto">
        {loading ? (
          <div className="flex flex-1 items-center justify-center py-16">
            <VibeyLoadingOrb state="processing" size="md" />
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
            <TasksEmptyIllustration />
            <div>
              <p className="body-2 text-foreground font-medium">
                {search.trim() ? 'No matching tasks' : 'No tasks assigned to you'}
              </p>
              <p className="body-3 text-muted-foreground mt-1 max-w-sm">
                {search.trim()
                  ? 'Try a different search, or clear the filter.'
                  : 'When something is assigned to you, it shows up here.'}
              </p>
            </div>
            {search.trim() ? (
              <button
                type="button"
                className="button-default button-glass-neutral body-3 font-medium"
                onClick={() => setSearch('')}
              >
                Clear search
              </button>
            ) : null}
          </div>
        ) : (
          <div className="space-y-spacing-5 px-spacing-2 pt-spacing-1">
            {groups.map((group) => (
              <section key={group.id}>
                <h2 className="typo-caption text-muted-foreground mb-spacing-2 px-0.5 font-medium tracking-wide">
                  {group.label}
                  <span className="text-muted-foreground/80 ml-1.5 tabular-nums">
                    {group.items.length}
                  </span>
                </h2>
                <ul className="border-border bg-card divide-border rounded-spacing-2 divide-y overflow-hidden border">
                  {group.items.map((item) => {
                    const dueForDisplay = item.due_at
                      ? formatHomeShortDate(new Date(item.due_at))
                      : null
                    const overdue = isOverdue(item.due_at)
                    const statusField =
                      item.space_id != null
                        ? (statusFieldsBySpaceId.get(item.space_id) ?? null)
                        : null
                    return (
                      <li key={`${item.kind}:${item.id}`}>
                        <button
                          type="button"
                          onClick={() => {
                            onOpenChange(false)
                            void onOpenItem(item)
                          }}
                          className="hover:bg-hover-subtle body-3 text-foreground flex w-full min-w-0 items-center gap-3 px-3.5 py-3 text-left transition-colors"
                        >
                          <StatusDot item={item} statusField={statusField} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">{item.title}</span>
                            {item.preview ? (
                              <span className="typo-caption text-muted-foreground mt-0.5 block truncate">
                                {item.preview}
                              </span>
                            ) : null}
                          </span>
                          <span
                            className={cn(
                              'typo-caption flex shrink-0 items-center gap-1 tabular-nums',
                              dueForDisplay && overdue
                                ? 'text-destructive'
                                : 'text-muted-foreground',
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
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  if (embedded || pagePresentation) return content

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="z-modal-backdrop bg-modal-overlay fixed inset-0" />
        <DialogPrimitive.Content className="z-modal-layer-3 p-spacing-4 fixed inset-0 flex items-center justify-center">
          {content}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
