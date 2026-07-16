'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { HOME_TOAST_ERRORS } from '@/features/home/config/home-toast-errors.config'
import { resolveHomeNotificationOpenTarget } from '@/features/home/lib/home-notification-action'
import {
  minimalMissionSubtaskYourTurnItem,
  minimalSpaceYourTurnItem,
  normalizeYourTurnItemForHomeOpen,
} from '@/features/home/lib/home-your-turn-item'
import {
  fetchMissionById,
  markNotificationRead,
} from '@/features/mission-control/services/missions.service'
import type { Mission, UserNotification } from '@/features/mission-control/types'
import type { YourTurnItem } from '@/features/spaces/services/your-turn.service'
import type { CalendarAgendaEvent } from '@/lib/services/calendar-api'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'

export function useHomeFeedOpen() {
  const router = useRouter()
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null)
  const [activeYourTurnItem, setActiveYourTurnItem] = useState<YourTurnItem | null>(null)
  const [activeMeetingEvent, setActiveMeetingEvent] = useState<CalendarAgendaEvent | null>(null)

  const openMissionById = useCallback(async (missionId: string, orgId: string | null) => {
    try {
      const mission = await fetchMissionById(missionId, { orgId })
      setSelectedMission(mission)
    } catch (error) {
      toast.error(sanitizeUserError(error, HOME_TOAST_ERRORS.MISSION_NOT_FOUND.userMessage))
    }
  }, [])

  const openYourTurnItem = useCallback(
    async (item: YourTurnItem) => {
      const normalized = normalizeYourTurnItemForHomeOpen(item)

      if (normalized.kind === 'space_item' && normalized.space_id) {
        setActiveYourTurnItem(normalized)
        return
      }

      if (normalized.kind === 'mission_subtask') {
        setActiveYourTurnItem(normalized)
        return
      }

      if (normalized.kind === 'plan_approval' && normalized.mission_id) {
        await openMissionById(normalized.mission_id, normalized.org_id)
        return
      }
    },
    [openMissionById],
  )

  const openNotification = useCallback(
    async (notification: UserNotification) => {
      if (!notification.read_at) {
        await markNotificationRead(notification.id).catch(() => null)
      }

      const target = resolveHomeNotificationOpenTarget(notification)
      if (!target) return

      switch (target.type) {
        case 'mission':
          await openMissionById(target.missionId, target.orgId)
          return
        case 'space_task':
          setActiveYourTurnItem(
            minimalSpaceYourTurnItem(
              target.spaceId,
              target.itemId,
              notification.title,
              notification.org_id,
            ),
          )
          return
        case 'mission_subtask':
          setActiveYourTurnItem(
            minimalMissionSubtaskYourTurnItem(
              target.missionId,
              target.subtaskId,
              target.title,
              target.orgId,
            ),
          )
          return
        case 'external_url':
          router.push(target.url)
          return
      }
    },
    [openMissionById, router],
  )

  const closeMission = useCallback(() => setSelectedMission(null), [])
  const closeYourTurnItem = useCallback(() => setActiveYourTurnItem(null), [])
  const openMeetingEvent = useCallback((event: CalendarAgendaEvent) => {
    setActiveYourTurnItem(null)
    setActiveMeetingEvent(event)
  }, [])
  const closeMeetingEvent = useCallback(() => setActiveMeetingEvent(null), [])
  const openYourTurnItemFromMeeting = useCallback((item: YourTurnItem) => {
    setActiveMeetingEvent(null)
    setActiveYourTurnItem(normalizeYourTurnItemForHomeOpen(item))
  }, [])

  return {
    selectedMission,
    activeYourTurnItem,
    activeMeetingEvent,
    openMissionById,
    openYourTurnItem,
    openYourTurnItemFromMeeting,
    openMeetingEvent,
    openNotification,
    closeMission,
    closeYourTurnItem,
    closeMeetingEvent,
  }
}
