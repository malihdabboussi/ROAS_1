'use client'

import { useMemo } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import { formatHomeShortDate } from '@/features/home/components/HomeListCardShell'
import { HomeTaskDetailHost } from '@/features/home/components/HomeTaskDetailHost'
import { useHomeFeedOpen } from '@/features/home/hooks/use-home-feed-open'
import { useYourTurnFeed } from '@/features/spaces/hooks/use-your-turn-feed'
import type { Message } from '@/lib/conversations'
import { DEFAULT_HOME_FEED_SCOPE } from '@/lib/home/home-feed-scope'
import { cn } from '@/lib/utils/cn'
import { extractConversationTaskRows } from './shell-conversation-summary'
import { SHELL_RIGHT_PANEL_MESSAGES } from './shell-right-panel.messages.config'
import { ShellRightPanelSkeleton } from './ShellRightPanelSkeleton'

function HomeRightPanelTasks() {
  const feed = useYourTurnFeed(DEFAULT_HOME_FEED_SCOPE)
  const { activeYourTurnItem, openYourTurnItem, closeYourTurnItem } = useHomeFeedOpen()

  if (feed.loading) {
    return <ShellRightPanelSkeleton label={SHELL_RIGHT_PANEL_MESSAGES.homeTasksLoading} />
  }

  if (feed.items.length === 0) {
    return (
      <p className="body-3 text-muted-foreground">{SHELL_RIGHT_PANEL_MESSAGES.homeTasksEmpty}</p>
    )
  }

  if (activeYourTurnItem) {
    return (
      <HomeTaskDetailHost
        item={activeYourTurnItem}
        presentation="panel"
        onClose={closeYourTurnItem}
        onUpdated={() => void feed.reload()}
      />
    )
  }

  return (
    <ul className="space-y-spacing-1">
      {feed.items.slice(0, 40).map((item) => (
        <li key={item.id}>
          <button
            type="button"
            onClick={() => void openYourTurnItem(item)}
            className={cn(
              'hover:bg-hover-subtle px-spacing-2 py-spacing-2 flex w-full flex-col rounded-lg text-left',
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
  )
}

function ConversationRightPanelTasks({ messages }: { messages: Message[] }) {
  const rows = useMemo(() => extractConversationTaskRows(messages), [messages])

  if (rows.length === 0) {
    return (
      <p className="body-3 text-muted-foreground">{SHELL_RIGHT_PANEL_MESSAGES.chatTasksEmpty}</p>
    )
  }

  return (
    <ul className="space-y-spacing-1">
      {rows.map((row) => {
        const Icon = row.state === 'complete' ? CheckCircle2 : XCircle
        return (
          <li
            key={row.id}
            className="gap-spacing-2 px-spacing-2 py-spacing-2 flex items-start rounded-lg"
          >
            <Icon
              className={cn(
                'icon-sm mt-spacing-1 shrink-0',
                row.state === 'complete' ? 'text-primary' : 'text-destructive',
              )}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="body-3 text-foreground line-clamp-2">{row.title}</p>
              <p className="body-4 text-muted-foreground">
                {formatHomeShortDate(new Date(row.createdAt))}
              </p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export function ShellRightPanelTasks({
  conversationId,
  messages,
}: {
  conversationId: string | null
  messages: Message[]
}) {
  return conversationId ? (
    <ConversationRightPanelTasks messages={messages} />
  ) : (
    <HomeRightPanelTasks />
  )
}
