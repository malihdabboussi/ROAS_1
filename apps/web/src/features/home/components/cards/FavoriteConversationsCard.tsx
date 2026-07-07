'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { MessageSquare, Pin } from 'lucide-react'
import { ConversationsEmptyIllustration } from '@/features/home/components/HomeEmptyIllustrations'
import {
  HomeFeedScopeHoverReveal,
  HomeFeedScopePicker,
  usePersistedHomeFeedScope,
} from '@/features/home/components/HomeFeedScopePicker'
import {
  formatHomeShortDate,
  HomeListCardShell,
} from '@/features/home/components/HomeListCardShell'
import {
  backendOptionsForHomeFeed,
  homeFeedCacheScopeKey,
} from '@/features/home/types/home-feed-scope'
import { orgService } from '@/features/org/services/org.service'
import { cachedFetch } from '@/lib/cache/keyed-fetch-cache'
import { fetchConversations, setConversationPinned } from '@/lib/conversations/conversations-api'
import { stripLegacySpacesConversationTitle } from '@/lib/conversations/conversation-title'
import type { Conversation } from '@/lib/conversations/conversation.types'

function isPinnedConversation(c: Conversation): boolean {
  const m = c.metadata
  if (!m || typeof m !== 'object') return false
  return (m as { pinned?: unknown }).pinned === true
}

function conversationHref(c: Conversation): string {
  const agentKey = c.agent_id?.trim() || 'vibey'
  const params = new URLSearchParams()
  params.set('agent', agentKey)
  params.set('tab', 'chat')
  params.set('conv', c.id)
  return `/team?${params.toString()}`
}

export function FavoriteConversationsCard() {
  const router = useRouter()
  const { scope, updateScope } = usePersistedHomeFeedScope('favorite_conversations')
  const [loading, setLoading] = useState(true)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [agentAvatarByKey, setAgentAvatarByKey] = useState<Map<string, string | null>>(new Map())
  const [agentDisplayNameByKey, setAgentDisplayNameByKey] = useState<Map<string, string>>(new Map())

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const feedOrgId = scope.feedScope === 'org' ? (scope.orgId ?? undefined) : undefined
      const list = await cachedFetch(
        `home:conversations:${homeFeedCacheScopeKey(scope.feedScope, scope.orgId)}:${scope.campaignId ?? ''}`,
        () =>
          fetchConversations(
            scope.campaignId,
            null,
            null,
            { feedScope: scope.feedScope, feedOrgId },
            backendOptionsForHomeFeed(scope.feedScope, scope.orgId),
          ),
      )
      setConversations(list.filter((c) => c.status === 'active' && isPinnedConversation(c)))
    } finally {
      setLoading(false)
    }
  }, [scope.feedScope, scope.orgId, scope.campaignId])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    let cancelled = false
    // Same key + fetcher as use-spaces-store's loadRoster — shared cache; the
    // loop below already filters to agent rows.
    cachedFetch('team-roster:all', () => orgService.listRoster({ kind: 'all' }), {
      ttlMs: 60_000,
    })
      .then((rows) => {
        if (cancelled) return
        const avatars = new Map<string, string | null>()
        const names = new Map<string, string>()
        for (const row of rows) {
          if (row.kind === 'agent' && row.agent_key) {
            avatars.set(row.agent_key, row.avatar_url ?? null)
            names.set(row.agent_key, (row.display_name ?? '').trim() || row.agent_key)
          }
        }
        setAgentAvatarByKey(avatars)
        setAgentDisplayNameByKey(names)
      })
      .catch(() => {
        if (!cancelled) {
          setAgentAvatarByKey(new Map())
          setAgentDisplayNameByKey(new Map())
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  const sorted = useMemo(() => {
    const rows = [...conversations]
    rows.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    return rows
  }, [conversations])

  const unpin = useCallback(async (c: Conversation) => {
    await setConversationPinned(c.id, false)
    setConversations((prev) => prev.filter((row) => row.id !== c.id))
  }, [])

  return (
    <HomeListCardShell
      icon={MessageSquare}
      title="Favorite conversations"
      headerRight={
        <HomeFeedScopeHoverReveal>
          <HomeFeedScopePicker variant="conversations" scope={scope} onChange={updateScope} />
        </HomeFeedScopeHoverReveal>
      }
      loading={loading}
      emptyMessage={
        <div className="flex flex-col items-center gap-4 py-8">
          <ConversationsEmptyIllustration messageCount={3} />
          <p className="body-3 text-muted-foreground max-w-[240px] text-center">
            Pin conversations from Team to see them here.
          </p>
        </div>
      }
      hasRows={sorted.length > 0}
    >
      <ul className="space-y-0.5">
        {sorted.map((c) => {
          const title = stripLegacySpacesConversationTitle(c.title) || 'Untitled conversation'
          const agentKey = c.agent_id?.trim() || 'vibey'
          const avatarUrl = agentAvatarByKey.get(agentKey) ?? null
          const agentLabel =
            agentDisplayNameByKey.get(agentKey) ??
            (agentKey.length > 0 ? agentKey.charAt(0).toUpperCase() + agentKey.slice(1) : 'Agent')
          const initial = (agentKey[0] ?? '?').toUpperCase()

          return (
            <li key={c.id} className="group/row">
              <div className="hover:bg-hover-subtle body-4 text-foreground flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-1 font-medium transition-colors">
                <button
                  type="button"
                  onClick={() => router.push(conversationHref(c))}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  title={agentLabel}
                >
                  <span className="border-border h-6 w-6 shrink-0 overflow-hidden rounded-full border bg-[var(--color-muted)]">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt=""
                        className="h-full w-full object-cover object-center"
                      />
                    ) : (
                      <span className="typo-caption flex h-full w-full items-center justify-center font-semibold leading-none text-[var(--color-muted-foreground)]">
                        {initial}
                      </span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{title}</span>
                </button>
                <span className="relative flex h-6 w-16 shrink-0 items-center justify-end">
                  <span className="text-muted-foreground typo-caption tabular-nums transition-all group-hover/row:scale-95 group-hover/row:opacity-0">
                    {formatHomeShortDate(new Date(c.updated_at))}
                  </span>
                  <button
                    type="button"
                    onClick={() => void unpin(c)}
                    className="text-primary hover:bg-hover-subtle absolute right-0 flex h-6 w-6 scale-90 items-center justify-center rounded-md opacity-0 transition-all group-hover/row:scale-100 group-hover/row:opacity-100"
                    aria-label="Unpin conversation"
                  >
                    <Pin className="h-3.5 w-3.5 fill-current" />
                  </button>
                </span>
              </div>
            </li>
          )
        })}
      </ul>
    </HomeListCardShell>
  )
}
