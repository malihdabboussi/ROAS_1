'use client'

import dynamic from 'next/dynamic'
import type { ComponentProps } from 'react'
import { AgendaCard } from '@/features/home/components/AgendaCard'
import { ApprovalQueueCard } from '@/features/home/components/cards/ApprovalQueueCard'
import { FavoriteCampaignsCard } from '@/features/home/components/cards/FavoriteCampaignsCard'
import { FavoriteConversationsCard } from '@/features/home/components/cards/FavoriteConversationsCard'
import { FavoriteSpacesCard } from '@/features/home/components/cards/FavoriteSpacesCard'
import { InboxFeedCard } from '@/features/home/components/cards/InboxFeedCard'
import { MyTasksCard } from '@/features/home/components/cards/MyTasksCard'
import { NotificationFeedCard } from '@/features/home/components/cards/NotificationFeedCard'
import { OrgPulseCard } from '@/features/home/components/cards/OrgPulseCard'
import { RecentCommunicationsCard } from '@/features/home/components/cards/RecentCommunicationsCard'
import { CompletedSpaceAutomationsCard } from '@/features/home/components/CompletedSpaceAutomationsCard'
import { usePersistedHomeFeedScope } from '@/features/home/components/HomeFeedScopePicker'
import { RecentAgentConversationsCard } from '@/features/home/components/RecentAgentConversationsCard'
import type { HomeCardId } from '@/features/home/types/home-cards'
import type { HomeFeedScopeState } from '@/features/home/types/home-feed-scope'
import type { CalendarAgendaEvent } from '@/lib/services/calendar-api'

const ChatComposerCard = dynamic(() =>
  import('@/features/home/components/cards/ChatComposerCard').then(
    (module) => module.ChatComposerCard,
  ),
)

type HomeRendererYourTurnItem = ComponentProps<typeof MyTasksCard>['items'][number]
type HomeRendererNotification = Parameters<
  NonNullable<ComponentProps<typeof NotificationFeedCard>['onNotificationClick']>
>[0]

export function HomeCardRenderer({
  cardId,
  myTasksScope,
  updateMyTasksScope,
  approvalScope,
  updateApprovalScope,
  myTasksLoading,
  approvalLoading,
  myTasksItems,
  approvalItems,
  onOpenItem,
  onOpenMeeting,
  onExpandMyTasks,
  onNotificationClick,
  onAccept,
  onDismiss,
}: {
  cardId: HomeCardId
  myTasksScope: HomeFeedScopeState
  updateMyTasksScope: (patch: Partial<HomeFeedScopeState>) => void
  approvalScope: HomeFeedScopeState
  updateApprovalScope: (patch: Partial<HomeFeedScopeState>) => void
  myTasksLoading: boolean
  approvalLoading: boolean
  myTasksItems: HomeRendererYourTurnItem[]
  approvalItems: HomeRendererYourTurnItem[]
  onOpenItem: (item: HomeRendererYourTurnItem) => void | Promise<void>
  onOpenMeeting?: (event: CalendarAgendaEvent) => void
  onExpandMyTasks: () => void
  onNotificationClick: (notification: HomeRendererNotification) => void | Promise<void>
  onMyTasksChanged?: () => void
  onAccept: (item: HomeRendererYourTurnItem) => void | Promise<void>
  onDismiss: (item: HomeRendererYourTurnItem) => void | Promise<void>
}) {
  switch (cardId) {
    case 'favorite_spaces':
      return <FavoriteSpacesCard />
    case 'favorite_conversations':
      return <FavoriteConversationsCard />
    case 'favorite_campaigns':
      return <FavoriteCampaignsCard />
    case 'my_tasks':
      return (
        <MyTasksCard
          scope={myTasksScope}
          updateScope={updateMyTasksScope}
          loading={myTasksLoading}
          items={myTasksItems}
          onOpen={onOpenItem}
          onExpand={onExpandMyTasks}
        />
      )
    case 'approval_queue':
      return (
        <ApprovalQueueCard
          scope={approvalScope}
          updateScope={updateApprovalScope}
          loading={approvalLoading}
          items={approvalItems}
          onOpen={onOpenItem}
          onAccept={onAccept}
          onDismiss={onDismiss}
        />
      )
    case 'notification_feed':
      return <NotificationFeedCard onNotificationClick={onNotificationClick} />
    case 'org_pulse':
      return <OrgPulseCard />
    case 'recent_communications':
      return <RecentCommunicationsCard />
    case 'recent_conversations':
      return <RecentAgentConversationsCard />
    case 'completed_automations':
      return <CompletedSpaceAutomationsCard />
    case 'agenda':
      return <AgendaCard onOpenItem={onOpenItem} onOpenMeeting={onOpenMeeting} />
    case 'inbox_feed':
      return <InboxFeedCard />
    case 'chat_composer':
      return <ChatComposerCard />
    default:
      return null
  }
}

export function useHomeCardFeedScopes() {
  const myTasks = usePersistedHomeFeedScope('my_tasks')
  const approval = usePersistedHomeFeedScope('approval_queue')
  return { myTasks, approval }
}
