'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef } from 'react'
import {
  useGlobalChatStore,
  type MeetingPostCallReview,
} from '@/components/global-chat/store/use-global-chat-store'
import { useShellStore } from '@/components/shell/use-shell-store'
import {
  MEETING_FOLLOW_UP_REVIEW_PARAM,
  MEETING_FOLLOW_UP_REVIEW_VALUE,
} from '@/features/home/config/meeting-post-call-actions.config'

/** Open the linked meeting chat once when Pixel's Slack review link is followed. */
export function useMeetingFollowUpReviewEntry(input: {
  spaceId: string
  meetingItemId: string
  conversationId: string | null
  meetingTitle: string
  awarenessContext: string
  timelineVersion: number
  review: MeetingPostCallReview | null
}): void {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const openChatDrawer = useShellStore((state) => state.openChatDrawer)
  const continueMeetingConversation = useGlobalChatStore(
    (state) => state.continueMeetingConversation,
  )
  const startPostCallReview = useGlobalChatStore((state) => state.startPostCallReview)
  const openedRef = useRef<string | null>(null)
  const searchParamsKey = searchParams.toString()

  useEffect(() => {
    const conversationId = input.conversationId?.trim()
    const params = new URLSearchParams(searchParamsKey)
    if (
      !conversationId ||
      !input.review ||
      params.get(MEETING_FOLLOW_UP_REVIEW_PARAM) !== MEETING_FOLLOW_UP_REVIEW_VALUE
    ) {
      return
    }

    const entryKey = `${input.spaceId}:${input.meetingItemId}:${conversationId}`
    if (openedRef.current === entryKey) return
    openedRef.current = entryKey

    continueMeetingConversation({
      spaceId: input.spaceId,
      meetingItemId: input.meetingItemId,
      conversationId,
      meetingTitle: input.meetingTitle,
      awarenessContext: input.awarenessContext,
      timelineVersion: input.timelineVersion,
    })
    openChatDrawer(conversationId)
    startPostCallReview(input.review)

    params.delete(MEETING_FOLLOW_UP_REVIEW_PARAM)
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [
    continueMeetingConversation,
    input.awarenessContext,
    input.conversationId,
    input.meetingItemId,
    input.meetingTitle,
    input.review,
    input.spaceId,
    input.timelineVersion,
    openChatDrawer,
    pathname,
    router,
    searchParamsKey,
    startPostCallReview,
  ])
}
