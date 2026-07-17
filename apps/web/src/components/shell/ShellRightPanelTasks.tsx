'use client'

import { useHomeFeedOpen } from '@/features/home/hooks/use-home-feed-open'
import { HomeTaskDetailHost } from '@/features/home/components/HomeTaskDetailHost'
import { useYourTurnFeed } from '@/features/spaces/hooks/use-your-turn-feed'
import { DEFAULT_HOME_FEED_SCOPE } from '@/lib/home/home-feed-scope'
import { formatHomeShortDate } from '@/features/home/components/HomeListCardShell'
import { cn } from '@/lib/utils/cn'

export function ShellRightPanelTasks() {
  const feed = useYourTurnFeed(DEFAULT_HOME_FEED_SCOPE)
  const { activeYourTurnItem, openYourTurnItem, closeYourTurnItem } = useHomeFeedOpen()

  if (feed.loading) {
    return <p className="body-3 text-muted-foreground">Loading tasks…</p>
  }

  if (feed.items.length === 0) {
    return <p className="body-3 text-muted-foreground">No tasks in your queue.</p>
  }

  return (
    <>
      <ul className="space-y-1">
        {feed.items.slice(0, 40).map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => void openYourTurnItem(item)}
              className={cn(
                'hover:bg-hover-subtle flex w-full flex-col gap-0.5 rounded-lg px-2 py-2 text-left',
              )}
            >
              <span className="body-3 text-foreground line-clamp-2">{item.title}</span>
              {item.due_at ? (
                <span className="body-4 text-muted-foreground">
                  {formatHomeShortDate(new Date(item.due_at))}
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
      {activeYourTurnItem ? (
        <HomeTaskDetailHost
          item={activeYourTurnItem}
          onClose={closeYourTurnItem}
          onUpdated={() => void feed.reload()}
        />
      ) : null}
    </>
  )
}
