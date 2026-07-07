'use client'

import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  buildLocalDateFromDayAndHour,
  CalendarBoard,
  type CalendarDragPayload,
  type CalendarEvent,
} from '@/components/calendar'
import type { TeamRosterEntry } from '@/lib/team/team-roster-api'
import { SchedulePostThumbnail } from '@/features/studio/components/preview/schedule/schedule-thumbnail'
import { useScheduleData } from '@/features/studio/components/preview/schedule/useScheduleData'
import type { ScheduledSocialPost } from '@/features/studio/services/artifact-preview.service'
import {
  updateCalendarEvent,
  type CalendarAgendaEvent,
  type CalendarProvider,
} from '@/lib/services/calendar-api'
import { SpacesScheduleDateTimeModal } from '../../components/cells/date-picker/SpacesScheduleDateTimeModal'
import type { MissionSendOptions } from '../../components/cells/MissionSendDropdown'
import { toFieldPatch } from '../../components/space-item-values'
import {
  SPACES_CALENDAR_TOAST_ERRORS,
  SPACES_CALENDAR_TOAST_SUCCESS,
} from '../../config/spaces-toast-errors.config'
import {
  nextSpacesScheduleDefault,
  parseLocalSpacesScheduleValue,
  toLocalSpacesScheduleValue,
} from '../../lib/spaces-schedule-datetime'
import type { SpaceItem } from '../../types'
import type { CalendarConfig, FieldDef, SelectOption, ViewDef } from '../../types/space-schema'
import {
  isCalendarSourceVisible,
  normalizeCalendarSources,
  type SpaceCalendarSourceId,
} from './calendar-source-utils'
import {
  CalendarHourEvent,
  CalendarMonthEvent,
  MonthDayHoverCardBody,
  SOCIAL_PLATFORM_LOGO_SRC,
  isSameRescheduleDay,
  providerEventToEvent,
  spaceItemToEvent,
} from './SpaceCalendarEventRenderers'
import { SpaceCalendarDayTaskList } from './SpaceCalendarDayTaskList'
import { SpaceCalendarSelectedDayPanel } from './SpaceCalendarSelectedDayPanel'
import { useSpaceCalendarExternalEvents } from './useSpaceCalendarExternalEvents'

interface SpaceCalendarViewProps {
  view: ViewDef
  items: SpaceItem[]
  fieldsById: Map<string, FieldDef>
  visibleFields: FieldDef[]
  allFields: FieldDef[]
  roster: TeamRosterEntry[]
  currentUserId: string | null
  campaignId: string | null
  readOnly?: boolean
  onUpdateItem: (itemId: string, payload: Partial<SpaceItem>) => Promise<void>
  onCreateItem?: (title: string, extra?: Record<string, unknown>) => Promise<SpaceItem | null>
  onDeleteItem: (itemId: string) => void | Promise<void>
  onPushToAgent: (itemId: string, options?: MissionSendOptions) => Promise<void>
  onViewChange: (patch: Partial<ViewDef>) => Promise<void>
  onOpenDetail: (item: SpaceItem) => void
  onAddField?: () => void
  onCreateOption?: (fieldId: string, option: SelectOption) => void
  onUpdateOption?: (fieldId: string, optionId: string, updates: Partial<SelectOption>) => void
  onDeleteOption?: (fieldId: string, optionId: string) => void
  onTagCustomSwatchesChange?: (fieldId: string, swatches: string[]) => void
  onEditStatuses?: () => void
  onEditCategories?: () => void
  /** Open the social post in the artifact preview slide-over (full preview). */
  onOpenSocialPost?: (postId: string, title: string) => void
}

const DEFAULT_CALENDAR_CONFIG: Required<
  Pick<
    CalendarConfig,
    'date_field' | 'default_zoom' | 'week_start' | 'source_mode' | 'show_task_list' | 'time_format'
  >
