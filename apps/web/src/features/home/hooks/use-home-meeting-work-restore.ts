'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { useShellStore } from '@/components/shell/use-shell-store'
import { agendaListFetchWindow } from '@/features/home/lib/agenda-fetch-window'
import {
  agendaEventMatchesMeetingParam,
  HOME_MEETING_PARAM,
  HOME_MEETING_WORK_RESTORE_FEATURE,
  isCalendarAgendaEventLike,
} from '@/features/home/lib/home-meeting-work-restore'
import { cachedFetch } from '@/lib/cache/keyed-fetch-cache'
import { useOrgStore } from '@/lib/org'
import { fetchCalendarAgenda, type CalendarAgendaEvent } from '@/lib/services/calendar-api'

const AGENDA_CACHE_TTL_MS = 90_000

/**
 * Route-side owner of the `?meeting=` identity param. Opens the identified
 * meeting on landing — from the in-memory restore payload when one is in
 * flight, else from the agenda (matching the agenda card's cache) — keeps the
 * param in sync with the open meeting, and drops payloads the URL no longer
 * asks for so they can never fire on a later visit.
 */
export function useHomeMeetingWorkRestore(
  openMeetingEvent: (event: CalendarAgendaEvent) => void,
  activeMeetingEvent: CalendarAgendaEvent | null = null,
) {
  const pathname = usePathname() ?? '/home'
  const router = useRouter()
  const searchParams = useSearchParams()
  const meetingParam = searchParams.get(HOME_MEETING_PARAM)
  const activeOrgId = useOrgStore((s) => s.activeOrgId)
  const activeEventRef = useRef(activeMeetingEvent)
  /** Param currently driving an open — the URL leads and state follows. */
  const paramInFlightRef = useRef<string | null>(null)

  useEffect(() => {
    activeEventRef.current = activeMeetingEvent
  }, [activeMeetingEvent])

  // Param → meeting. Only param changes re-run this: a payload set for an
  // in-flight navigation must not be consumed or dropped on the old route.
  useEffect(() => {
    const { pendingWorkRestore, consumePendingWorkRestore } = useShellStore.getState()
    const restore =
      pendingWorkRestore?.feature === HOME_MEETING_WORK_RESTORE_FEATURE
        ? consumePendingWorkRestore(HOME_MEETING_WORK_RESTORE_FEATURE)
        : null
    const restoredEvent =
      restore && isCalendarAgendaEventLike(restore.data)
        ? (restore.data as CalendarAgendaEvent)
        : null
    if (!meetingParam) {
      paramInFlightRef.current = null
      return
    }
    const active = activeEventRef.current
    if (active && agendaEventMatchesMeetingParam(active, meetingParam)) return
    paramInFlightRef.current = meetingParam
    if (restoredEvent && agendaEventMatchesMeetingParam(restoredEvent, meetingParam)) {
      openMeetingEvent(restoredEvent)
      return
    }
    let cancelled = false
    const stripParam = () => {
      const params = new URLSearchParams(searchParams.toString())
      params.delete(HOME_MEETING_PARAM)
      const query = params.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    }
    void (async () => {
      try {
        const { fetchStart, fetchEnd } = agendaListFetchWindow(new Date(), 'week')
        const start = fetchStart.toISOString()
        const end = fetchEnd.toISOString()
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC'
        // Same key the agenda card uses so a warm agenda resolves instantly.
        const cacheKey = `calendar-agenda:${activeOrgId ?? 'personal'}:personal:${start}:${end}:${timezone}:all`
        const res = await cachedFetch(
          cacheKey,
          () =>
            fetchCalendarAgenda({
              start,
              end,
              timezone,
              scope: 'personal',
              orgId: activeOrgId,
            }),
          { ttlMs: AGENDA_CACHE_TTL_MS },
        )
        if (cancelled) return
        const match = (res.events ?? []).find((event) =>
          agendaEventMatchesMeetingParam(event, meetingParam),
        )
        if (match) openMeetingEvent(match)
        else stripParam()
      } catch {
        if (!cancelled) stripParam()
      }
    })()
    return () => {
      cancelled = true
    }
  }, [activeOrgId, meetingParam, openMeetingEvent, pathname, router, searchParams])

  // Meeting → param. Keeps recorded top-bar surfaces addressable and removes
  // the param when the meeting closes so it cannot reopen itself.
  useEffect(() => {
    if (meetingParam && paramInFlightRef.current === meetingParam) {
      if (activeMeetingEvent && agendaEventMatchesMeetingParam(activeMeetingEvent, meetingParam)) {
        paramInFlightRef.current = null
      }
      return
    }
    if (!activeMeetingEvent) {
      if (!meetingParam) return
      const params = new URLSearchParams(searchParams.toString())
      params.delete(HOME_MEETING_PARAM)
      const query = params.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
      return
    }
    if (meetingParam && agendaEventMatchesMeetingParam(activeMeetingEvent, meetingParam)) return
    const params = new URLSearchParams(searchParams.toString())
    params.set(HOME_MEETING_PARAM, activeMeetingEvent.id)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [activeMeetingEvent, meetingParam, pathname, router, searchParams])
}
