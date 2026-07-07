'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils/cn'
import type {
  TeamOverviewAgent,
  TeamOverviewLiveItem,
  TeamOverviewRecentItem,
} from '../../services/team-overview.service'
import { AgentAvatar, CardShell, EmptyHint, InfoIcon } from './TeamOverviewShared'
import {
  FEED_DOT_CLASS,
  liveContext,
  liveItemAgentKey,
  liveItemHref,
  liveItemTime,
  liveTitle,
  recentContext,
  recentItemAgentKey,
  recentItemHref,
  recentItemTime,
  recentTitle,
  relativeTime,
} from './team-overview-utils'

export function TeamOverviewFeedSections({
  liveItems,
  recentItems,
  visibleRecentItems,
  hasMoreRecent,
  onLoadMoreRecent,
  onRecentItemClick,
  agentByKey,
}: {
  liveItems: TeamOverviewLiveItem[]
  recentItems: TeamOverviewRecentItem[]
  visibleRecentItems: TeamOverviewRecentItem[]
  hasMoreRecent: boolean
  onLoadMoreRecent: () => void
  onRecentItemClick: (item: TeamOverviewRecentItem) => void
  agentByKey: Map<string, TeamOverviewAgent>
}) {
  return (
    <>
      <FeedSection
        title="Live work"
        subtitle={`${liveItems.length} active`}
        info="Everything happening right now: open missions (planning/in_progress/review/blocked), running tasks, agents streaming a chat reply, and pending or running delegations between agents."
      >
        {liveItems.length === 0 ? (
          <EmptyHint>No agents are actively working right now.</EmptyHint>
        ) : (
          liveItems.slice(0, 10).map((item) => {
            const agentKey = liveItemAgentKey(item)
            const agent = agentKey ? agentByKey.get(agentKey) : undefined
            return (
              <FeedRow
                key={`live:${item.kind}:${item.id}`}
                href={liveItemHref(item)}
                dotClass={FEED_DOT_CLASS[item.kind]}
                avatar={agent ? <AgentAvatar agent={agent} /> : null}
                title={liveTitle(item)}
                context={liveContext(item, agent)}
                trailing={
                  <span className="body-4 text-muted-foreground/70 shrink-0 tabular-nums">
                    {relativeTime(liveItemTime(item))}
                  </span>
                }
              />
            )
          })
        )}
      </FeedSection>

      <FeedSection
        title="Recent activity"
        subtitle={`${recentItems.length} in window`}
        info="Things the team finished or did inside the selected window: completed/failed missions, agent chats, channel messages posted by team agents, and flow runs triggered for the team."
      >
        {recentItems.length === 0 ? (
          <EmptyHint>No activity in the selected window.</EmptyHint>
        ) : (
          <>
            {visibleRecentItems.map((item) => {
              const agentKey = recentItemAgentKey(item)
              const agent = agentKey ? agentByKey.get(agentKey) : undefined
              const opensModal = item.kind === 'mission' || item.kind === 'chat'
              return (
                <FeedRow
                  key={`recent:${item.kind}:${item.id}`}
                  href={recentItemHref(item)}
                  onClick={opensModal ? () => onRecentItemClick(item) : undefined}
                  dotClass={FEED_DOT_CLASS[item.kind]}
                  avatar={agent ? <AgentAvatar agent={agent} /> : null}
                  title={recentTitle(item)}
                  context={recentContext(item, agent)}
                  trailing={
                    <span className="body-4 text-muted-foreground/70 shrink-0 tabular-nums">
                      {relativeTime(recentItemTime(item))}
                    </span>
                  }
                />
              )
            })}
            {hasMoreRecent ? (
              <button
                type="button"
                onClick={onLoadMoreRecent}
                className="body-4 text-muted-foreground hover:text-foreground rounded-spacing-2 py-spacing-2 w-full text-center font-medium transition-colors"
              >
                See more ({recentItems.length - visibleRecentItems.length} remaining)
              </button>
            ) : null}
          </>
        )}
      </FeedSection>
    </>
  )
}

function FeedSection({
  title,
  subtitle,
  info,
  children,
}: {
  title: string
  subtitle?: string
  info?: string
  children: React.ReactNode
}) {
  return (
    <CardShell className="gap-spacing-2">
      <div className="gap-spacing-2 flex items-center justify-between">
        <span className="gap-spacing-1 flex min-w-0 items-center">
          <span className="body-2 text-foreground truncate font-semibold">{title}</span>
          {info ? <InfoIcon label={info} /> : null}
        </span>
        {subtitle ? <span className="body-4 text-muted-foreground">{subtitle}</span> : null}
      </div>
      <div className="flex flex-col">{children}</div>
    </CardShell>
  )
}

function FeedRow({
  href,
  onClick,
  dotClass,
  avatar,
  title,
  context,
  trailing,
}: {
  href: string | null
  onClick?: () => void
  dotClass: string
  avatar: React.ReactNode
  title: string
  context: string
  trailing: React.ReactNode
}) {
  const cls = cn(
    'gap-spacing-3 rounded-spacing-2 px-spacing-2 py-spacing-2 hover:bg-hover-subtle flex items-center transition-colors',
    onClick && 'cursor-pointer',
  )
  const inner = (
    <>
      <span className={cn('indicator-dot-glass-sm shrink-0', dotClass)} aria-hidden />
      {avatar}
      <div className="min-w-0 flex-1">
        <p className="body-3 text-foreground truncate">{title}</p>
        <p className="body-4 text-muted-foreground truncate">{context}</p>
      </div>
      {trailing}
    </>
  )
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(cls, 'w-full text-left')}>
        {inner}
      </button>
    )
  }
  if (!href) return <div className={cls}>{inner}</div>
  return (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  )
}
