'use client'

import { useHomeCardFeedScopes } from '@/features/home/components/cards/HomeCardRenderer'
import { HomeTaskDetailHost } from '@/features/home/components/HomeTaskDetailHost'
import { MyTasksPanel } from '@/features/home/components/MyTasksPanel'
import { useHomeFeedOpen } from '@/features/home/hooks/use-home-feed-open'
import { useYourTurnFeed } from '@/features/spaces/hooks/use-your-turn-feed'

export default function HomeMyTasksPage() {
  const { myTasks } = useHomeCardFeedScopes()
  const feed = useYourTurnFeed(myTasks.scope)
  const { activeYourTurnItem, openYourTurnItem, closeYourTurnItem } = useHomeFeedOpen()
  return (
    <main className="flex min-h-0 flex-1">
      <h1 className="sr-only">MY TASKS</h1>
      <div className="min-w-0 flex-1">
        <MyTasksPanel
          presentation="page"
          open
          onOpenChange={() => undefined}
          scope={myTasks.scope}
          updateScope={myTasks.updateScope}
          loading={feed.loading}
          items={feed.items}
          onOpenItem={openYourTurnItem}
          onItemsChanged={feed.reload}
        />
      </div>
      {activeYourTurnItem ? (
        <aside className="border-border min-w-0 flex-1 border-l">
          <HomeTaskDetailHost
            item={activeYourTurnItem}
            presentation="panel"
            onClose={closeYourTurnItem}
            onUpdated={() => void feed.reload()}
          />
        </aside>
      ) : null}
    </main>
  )
}
