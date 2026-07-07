'use client'

import { useCallback, useMemo, useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { CalendarClock, CalendarX, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  buildLocalDateFromDayAndHour,
  CalendarBoard,
  CalendarDroppable,
  defaultScheduleValue,
  DraggableCalendarItem,
  toLocalInputValue,
  type CalendarDragPayload,
  type CalendarEvent,
} from '@/components/calendar'
import { Tooltip } from '@/components/ui/tooltip'
import type { ScheduledSocialPost } from '@/features/studio/services/artifact-preview.service'
import { SchedulePostThumbnail } from './schedule-thumbnail'

interface CalendarViewProps {
  rows: ScheduledSocialPost[]
  onSchedule: (socialPostId: string, scheduledAtIso: string) => Promise<void>
  onUnschedule: (socialPostId: string) => Promise<void>
}

function getPostTitle(row: ScheduledSocialPost): string {
  return row.caption?.trim() || row.headline?.trim() || 'Untitled post'
}

function getPostBadge(row: ScheduledSocialPost) {
  return (
    <span
      className={`badge-glass badge-glass-sm typo-caption w-fit font-medium ${
        row.platform === 'linkedin' ? 'badge-glass-blue' : 'badge-glass-purple'
      }`}
    >
      {row.platform === 'linkedin' ? 'LinkedIn' : 'Instagram'}
    </span>
  )
}

function mapScheduledPostToEvent(row: ScheduledSocialPost): CalendarEvent<ScheduledSocialPost> {
  return {
    id: row.id,
    sourceId: 'campaign_social_posts',
    start: row.scheduled_at ?? row.updated_at,
    title: getPostTitle(row),
    subtitle: `${row.platform} · ${row.post_type.replace(/_/g, ' ')}`,
    thumbnail: <SchedulePostThumbnail row={row} size="sm" />,
    badge: getPostBadge(row),
    draggable: true,
    raw: row,
  }
}

function PostMonthEvent({ row, compact }: { row: ScheduledSocialPost; compact: boolean }) {
  const raw = getPostTitle(row)
  const label = !compact && raw ? (raw.length > 18 ? `${raw.slice(0, 18)}...` : raw) : ''
  return (
    <div
      className="flex min-w-0 items-center gap-1 overflow-hidden"
      title={raw || `${row.platform} · ${row.post_type.replace(/_/g, ' ')}`}
    >
      <div className="shrink-0">
        <SchedulePostThumbnail row={row} size="sm" />
      </div>
      {label && (
        <span className="typo-caption text-muted-foreground whitespace-nowrap">{label}</span>
      )}
    </div>
  )
}

function PostDayEvent({ row }: { row: ScheduledSocialPost }) {
  const text = getPostTitle(row)
  const dot = text.indexOf('.')
  const truncated =
    dot > 0 && dot < 120
      ? text.slice(0, dot + 1)
      : text.length > 80
        ? `${text.slice(0, 80)}...`
        : text
  return (
    <div className="flex items-start gap-2 overflow-hidden">
      <div className="shrink-0">
        <SchedulePostThumbnail row={row} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 overflow-hidden">
        <span className="body-4 text-foreground block truncate">{truncated}</span>
        {getPostBadge(row)}
      </div>
    </div>
  )
}

function UnscheduledCard({ event }: { event: CalendarEvent<ScheduledSocialPost> }) {
  const row = event.raw
  return (
    <DraggableCalendarItem event={event}>
      <div className="border-border hover:bg-hover-subtle flex items-start gap-2 rounded-md border p-2">
        <div className="shrink-0">
          <SchedulePostThumbnail row={row} />
        </div>
        <div className="min-w-0">
          <div className="body-4 text-foreground truncate">{getPostTitle(row)}</div>
          <div className="mt-1">{getPostBadge(row)}</div>
        </div>
      </div>
    </DraggableCalendarItem>
  )
}

function SelectedTableRow({
  event,
  workingId,
  onOpenScheduleDialog,
  onUnschedule,
}: {
  event: CalendarEvent<ScheduledSocialPost>
  workingId: string | null
  onOpenScheduleDialog: (row: ScheduledSocialPost) => void
  onUnschedule: (row: ScheduledSocialPost) => Promise<void>
}) {
  const row = event.raw
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `table-row:${event.id}`,
    data: { eventId: event.id },
  })
  const style = { transform: CSS.Translate.toString(transform) }
  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`border-border hover:bg-hover-subtle border-b transition-colors ${isDragging ? 'opacity-50' : ''}`}
      {...listeners}
      {...attributes}
    >
      <td className="px-3 py-2">
        <SchedulePostThumbnail row={row} />
      </td>
      <td className="max-w-[180px] px-2 py-2">
        <div className="body-4 text-foreground truncate">{getPostTitle(row)}</div>
      </td>
      <td className="typo-caption text-muted-foreground whitespace-nowrap px-2 py-2">
        {row.scheduled_at
          ? new Date(row.scheduled_at).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            })
          : '-'}
      </td>
      <td className="whitespace-nowrap px-2 py-2">{getPostBadge(row)}</td>
      <td className="body-4 text-muted-foreground whitespace-nowrap px-2 py-2 capitalize">
        {row.post_type.replace(/_/g, ' ')}
      </td>
      <td className="body-4 text-muted-foreground whitespace-nowrap px-2 py-2 capitalize">
        {row.schedule_status ?? row.status}
      </td>
      <td
        className="whitespace-nowrap px-2 py-2 text-right"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="inline-flex items-center gap-1">
          <Tooltip label={row.scheduled_at ? 'Reschedule' : 'Schedule'}>
            <button
              type="button"
              onClick={() => onOpenScheduleDialog(row)}
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
                onClick={() => void onUnschedule(row)}
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
  )
}

