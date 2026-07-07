'use client'

import { useCallback, useMemo, useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { CalendarClock, CalendarX, X } from 'lucide-react'
import { TimePicker } from '@/components/datetime/TimePicker'
import { Tooltip } from '@/components/ui/tooltip'
import type { ScheduledSocialPost } from '@/features/studio/services/artifact-preview.service'
import { SchedulePostThumbnail } from './schedule-thumbnail'
import { ScheduleHubToolbar } from './ScheduleHubToolbar'
import type { ScheduleSort } from './types'

interface TableViewProps {
  rows: ScheduledSocialPost[]
  onSchedule: (socialPostId: string, scheduledAtIso: string) => Promise<void>
  onUnschedule: (socialPostId: string) => Promise<void>
}

function sortRows(rows: ScheduledSocialPost[], sort: ScheduleSort): ScheduledSocialPost[] {
  const cloned = [...rows]
  if (sort === 'scheduled_at.asc') {
    cloned.sort(
      (a, b) =>
        new Date(a.scheduled_at ?? '9999-12-31').getTime() -
        new Date(b.scheduled_at ?? '9999-12-31').getTime(),
    )
    return cloned
  }
  if (sort === 'scheduled_at.desc') {
    cloned.sort(
      (a, b) =>
        new Date(b.scheduled_at ?? '1970-01-01').getTime() -
        new Date(a.scheduled_at ?? '1970-01-01').getTime(),
    )
    return cloned
  }
  if (sort === 'platform.asc') {
    cloned.sort((a, b) => a.platform.localeCompare(b.platform))
    return cloned
  }
  cloned.sort((a, b) => b.platform.localeCompare(a.platform))
  return cloned
}

function toLocalInputValue(iso: string): string {
  const date = new Date(iso)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function defaultScheduleValue(): string {
  const d = new Date()
  d.setHours(d.getHours() + 1, 0, 0, 0)
  return toLocalInputValue(d.toISOString())
}

export function TableView({ rows, onSchedule, onUnschedule }: TableViewProps) {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<ScheduleSort>('scheduled_at.asc')
  const [platformsFilter, setPlatformsFilter] = useState<Set<string>>(new Set())
  const [workingId, setWorkingId] = useState<string | null>(null)
  const [scheduleTarget, setScheduleTarget] = useState<ScheduledSocialPost | null>(null)
  const [scheduleValue, setScheduleValue] = useState('')

  const filtered = useMemo(() => {
    let base = rows
    const q = search.trim().toLowerCase()
    if (q.length > 0) {
      base = base.filter((row) => {
        const text =
          `${row.caption ?? ''} ${row.headline ?? ''} ${row.platform} ${row.post_type}`.toLowerCase()
        return text.includes(q)
      })
    }
    if (platformsFilter.size > 0) {
      base = base.filter((row) => platformsFilter.has(row.platform))
    }
    return sortRows(base, sort)
  }, [rows, search, sort, platformsFilter])

  const openScheduleDialog = useCallback((row: ScheduledSocialPost) => {
    setScheduleValue(
      row.scheduled_at ? toLocalInputValue(row.scheduled_at) : defaultScheduleValue(),
    )
    setScheduleTarget(row)
  }, [])

  const handleScheduleConfirm = useCallback(async () => {
    if (!scheduleTarget || !scheduleValue) return
    const parsed = new Date(scheduleValue)
    if (Number.isNaN(parsed.getTime())) return
    setWorkingId(scheduleTarget.id)
    setScheduleTarget(null)
    try {
      await onSchedule(scheduleTarget.id, parsed.toISOString())
    } finally {
      setWorkingId(null)
    }
  }, [scheduleTarget, scheduleValue, onSchedule])

  const handleUnscheduleClick = async (row: ScheduledSocialPost) => {
    setWorkingId(row.id)
    try {
      await onUnschedule(row.id)
    } finally {
      setWorkingId(null)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-auto px-3">
        <div className="py-2">
          <ScheduleHubToolbar
            searchValue={search}
            onSearchChange={setSearch}
            currentSort={sort}
            onSortChange={setSort}
            platformsFilter={platformsFilter}
            onPlatformsFilterChange={setPlatformsFilter}
          />
        </div>
        <table className="w-full min-w-[600px] border-collapse">
          <thead className="bg-card sticky top-0 z-10">
            <tr className="border-border border-b">
              <th className="typo-caption text-muted-foreground w-10 px-3 py-2 text-left font-normal uppercase tracking-wider" />
              <th className="typo-caption text-muted-foreground px-2 py-2 text-left font-normal uppercase tracking-wider">
                Post
              </th>
              <th className="typo-caption text-muted-foreground whitespace-nowrap px-2 py-2 text-left font-normal uppercase tracking-wider">
                Time
              </th>
              <th className="typo-caption text-muted-foreground whitespace-nowrap px-2 py-2 text-left font-normal uppercase tracking-wider">
                Platform
              </th>
              <th className="typo-caption text-muted-foreground whitespace-nowrap px-2 py-2 text-left font-normal uppercase tracking-wider">
                Type
              </th>
              <th className="typo-caption text-muted-foreground whitespace-nowrap px-2 py-2 text-left font-normal uppercase tracking-wider">
                Status
              </th>
              <th className="typo-caption text-muted-foreground whitespace-nowrap px-2 py-2 text-right font-normal uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr
                key={row.id}
                className="border-border hover:bg-hover-subtle border-b transition-colors"
              >
                <td className="px-3 py-2">
                  <SchedulePostThumbnail row={row} />
                </td>
                <td className="max-w-[180px] px-2 py-2">
                  <div className="body-4 text-foreground truncate">
                    {row.caption?.trim() || row.headline?.trim() || 'Untitled post'}
                  </div>
                </td>
                <td className="typo-caption text-muted-foreground whitespace-nowrap px-2 py-2">
                  {row.scheduled_at
                    ? new Date(row.scheduled_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '—'}
                </td>
                <td className="whitespace-nowrap px-2 py-2">
                  <span
                    className={`badge-glass typo-caption font-medium ${row.platform === 'linkedin' ? 'badge-glass-blue' : 'badge-glass-purple'}`}
                  >
                    {row.platform === 'linkedin' ? 'LinkedIn' : 'Instagram'}
                  </span>
                </td>
                <td className="body-4 text-muted-foreground whitespace-nowrap px-2 py-2 capitalize">
                  {row.post_type.replace(/_/g, ' ')}
                </td>
                <td className="body-4 text-muted-foreground whitespace-nowrap px-2 py-2 capitalize">
                  {row.schedule_status ?? row.status}
                </td>
                <td className="whitespace-nowrap px-2 py-2 text-right">
                  <div className="inline-flex items-center gap-1">
                    <Tooltip label={row.scheduled_at ? 'Reschedule' : 'Schedule'}>
                      <button
                        type="button"
                        onClick={() => openScheduleDialog(row)}
                        disabled={workingId === row.id}
                        className="btn-icon-glass"
                      >
                        <CalendarClock className="icon-sm" />
                      </button>
                    </Tooltip>
                    {row.scheduled_at && (
                      <Tooltip label="Unschedule">
                        <button
                          type="button"
                          onClick={() => void handleUnscheduleClick(row)}
                          disabled={workingId === row.id}
                          className="btn-icon-glass-destructive"
                        >
                          <CalendarX className="icon-sm" />
                        </button>
                      </Tooltip>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="flex items-center justify-center py-10">
            <p className="body-3 text-muted-foreground">No content found</p>
          </div>
        )}
      </div>

      <DialogPrimitive.Root
        open={scheduleTarget !== null}
        onOpenChange={(open) => {
          if (!open) setScheduleTarget(null)
        }}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="z-modal-backdrop fixed inset-0" />
          <DialogPrimitive.Content className="z-modal-content p-spacing-4 fixed inset-0 flex items-center justify-center">
            <div className="surface-card wizard-container-border rounded-spacing-4 w-full max-w-sm">
              <div className="px-spacing-6 pt-spacing-4 pb-spacing-2">
                <div className="flex items-center justify-between">
                  <DialogPrimitive.Title className="title-h6">
                    {scheduleTarget?.scheduled_at ? 'Reschedule Post' : 'Schedule Post'}
                  </DialogPrimitive.Title>
                  <button
                    type="button"
                    onClick={() => setScheduleTarget(null)}
                    className="btn-icon-glass"
                  >
                    <X className="icon-xs" />
                  </button>
                </div>
                {scheduleTarget && (
                  <p className="body-3 text-muted-foreground mt-spacing-1 truncate">
                    {scheduleTarget.caption?.trim() ||
                      scheduleTarget.headline?.trim() ||
                      'Social Post'}
                  </p>
                )}
              </div>

              <div className="px-spacing-6 py-spacing-4">
                <label className="body-2 mb-spacing-2 block">Date & Time</label>
                <div className="gap-spacing-2 flex items-stretch">
                  <input
                    type="date"
                    value={scheduleValue.slice(0, 10)}
                    onChange={(e) => {
                      const next = e.target.value
                      if (!next) return
                      setScheduleValue(`${next}T${scheduleValue.slice(11, 16) || '09:00'}`)
                    }}
                    className="h-spacing-10 px-spacing-3 body-2 rounded-spacing-2 border-border surface-bg text-foreground min-w-0 flex-1 border"
                  />
                  <TimePicker
                    value={scheduleValue.slice(11, 16) || null}
                    onChange={(next) => {
                      const date = scheduleValue.slice(0, 10)
                      if (!date) return
                      setScheduleValue(`${date}T${next ?? '09:00'}`)
                    }}
                    align="end"
                  />
                </div>
              </div>

              <div className="px-spacing-6 py-spacing-4 border-border flex items-center justify-between border-t">
                <button
                  type="button"
                  onClick={() => setScheduleTarget(null)}
                  className="button-glass-neutral hover:bg-hover-subtle hover:text-foreground rounded-lg px-4 py-2 text-sm font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleScheduleConfirm()}
                  disabled={!scheduleValue}
                  className="button-glass-accent rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  <span className="relative z-10">Confirm</span>
                </button>
              </div>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  )
}
