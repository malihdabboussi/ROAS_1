'use client'

import { useEffect } from 'react'
import { useShellStore } from '@/components/shell/use-shell-store'
import {
  HOME_MEETING_WORK_RESTORE_FEATURE,
  isCalendarAgendaEventLike,
} from '@/features/home/lib/home-meeting-work-restore'
import type { CalendarAgendaEvent } from '@/lib/services/calendar-api'

export function useHomeMeetingWorkRestore(openMeetingEvent: (event: CalendarAgendaEvent) => void) {
  const pendingWorkRestore = useShellStore((state) => state.pendingWorkRestore)
  const consumePendingWorkRestore = useShellStore((state) => state.consumePendingWorkRestore)

  useEffect(() => {
    if (pendingWorkRestore?.feature !== HOME_MEETING_WORK_RESTORE_FEATURE) return
    const restore = consumePendingWorkRestore(HOME_MEETING_WORK_RESTORE_FEATURE)
    if (!restore || !isCalendarAgendaEventLike(restore.data)) return
    openMeetingEvent(restore.data as CalendarAgendaEvent)
  }, [consumePendingWorkRestore, openMeetingEvent, pendingWorkRestore])
}
