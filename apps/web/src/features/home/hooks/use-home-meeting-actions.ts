'use client'

import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { runMeetingsPrecallPrepEvent, type CalendarAgendaEvent } from '@/lib/services/calendar-api'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'
import type { YourTurnItem } from '@/lib/your-turn/types'
import { HOME_TOAST_ERRORS, HOME_TOAST_SUCCESS } from '../config/home-toast-errors.config'
import { minimalSpaceYourTurnItem } from '../lib/home-your-turn-item'
import { resolveMeetingsSpaceId } from '../lib/resolve-meetings-space-id'

export function useHomeMeetingActions({
  activeMeetingEvent,
  closeMeetingEvent,
  openYourTurnItem,
  openYourTurnItemFromMeeting,
}: {
  activeMeetingEvent: CalendarAgendaEvent | null
  closeMeetingEvent: () => void
  openYourTurnItem: (item: YourTurnItem) => void | Promise<void>
  openYourTurnItemFromMeeting: (item: YourTurnItem) => void
}) {
  const [meetingPrepBusy, setMeetingPrepBusy] = useState(false)

  const startMeetingPrep = useCallback(async () => {
    if (!activeMeetingEvent) return
    const spaceId = await resolveMeetingsSpaceId()
    if (!spaceId) {
      toast.error(HOME_TOAST_ERRORS.MEETINGS_SPACE_REQUIRED.userMessage)
      return
    }
    setMeetingPrepBusy(true)
    try {
      const result = await runMeetingsPrecallPrepEvent({
        spaceId,
        calendarEventId: activeMeetingEvent.id,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        refresh: true,
        event: {
          title: activeMeetingEvent.title,
          start: activeMeetingEvent.start,
          end: activeMeetingEvent.end,
          all_day: activeMeetingEvent.all_day,
          video_url: activeMeetingEvent.video_url,
          location: activeMeetingEvent.location,
          attendees: activeMeetingEvent.attendees.map((a) => ({
            email: a.email,
            name: a.name,
          })),
        },
      })
      toast.success(HOME_TOAST_SUCCESS.PREP_STARTED.userMessage)
      closeMeetingEvent()
      await openYourTurnItem(
        minimalSpaceYourTurnItem(spaceId, result.space_item_id, result.title, null),
      )
    } catch (error) {
      toast.error(sanitizeUserError(error, HOME_TOAST_ERRORS.PREP_START_FAILED.userMessage))
    } finally {
      setMeetingPrepBusy(false)
    }
  }, [activeMeetingEvent, closeMeetingEvent, openYourTurnItem])

  const openMeetingPrep = useCallback(() => {
    if (!activeMeetingEvent) return
    const prep = activeMeetingEvent.prep
    if (!prep || prep.status === 'failed') {
      void startMeetingPrep()
      return
    }
    openYourTurnItemFromMeeting(
      minimalSpaceYourTurnItem(
        prep.space_id,
        prep.space_item_id,
        prep.title ?? `Prep — ${activeMeetingEvent.title}`,
        null,
      ),
    )
  }, [activeMeetingEvent, openYourTurnItemFromMeeting, startMeetingPrep])

  return {
    meetingPrepBusy,
    startMeetingPrep,
    openMeetingPrep,
  }
}
