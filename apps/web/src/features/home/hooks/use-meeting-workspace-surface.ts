'use client'

import { useEffect } from 'react'
import { useGlobalChatStore } from '@/components/global-chat/store/use-global-chat-store'
import { useShellStore } from '@/components/shell/use-shell-store'
import {
  HOME_MEETING_WORK_RESTORE_FEATURE,
  homeMeetingHref,
} from '@/features/home/lib/home-meeting-work-restore'
import type { CalendarAgendaEvent } from '@/lib/services/calendar-api'

/** Stamp this meeting screen onto the linked chat and re-bind awareness when that chat is open. */
export function useMeetingWorkspaceSurface({
  spaceId,
  meetingItemId,
  conversationId,
  title,
  agendaEvent,
  awarenessContext,
  timelineVersion,
}: {
  spaceId: string
  meetingItemId: string
  conversationId: string | null
  title: string
  agendaEvent?: CalendarAgendaEvent | null
  awarenessContext: string
  timelineVersion: number
}): void {
  const recordWorkAreaPage = useShellStore((state) => state.recordWorkAreaPage)
  const drawerConversationId = useShellStore((state) => state.chatDrawer.conversationId)
  const continueMeetingConversation = useGlobalChatStore(
    (state) => state.continueMeetingConversation,
  )

  useEffect(() => {
    if (!conversationId) return
    const href = agendaEvent
      ? homeMeetingHref(agendaEvent, spaceId)
      : homeMeetingHref({ id: meetingItemId }, spaceId)
    recordWorkAreaPage(
      {
        id: href,
        title,
        href,
        ...(agendaEvent
          ? { restore: { feature: HOME_MEETING_WORK_RESTORE_FEATURE, data: agendaEvent } }
          : {}),
      },
      conversationId,
    )
    if (drawerConversationId !== conversationId) return
    continueMeetingConversation({
      spaceId,
      meetingItemId,
      conversationId,
      awarenessContext,
      timelineVersion,
    })
  }, [
    agendaEvent,
    awarenessContext,
    continueMeetingConversation,
    conversationId,
    drawerConversationId,
    meetingItemId,
    recordWorkAreaPage,
    spaceId,
    timelineVersion,
    title,
  ])
}