> = {
  date_field: 'due_date',
  default_zoom: 'month',
  week_start: 1,
  source_mode: 'space_items',
  show_task_list: true,
  time_format: '12h',
}

function socialPostShortTitle(row: ScheduledSocialPost): string {
  const text = (row.caption?.trim() || row.headline?.trim() || 'Untitled post').replace(/\s+/g, ' ')
  const dot = text.indexOf('.')
  if (dot > 0 && dot < 120) return text.slice(0, dot + 1)
  if (text.length > 80) return `${text.slice(0, 80)}...`
  return text
}

function socialPostToEvent(row: ScheduledSocialPost): CalendarEvent<ScheduledSocialPost> | null {
  if (!row.scheduled_at) return null
  return {
    id: `social-post:${row.id}`,
    sourceId: 'campaign_social_posts',
    start: row.scheduled_at,
    title: socialPostShortTitle(row),
    subtitle: `${row.platform} · ${row.post_type.replace(/_/g, ' ')}`,
    thumbnail: <SchedulePostThumbnail row={row} size="sm" />,
    draggable: true,
    raw: row,
  }
}

export function SpaceCalendarView({
  view,
  items,
  fieldsById,
  visibleFields,
  allFields,
  roster,
  currentUserId,
  campaignId,
  readOnly = false,
  onUpdateItem,
  onCreateItem,
  onDeleteItem,
  onPushToAgent,
  onViewChange,
  onOpenDetail,
  onAddField,
  onCreateOption,
  onUpdateOption,
  onDeleteOption,
  onTagCustomSwatchesChange,
  onEditStatuses,
  onEditCategories,
  onOpenSocialPost,
}: SpaceCalendarViewProps) {
  const calendarConfig = view.calendar_config ?? {}
  const dateField = calendarConfig.date_field ?? DEFAULT_CALENDAR_CONFIG.date_field
  const defaultZoom = calendarConfig.default_zoom ?? DEFAULT_CALENDAR_CONFIG.default_zoom
  const weekStart = calendarConfig.week_start ?? DEFAULT_CALENDAR_CONFIG.week_start
  const showTaskList = calendarConfig.show_task_list ?? DEFAULT_CALENDAR_CONFIG.show_task_list
  const timeFormat = calendarConfig.time_format ?? DEFAULT_CALENDAR_CONFIG.time_format
  const socialPlatformFilters = calendarConfig.social_platform_filters ?? []
  const visibleSources = useMemo(() => normalizeCalendarSources(calendarConfig), [calendarConfig])
  const isSourceVisible = useCallback(
    (sourceId: SpaceCalendarSourceId) => isCalendarSourceVisible(calendarConfig, sourceId),
    [calendarConfig],
  )
  const showSpaceItems = isSourceVisible('space_items')
  const showSocial = Boolean(campaignId && isSourceVisible('campaign_social_posts'))
  const externalProviders = useMemo<CalendarProvider[]>(
    () =>
      visibleSources
        .filter((source) => source.visible)
        .map((source) => source.id)
        .filter(
          (sourceId): sourceId is CalendarProvider =>
            sourceId === 'google_calendar' || sourceId === 'outlook',
        ),
    [visibleSources],
  )
  const timezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', [])
  const [visibleWindow, setVisibleWindow] = useState<{ start: Date; end: Date } | null>(null)
  const scheduleState = useScheduleData({
    campaignId: campaignId ?? '',
    enabled: showSocial,
  })
  const externalCalendarState = useSpaceCalendarExternalEvents({
    visibleWindow,
    providers: externalProviders,
    timezone,
    enabled: externalProviders.length > 0,
  })
  const statusField = useMemo(() => allFields.find((f) => f.id === 'status'), [allFields])

  const renderMonthDayHoverCard = useCallback(
    ({ events }: { day: Date; events: CalendarEvent[] }) => (
      <MonthDayHoverCardBody events={events} statusField={statusField} />
    ),
    [statusField],
  )

  const [rescheduleTarget, setRescheduleTarget] = useState<ScheduledSocialPost | null>(null)
  const [rescheduleValue, setRescheduleValue] = useState('')
  const [rescheduleWorking, setRescheduleWorking] = useState(false)

  const openRescheduleDialog = useCallback((row: ScheduledSocialPost) => {
    const seed = row.scheduled_at ? new Date(row.scheduled_at) : nextSpacesScheduleDefault()
    setRescheduleValue(toLocalSpacesScheduleValue(seed))
    setRescheduleTarget(row)
  }, [])

  const handleRescheduleConfirm = useCallback(async () => {
    if (!rescheduleTarget || !rescheduleValue) return
    const parsed = parseLocalSpacesScheduleValue(rescheduleValue)
    if (!parsed) return
    setRescheduleWorking(true)
    const tid = toast.loading('Rescheduling...')
    try {
      await scheduleState.schedulePost(rescheduleTarget.id, parsed.toISOString())
      toast.success('Post rescheduled', { id: tid })
      setRescheduleTarget(null)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to reschedule post'
      toast.error(msg, { id: tid })
    } finally {
      setRescheduleWorking(false)
    }
  }, [rescheduleTarget, rescheduleValue, scheduleState])

  const rescheduleSelectedDate = parseLocalSpacesScheduleValue(rescheduleValue)
  const scheduledOnRescheduleDay = useMemo(() => {
    if (!rescheduleSelectedDate) return []
    return scheduleState.rows
      .filter((row) => {
        if (!row.scheduled_at) return false
        if (rescheduleTarget && row.id === rescheduleTarget.id) return false
        const scheduled = new Date(row.scheduled_at)
        if (Number.isNaN(scheduled.getTime())) return false
        return isSameRescheduleDay(scheduled, rescheduleSelectedDate)
      })
      .sort(
        (a, b) =>
          new Date(a.scheduled_at ?? '').getTime() - new Date(b.scheduled_at ?? '').getTime(),
      )
  }, [rescheduleSelectedDate, rescheduleTarget, scheduleState.rows])

  const handleSocialUnschedule = useCallback(
    async (row: ScheduledSocialPost) => {
      const tid = toast.loading('Unscheduling...')
      try {
        await scheduleState.unschedulePost(row.id)
        toast.success('Post unscheduled', { id: tid })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to unschedule post'
        toast.error(msg, { id: tid })
      }
    },
    [scheduleState],
  )

  const spaceEvents = useMemo(() => {
    if (!showSpaceItems) return []
    return items
      .map((item) => spaceItemToEvent(item, dateField))
      .filter((event): event is CalendarEvent<SpaceItem> => Boolean(event))
  }, [dateField, items, showSpaceItems])

  const socialEvents = useMemo(() => {
    if (!showSocial) return []
    return scheduleState.rows
      .filter(
        (row) =>
          socialPlatformFilters.length === 0 ||
          socialPlatformFilters.includes(row.platform as 'linkedin' | 'instagram'),
      )
      .map(socialPostToEvent)
      .filter((event): event is CalendarEvent<ScheduledSocialPost> => Boolean(event))
  }, [scheduleState.rows, showSocial, socialPlatformFilters])

  const externalEvents = useMemo(
    () => externalCalendarState.events.map(providerEventToEvent),
    [externalCalendarState.events],
  )

  const events = useMemo<CalendarEvent[]>(
    () => [...spaceEvents, ...socialEvents, ...externalEvents],
    [externalEvents, spaceEvents, socialEvents],
  )

  const handleDrop = useCallback(
    async ({ event, target }: CalendarDragPayload) => {
      if (readOnly) return
      if (target.type === 'custom') return
      const currentStart = new Date(event.start)
      const minute = Number.isNaN(currentStart.getTime()) ? 0 : currentStart.getMinutes()
      const hour =
        target.type === 'month-day'
          ? Number.isNaN(currentStart.getTime())
            ? 9
            : currentStart.getHours()
          : target.hour
      const nextStartDate = buildLocalDateFromDayAndHour(target.day, hour, minute)
      const nextStart = nextStartDate.toISOString()

      if (event.sourceId === 'space_items') {
        const item = event.raw as SpaceItem
        if (event.end) {
          const oldStart = new Date(event.start)
          const oldEnd = new Date(event.end)
          const duration = Math.max(0, oldEnd.getTime() - oldStart.getTime())
          const nextEnd = new Date(nextStartDate.getTime() + duration).toISOString()
          await onUpdateItem(item.id, { start_date: nextStart, due_date: nextEnd })
        } else {
          await onUpdateItem(item.id, toFieldPatch(item, dateField, nextStart))
        }
        toast.success('Task moved')
        return
      }

      if (event.sourceId === 'campaign_social_posts') {
        const row = event.raw as ScheduledSocialPost
        await scheduleState.schedulePost(row.id, nextStart)
        toast.success('Post rescheduled')
        return
      }

      if (event.sourceId === 'google_calendar' || event.sourceId === 'outlook') {
        const row = event.raw as CalendarAgendaEvent
        if (row.all_day) return
        const oldStart = new Date(event.start)
        const oldEnd = event.end ? new Date(event.end) : null
        const duration =
          oldEnd && !Number.isNaN(oldStart.getTime()) && !Number.isNaN(oldEnd.getTime())
            ? Math.max(30 * 60 * 1000, oldEnd.getTime() - oldStart.getTime())
            : 60 * 60 * 1000
        const nextEnd = new Date(nextStartDate.getTime() + duration).toISOString()
        try {
          await updateCalendarEvent(event.sourceId, row.id, {
            start: nextStart,
            end: nextEnd,
            timezone,
          })
          await externalCalendarState.reload()
          toast.success(SPACES_CALENDAR_TOAST_SUCCESS.PROVIDER_EVENT_UPDATED.userMessage)
        } catch {
          toast.error(SPACES_CALENDAR_TOAST_ERRORS.UPDATE_PROVIDER_EVENT_FAILED.userMessage)
        }
      }
    },
    [dateField, externalCalendarState, onUpdateItem, readOnly, scheduleState, timezone],
  )

  const handleResizeEnd = useCallback(
    async ({ event, end }: { event: CalendarEvent; end: string }) => {
      if (readOnly) return
      if (event.sourceId === 'space_items') {
        const item = event.raw as SpaceItem
        await onUpdateItem(item.id, { due_date: end })
        toast.success('Task duration updated')
        return
      }
      if (event.sourceId === 'google_calendar' || event.sourceId === 'outlook') {
        const row = event.raw as CalendarAgendaEvent
        if (row.all_day) return
        try {
          await updateCalendarEvent(event.sourceId, row.id, { end, timezone })
          await externalCalendarState.reload()
          toast.success(SPACES_CALENDAR_TOAST_SUCCESS.PROVIDER_EVENT_UPDATED.userMessage)
        } catch {
          toast.error(SPACES_CALENDAR_TOAST_ERRORS.UPDATE_PROVIDER_EVENT_FAILED.userMessage)
        }
      }
    },
    [externalCalendarState, onUpdateItem, readOnly, timezone],
  )

  const dateFieldName = fieldsById.get(dateField)?.name ?? dateField.replace(/_/g, ' ')

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4">
      <CalendarBoard
        events={events}
        defaultScope={defaultZoom}
        weekStart={weekStart}
        timeFormat={timeFormat}
        readOnly={readOnly}
        onDrop={handleDrop}
        onResizeEnd={handleResizeEnd}
        onVisibleWindowChange={setVisibleWindow}
        renderMonthDayHoverCard={renderMonthDayHoverCard}
        renderMonthEvent={(event, ctx) => (
          <CalendarMonthEvent event={event} ctx={ctx} statusField={statusField} />
        )}
        renderHourEvent={(event, ctx) => (
          <CalendarHourEvent event={event} ctx={ctx} statusField={statusField} />
        )}
        renderDayEvent={(event, ctx) => (
          <CalendarHourEvent event={event} ctx={ctx} statusField={statusField} />
        )}
      >
        {showTaskList || showSocial || externalProviders.length > 0
          ? ({ selectedDay, selectedEvents }) => (
              <SpaceCalendarSelectedDayPanel
                day={selectedDay}
                selectedEvents={selectedEvents}
                dateField={dateField}
                readOnly={readOnly}
                showTasks={showTaskList && showSpaceItems}
                showSocial={showSocial}
                showExternal={externalProviders.length > 0}
                onCreateItem={onCreateItem}
                onOpenSocialPost={onOpenSocialPost}
                onRescheduleSocialPost={openRescheduleDialog}
                onUnscheduleSocialPost={(post) => void handleSocialUnschedule(post)}
                taskList={
                  showSpaceItems ? (
                    <SpaceCalendarDayTaskList
                      day={selectedDay}
                      items={items}
                      dateField={dateField}
                      dateFieldLabel={dateFieldName}
                      visibleFields={visibleFields}
                      allFields={allFields}
                      roster={roster}
                      currentUserId={currentUserId}
                      activeView={view}
                      readOnly={readOnly}
                      onViewChange={onViewChange}
                      onUpdateItem={onUpdateItem}
                      onDeleteItem={onDeleteItem}
                      onPushToAgent={onPushToAgent}
                      onOpenDetail={onOpenDetail}
                      onAddField={onAddField}
                      onCreateOption={onCreateOption}
                      onUpdateOption={onUpdateOption}
                      onDeleteOption={onDeleteOption}
                      onTagCustomSwatchesChange={onTagCustomSwatchesChange}
                      onEditStatuses={onEditStatuses}
                      onEditCategories={onEditCategories}
                    />
                  ) : null
                }
              />
            )
          : undefined}
      </CalendarBoard>

      <SpacesScheduleDateTimeModal
        open={rescheduleTarget !== null}
        onOpenChange={(next) => {
          if (!next && !rescheduleWorking) setRescheduleTarget(null)
        }}
        title="Reschedule Post"
        subtitle={
          rescheduleTarget
            ? rescheduleTarget.caption?.trim() || rescheduleTarget.headline?.trim() || 'Social Post'
            : null
        }
        value={rescheduleValue}
        onChange={setRescheduleValue}
        onConfirm={() => void handleRescheduleConfirm()}
        working={rescheduleWorking}
        sidePanel={
          <div className="gap-spacing-3 p-spacing-3 flex flex-col">
            <div>
              <div className="typo-caption text-muted-foreground mb-spacing-2 font-medium uppercase tracking-wider">
                Scheduled this day
              </div>
              <div className="gap-spacing-1 flex max-h-[240px] flex-col overflow-y-auto">
                {scheduledOnRescheduleDay.length === 0 ? (
                  <div className="typo-caption text-muted-foreground rounded-spacing-2 border-border px-spacing-2 py-spacing-2 border">
                    No posts scheduled
                  </div>
                ) : (
                  scheduledOnRescheduleDay.map((row) => (
                    <div
                      key={row.id}
                      className="hover:bg-hover-subtle rounded-spacing-2 gap-spacing-2 px-spacing-2 py-spacing-1-5 flex min-w-0 items-center"
                    >
                      <img
                        src={SOCIAL_PLATFORM_LOGO_SRC[row.platform]}
                        alt=""
                        className="h-4 w-4 shrink-0 rounded"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="body-4 text-foreground truncate">
                          {socialPostShortTitle(row)}
                        </div>
                        <div className="typo-caption text-muted-foreground">
                          {row.scheduled_at
                            ? new Date(row.scheduled_at).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : null}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        }
      />
    </div>
  )
}
