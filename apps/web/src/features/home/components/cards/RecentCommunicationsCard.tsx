'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { MessageSquare } from 'lucide-react'
import { ChannelIcon } from '@/features/channels/components/ChannelIcon'
import { CommunicationsEmptyIllustration } from '@/features/home/components/HomeEmptyIllustrations'
import {
  formatHomeShortDate,
  HomeListCardShell,
} from '@/features/home/components/HomeListCardShell'
import {
  fetchRecentCommunications,
  type HomeRecentCommunicationItem,
} from '@/features/home/services/home-communications.service'
import { useOrgStore } from '@/features/org/store/use-org-store'
import { htmlToPlainTextPreview } from '@/features/spaces/components/space-item-values'
import { personDmUrl } from '@/features/team-2/lib/person-dm-nav'
import { cn } from '@/lib/utils/cn'

function itemHref(item: HomeRecentCommunicationItem): string {
  if (item.kind === 'dm' && item.partner_user_id) {
    return personDmUrl(item.partner_user_id)
  }
  return `/home/channels/${encodeURIComponent(item.thread_id)}`
}

function CommunicationRowAvatar({ item }: { item: HomeRecentCommunicationItem }) {
  if (item.kind === 'dm') {
    const initial = (item.title[0] ?? '?').toUpperCase()
    return (
      <span className="border-border h-6 w-6 shrink-0 overflow-hidden rounded-full border bg-[var(--color-muted)]">
        {item.avatar_url ? (
          <img src={item.avatar_url} alt="" className="h-full w-full object-cover object-center" />
        ) : (
          <span className="typo-caption flex h-full w-full items-center justify-center font-semibold leading-none text-[var(--color-muted-foreground)]">
            {initial}
          </span>
        )}
      </span>
    )
  }

  return (
    <span className="border-border flex h-6 w-6 shrink-0 items-center justify-center rounded-md border bg-[var(--color-muted)]">
      <ChannelIcon channel={{ metadata: item.channel_metadata }} className="h-3.5 w-3.5" />
    </span>
  )
}

export function RecentCommunicationsCard() {
  const router = useRouter()
  const activeOrgId = useOrgStore((s) => s.activeOrgId)
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<HomeRecentCommunicationItem[]>([])

  const reload = useCallback(async () => {
    if (!activeOrgId) {
      setItems([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const rows = await fetchRecentCommunications(15)
      setItems(rows)
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [activeOrgId])

  useEffect(() => {
    void reload()
  }, [reload])

  return (
    <HomeListCardShell
      icon={MessageSquare}
      title="Recent messages"
      loading={loading}
      emptyMessage={
        <div className="flex flex-col items-center gap-4 py-8">
          <CommunicationsEmptyIllustration />
          <p className="body-3 text-muted-foreground max-w-[240px] text-center">
            Channel and DM activity will show up here.
          </p>
        </div>
      }
      hasRows={items.length > 0}
    >
      <ul className="space-y-0.5">
        {items.map((item) => {
          const title = item.kind === 'channel' ? `#${item.title.replace(/^#/, '')}` : item.title
          const preview =
            htmlToPlainTextPreview(item.preview) ||
            (item.sender_label ? `${item.sender_label} sent a message` : 'New message')

          return (
            <li key={`${item.kind}:${item.message_id}`}>
              <button
                type="button"
                onClick={() => router.push(itemHref(item))}
                className="hover:bg-hover-subtle body-4 text-foreground group/row flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-left font-medium transition-colors"
              >
                <CommunicationRowAvatar item={item} />
                <span className="min-w-0 flex-1">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate">{title}</span>
                    {item.unread > 0 ? (
                      <span className="bg-primary typo-caption flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full px-1 font-semibold leading-none text-[var(--color-primary-foreground)]">
                        {item.unread > 99 ? '99+' : item.unread}
                      </span>
                    ) : null}
                  </span>
                  <span className="text-muted-foreground typo-caption block truncate font-normal">
                    {preview}
                  </span>
                </span>
                <span
                  className={cn(
                    'text-muted-foreground typo-caption shrink-0 tabular-nums',
                    item.unread > 0 && 'text-foreground font-medium',
                  )}
                >
                  {formatHomeShortDate(new Date(item.occurred_at))}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </HomeListCardShell>
  )
}