export function CalendarView({ rows, onSchedule, onUnschedule }: CalendarViewProps) {
  const [workingId, setWorkingId] = useState<string | null>(null)
  const [scheduleTarget, setScheduleTarget] = useState<ScheduledSocialPost | null>(null)
  const [scheduleValue, setScheduleValue] = useState('')

  const terminalStatuses = useMemo(() => new Set(['published', 'cancelled']), [])
  const scheduledRows = useMemo(() => rows.filter((row) => Boolean(row.scheduled_at)), [rows])
  const unscheduledRows = useMemo(
    () =>
      rows.filter(
        (row) =>
          !row.scheduled_at &&
          !terminalStatuses.has(row.schedule_status ?? '') &&
          !terminalStatuses.has(row.status),
      ),
    [rows, terminalStatuses],
  )

  const scheduledEvents = useMemo(() => scheduledRows.map(mapScheduledPostToEvent), [scheduledRows])
  const unscheduledEvents = useMemo(
    () =>
      unscheduledRows.map((row) => ({
        ...mapScheduledPostToEvent(row),
        start: row.updated_at,
      })),
    [unscheduledRows],
  )

  const openScheduleDialog = useCallback((row: ScheduledSocialPost) => {
    setScheduleValue(
      row.scheduled_at ? toLocalInputValue(row.scheduled_at) : defaultScheduleValue(),
    )
    setScheduleTarget(row)
  }, [])

  const openScheduleDialogForDrop = useCallback((row: ScheduledSocialPost, day: string) => {
    const source = row.scheduled_at ? new Date(row.scheduled_at) : new Date()
    const prefill = buildLocalDateFromDayAndHour(day, source.getHours(), source.getMinutes())
    setScheduleValue(toLocalInputValue(prefill.toISOString()))
    setScheduleTarget(row)
  }, [])

  const handleScheduleConfirm = useCallback(async () => {
    if (!scheduleTarget || !scheduleValue) return
    const parsed = new Date(scheduleValue)
    if (Number.isNaN(parsed.getTime())) return
    setWorkingId(scheduleTarget.id)
    setScheduleTarget(null)
    const tid = toast.loading('Scheduling...')
    try {
      await onSchedule(scheduleTarget.id, parsed.toISOString())
      toast.success('Post scheduled', { id: tid })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to schedule post'
      toast.error(msg, { id: tid })
    } finally {
      setWorkingId(null)
    }
  }, [scheduleTarget, scheduleValue, onSchedule])

  const handleUnscheduleClick = async (row: ScheduledSocialPost) => {
    setWorkingId(row.id)
    const tid = toast.loading('Unscheduling...')
    try {
      await onUnschedule(row.id)
      toast.success('Post unscheduled', { id: tid })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to unschedule post'
      toast.error(msg, { id: tid })
    } finally {
      setWorkingId(null)
    }
  }

  const handleDropToHour = useCallback(
    async (row: ScheduledSocialPost, day: string, hour: number) => {
      const sourceMinute = row.scheduled_at ? new Date(row.scheduled_at).getMinutes() : 0
      const target = buildLocalDateFromDayAndHour(day, hour, sourceMinute)
      setWorkingId(row.id)
      const tid = toast.loading(row.scheduled_at ? 'Rescheduling...' : 'Scheduling...')
      try {
        await onSchedule(row.id, target.toISOString())
        toast.success(row.scheduled_at ? 'Post rescheduled' : 'Post scheduled', { id: tid })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to reschedule post'
        toast.error(msg, { id: tid })
      } finally {
        setWorkingId(null)
      }
    },
    [onSchedule],
  )

  const handleCalendarDrop = useCallback(
    async ({ event, target }: CalendarDragPayload) => {
      const row = event.raw as ScheduledSocialPost
      if (target.type === 'custom' && target.id === 'unscheduled-bin') {
        if (row.scheduled_at) await handleUnscheduleClick(row)
        return
      }
      if (target.type === 'month-day') {
        openScheduleDialogForDrop(row, target.day)
        return
      }
      if (target.type === 'week-hour' || target.type === 'day-hour') {
        await handleDropToHour(row, target.day, target.hour)
      }
    },
    [handleDropToHour, openScheduleDialogForDrop],
  )

  return (
    <CalendarBoard
      events={scheduledEvents}
      draggableEvents={unscheduledEvents}
      renderMonthEvent={(event, ctx) => (
        <PostMonthEvent row={event.raw as ScheduledSocialPost} compact={ctx.compact} />
      )}
      renderHourEvent={(event, ctx) => (
        <PostMonthEvent row={event.raw as ScheduledSocialPost} compact={ctx.compact} />
      )}
      renderDayEvent={(event) => <PostDayEvent row={event.raw as ScheduledSocialPost} />}
      renderMonthDayHoverCard={({ events }) => (
        <div className="gap-spacing-1 px-spacing-2 flex flex-col">
          {events.map((event) => {
            const row = event.raw as ScheduledSocialPost
            const timeLabel = new Date(event.start).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            })
            return (
              <div
                key={event.id}
                className="hover:bg-hover-subtle px-spacing-1 py-spacing-1 flex min-w-0 items-start gap-2 rounded-md"
              >
                <div className="shrink-0">
                  <SchedulePostThumbnail row={row} size="sm" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="body-3 text-foreground truncate">{getPostTitle(row)}</div>
                  <div className="typo-caption text-muted-foreground">
                    {timeLabel} · {row.platform} · {row.post_type.replace(/_/g, ' ')}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      onDrop={handleCalendarDrop}
    >
      {({ selectedEvents }) => (
        <>
          <div className="border-border min-h-[160px] overflow-auto rounded-lg border">
            {selectedEvents.length === 0 ? (
              <div className="body-3 text-muted-foreground px-3 py-6">No scheduled content</div>
            ) : (
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
                  {selectedEvents.map((event) => (
                    <SelectedTableRow
                      key={event.id}
                      event={event as CalendarEvent<ScheduledSocialPost>}
                      workingId={workingId}
                      onOpenScheduleDialog={openScheduleDialog}
                      onUnschedule={handleUnscheduleClick}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="border-border min-h-[120px] overflow-auto rounded-lg border">
            <div className="body-3 text-muted-foreground border-border border-b px-3 py-2">
              Unscheduled posts
            </div>
            <div className="p-2">
              <CalendarDroppable id="unscheduled-bin" className="min-h-[72px]">
                {unscheduledEvents.length === 0 ? (
                  <div className="body-3 text-muted-foreground px-1 py-2">No unscheduled posts</div>
                ) : (
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {unscheduledEvents.map((event) => (
                      <UnscheduledCard key={event.id} event={event} />
                    ))}
                  </div>
                )}
              </CalendarDroppable>
            </div>
          </div>

          <DialogPrimitive.Root
            open={scheduleTarget !== null}
            onOpenChange={(open) => {
              if (!open) setScheduleTarget(null)
            }}
          >
            <DialogPrimitive.Portal>
              <DialogPrimitive.Overlay className="z-modal-backdrop bg-modal-overlay fixed inset-0" />
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
                        className="btn-icon-bare"
                      >
                        <X className="icon-xs" />
                      </button>
                    </div>
                    {scheduleTarget && (
                      <p className="body-3 text-muted-foreground mt-spacing-1 truncate">
                        {getPostTitle(scheduleTarget)}
                      </p>
                    )}
                  </div>
                  <div className="px-spacing-6 py-spacing-4">
                    <label className="body-2 mb-spacing-2 block">Date & Time</label>
                    <input
                      type="datetime-local"
                      value={scheduleValue}
                      onChange={(e) => setScheduleValue(e.target.value)}
                      className="h-spacing-9 px-spacing-3 body-3 rounded-spacing-2 border-border bg-background text-foreground focus:ring-ring w-full border outline-none focus:ring-2"
                    />
                  </div>
                  <div className="px-spacing-6 py-spacing-4 border-border flex items-center justify-between border-t">
                    <button
                      type="button"
                      onClick={() => setScheduleTarget(null)}
                      className="button-default button-glass-neutral"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleScheduleConfirm()}
                      disabled={!scheduleValue}
                      className="button-default button-glass-primary disabled:opacity-50"
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
          </DialogPrimitive.Root>
        </>
      )}
    </CalendarBoard>
  )
}
