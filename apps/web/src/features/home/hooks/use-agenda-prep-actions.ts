'use client'

import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { HOME_TOAST_ERRORS, HOME_TOAST_SUCCESS } from '@/features/home/config/home-toast-errors.config'
import { minimalSpaceYourTurnItem } from '@/features/home/lib/home-your-turn-item'
import { resolveMeetingsSpaceId } from '@/features/home/lib/resolve-meetings-space-id'
import type { YourTurnItem } from '@/features/spaces/services/your-turn.service'
import {
  runMeetingsPrecallPrepEvent,
  runMeetingsPrecallPrepToday,
  type CalendarAgendaEvent,
} from '@/lib/services/calendar-api'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'

export function useAgendaPrepActions(input: {
  timezone: string
  activeOrgId: string | null
  onOpenItem?: (item: YourTurnItem) => void | Promise<void>
  reloadAgenda: () => Promise<void>
}) {
  const { timezone, activeOrgId, onOpenItem, reloadAgenda } = input
  const [prepRunning, setPrepRunning] = useState(false)

  const openPrepItem = useCallback(
    (ev: CalendarAgendaEvent) => {
      if (!ev.prep || !onOpenItem) return
      void onOpenItem(
        minimalSpaceYourTurnItem(
          ev.prep.space_id,
          ev.prep.space_item_id,
          ev.prep.title ?? `Prep — ${ev.title}`,
          activeOrgId,
        ),
      )
    },
    [activeOrgId, onOpenItem],
  )

  const runPrepForEvent = useCallback(
    async (ev: CalendarAgendaEvent) => {
      const spaceId = resolveMeetingsSpaceId()
      if (!spaceId) {
        toast.error(HOME_TOAST_ERRORS.MEETINGS_SPACE_REQUIRED.userMessage)
        return
      }
      setPrepRunning(true)
      try {
        const result = await runMeetingsPrecallPrepEvent({
          spaceId,
          calendarEventId: ev.id,
          timezone,
          refresh: true,
        })
        toast.success(HOME_TOAST_SUCCESS.PREP_STARTED.userMessage)
        await reloadAgenda()
        if (onOpenItem) {
          void onOpenItem(
            minimalSpaceYourTurnItem(spaceId, result.space_item_id, result.title, activeOrgId),
          )
        }
      } catch (error) {
        toast.error(sanitizeUserError(error, HOME_TOAST_ERRORS.PREP_START_FAILED.userMessage))
      } finally {
        setPrepRunning(false)
      }
    },
    [activeOrgId, onOpenItem, reloadAgenda, timezone],
  )

  const handlePrepClick = useCallback(
    (ev: CalendarAgendaEvent) => {
      if (!ev.prep || ev.prep.status === 'failed') {
        void runPrepForEvent(ev)
        return
      }
      openPrepItem(ev)
    },
    [openPrepItem, runPrepForEvent],
  )

  const runPrepToday = useCallback(async () => {
    const spaceId = resolveMeetingsSpaceId()
    if (!spaceId) {
      toast.error(HOME_TOAST_ERRORS.MEETINGS_SPACE_REQUIRED.userMessage)
      return
    }
    setPrepRunning(true)
    try {
      const result = await runMeetingsPrecallPrepToday({
        spaceId,
        timezone,
        refresh: true,
      })
      toast.success(
        `Prep started for today (${result.created + result.refreshed} meeting${
          result.created + result.refreshed === 1 ? '' : 's'
        }).`,
      )
      await reloadAgenda()
    } catch (error) {
      toast.error(sanitizeUserError(error, HOME_TOAST_ERRORS.PREP_START_FAILED.userMessage))
    } finally {
      setPrepRunning(false)
    }
  }, [reloadAgenda, timezone])

  return { prepRunning, handlePrepClick, runPrepToday }
}
