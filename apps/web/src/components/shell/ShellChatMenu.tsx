'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ConversationShareModal } from '@/components/conversations'
import { ChatHistoryFilterMenu } from '@/components/conversations/ChatHistoryFilterMenu'
import { SpaceConversationsList } from '@/components/conversations/SpaceConversationsListAdapter'
import { useGlobalChatStore } from '@/components/global-chat/store/use-global-chat-store'
import { useOrgStore } from '@/features/org/store/use-org-store'
import { useChatStore } from '@/features/studio/store/use-chat-store'
import { cachedFetch, invalidateCachedFetch, peekCachedFetch } from '@/lib/cache/keyed-fetch-cache'
import { fetchCampaigns } from '@/lib/campaigns'
import {
  assignConversationCampaign,
  DEFAULT_CHAT_HISTORY_FILTERS,
  deleteConversation,
  duplicateConversation,
  fetchConversations,
  filterConversationsForHistory,
  renameConversation,
  setConversationArchived,
  setConversationPinned,
  type ChatHistoryFilterState,
  type Conversation,
  type ConversationAgentDisplay,
} from '@/lib/conversations'
import { openInNewTab } from '@/lib/utils/open-in-new-tab'
import { isShellHomeRoute } from './shell-route-policy'
import { useShellStore } from './use-shell-store'

export function ShellChatMenu() {
  const pathname = usePathname() ?? '/home'
  const router = useRouter()
  const searchParams = useSearchParams()
  const openChatDrawer = useShellStore((s) => s.openChatDrawer)
  const openFreshChatDrawer = useShellStore((s) => s.openFreshChatDrawer)
  const chatDrawer = useShellStore((s) => s.chatDrawer)

  const activeAgentKey = useGlobalChatStore((s) => s.activeAgentKey)
  const roster = useGlobalChatStore((s) => s.roster)
  const loadRoster = useGlobalChatStore((s) => s.loadRoster)
  const setActiveConversationId = useChatStore((s) => s.setActiveConversationId)
  const storeConversations = useChatStore((s) => s.conversations)

  const activeOrgId = useOrgStore((s) => s.activeOrgId)
  const activeOrgName = useOrgStore((s) => s.getActiveOrg()?.organizations.name ?? 'Workspace')
  const isOrgContext = Boolean(activeOrgId)

  const [filters, setFilters] = useState<ChatHistoryFilterState>(DEFAULT_CHAT_HISTORY_FILTERS)
  const allAgentsMode = filters.leadingIcon === 'agent'
  const [listQuery, setListQuery] = useState('')
  const [shareConversation, setShareConversation] = useState<Conversation | null>(null)
  const [campaignNameById, setCampaignNameById] = useState<Record<string, string>>({})
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    return peekCachedFetch<Conversation[]>(`shell-conversations:${activeAgentKey}`) ?? []
  })
  const [loading, setLoading] = useState(
    () => peekCachedFetch<Conversation[]>(`shell-conversations:${activeAgentKey}`) === undefined,
  )

  useEffect(() => {
    void loadRoster()
  }, [loadRoster])

  useEffect(() => {
    if (filters.groupBy !== 'campaign') return
    let cancelled = false
    void fetchCampaigns()
      .then((campaigns) => {
        if (cancelled) return
        const map: Record<string, string> = {}
        for (const campaign of campaigns) {
          map[campaign.id] = campaign.name?.trim() || 'Campaign'
        }
        setCampaignNameById(map)
      })
      .catch(() => {
        if (!cancelled) setCampaignNameById({})
      })
    return () => {
      cancelled = true
    }
  }, [filters.groupBy])

  useEffect(() => {
    if (storeConversations.length === 0) return
    setConversations((prev) => {
      let changed = false
      const next = prev.map((row) => {
        const storeRow = storeConversations.find((c) => c.id === row.id)
        if (!storeRow?.title || storeRow.title === row.title) return row
        changed = true
        return { ...row, title: storeRow.title, updated_at: storeRow.updated_at }
      })
      return changed ? next : prev
    })
  }, [storeConversations])

  const chatAgents = useMemo(
    () => roster.filter((entry) => entry.kind === 'agent' && Boolean(entry.agent_key?.trim())),
    [roster],
  )

  const agentByKey = useMemo(() => {
    const map: Record<string, ConversationAgentDisplay> = {}
    for (const agent of chatAgents) {
      const key = agent.agent_key?.trim()
      if (!key) continue
      map[key] = {
        name: agent.display_name,
        avatarUrl: agent.avatar_url ?? null,
      }
    }
    return map
  }, [chatAgents])

  const reloadConversations = useCallback(async () => {
    const cacheKey = `shell-conversations:${allAgentsMode ? 'all' : activeAgentKey}`
    const peeked = peekCachedFetch<Conversation[]>(cacheKey)
    if (peeked) {
      setConversations(peeked)
      setLoading(false)
    } else {
      setLoading(true)
    }
    try {
      const rows = await cachedFetch(
        cacheKey,
        () => fetchConversations(undefined, allAgentsMode ? null : activeAgentKey),
        { ttlMs: 30_000 },
      )
      setConversations(rows)
    } catch {
      if (!peeked) setConversations([])
    } finally {
      setLoading(false)
    }
  }, [activeAgentKey, allAgentsMode])

  useEffect(() => {
    void reloadConversations()
  }, [reloadConversations])

  const visibleConversations = useMemo(
    () => filterConversationsForHistory(conversations, filters),
    [conversations, filters],
  )

  const openConversation = useCallback(
    (id: string) => {
      if (isShellHomeRoute(pathname) && (searchParams.get('conv') || searchParams.get('chat'))) {
        router.push('/home')
      }
      openChatDrawer(id)
    },
    [openChatDrawer, pathname, router, searchParams],
  )

  const handleNewConversation = useCallback(() => {
    setActiveConversationId(null)
    if (isShellHomeRoute(pathname) && (searchParams.get('conv') || searchParams.get('chat'))) {
      router.push('/home')
    }
    openFreshChatDrawer()
  }, [openFreshChatDrawer, pathname, router, searchParams, setActiveConversationId])

  const openAllChats = useCallback(() => {
    router.push('/chats')
  }, [router])

  const activeConversationId = useChatStore((s) => s.activeConversationId)
  const selectedConversationId = chatDrawer.conversationId ?? activeConversationId ?? null

  const filterControls = (
    <ChatHistoryFilterMenu value={filters} onChange={setFilters} onOpenAllChats={openAllChats} />
  )

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <SpaceConversationsList
          conversations={visibleConversations}
          selectedConversationId={selectedConversationId}
          query={listQuery}
          onQueryChange={setListQuery}
          onSelectConversation={openConversation}
          onNewConversation={handleNewConversation}
          onDeleteConversation={async (conversationId) => {
            await deleteConversation(conversationId)
            invalidateCachedFetch('shell-conversations:')
            useChatStore.getState().removeConversation(conversationId)
            setConversations((prev) => prev.filter((c) => c.id !== conversationId))
            if (selectedConversationId === conversationId) {
              setActiveConversationId(null)
              if (isShellHomeRoute(pathname) && searchParams.get('conv')) router.push('/home')
              openChatDrawer(null)
            }
          }}
          onRenameConversation={async (conversationId, title) => {
            await renameConversation(conversationId, title)
            invalidateCachedFetch('shell-conversations:')
            useChatStore.getState().updateConversation(conversationId, { title })
            setConversations((prev) =>
              prev.map((c) => (c.id === conversationId ? { ...c, title } : c)),
            )
          }}
          onTogglePinConversation={async (conversationId, pinned) => {
            const updated = await setConversationPinned(conversationId, pinned)
            invalidateCachedFetch('shell-conversations:')
            useChatStore.getState().updateConversation(conversationId, {
              metadata: updated.metadata,
            })
            setConversations((prev) =>
              prev.map((c) => (c.id === conversationId ? { ...c, metadata: updated.metadata } : c)),
            )
          }}
          onToggleArchiveConversation={async (conversationId, archived) => {
            const updated = await setConversationArchived(conversationId, archived)
            invalidateCachedFetch('shell-conversations:')
            useChatStore.getState().updateConversation(conversationId, {
              status: updated.status,
            })
            setConversations((prev) =>
              prev.map((c) => (c.id === conversationId ? { ...c, status: updated.status } : c)),
            )
          }}
          onMoveConversation={async (conversationId, campaignId) => {
            const updated = await assignConversationCampaign(conversationId, campaignId)
            invalidateCachedFetch('shell-conversations:')
            useChatStore.getState().updateConversation(conversationId, {
              campaign_id: updated.campaign_id,
            })
            setConversations((prev) =>
              prev.map((c) =>
                c.id === conversationId ? { ...c, campaign_id: updated.campaign_id } : c,
              ),
            )
          }}
          onDuplicateConversation={async (conversationId, campaignId) => {
            const created = await duplicateConversation(conversationId, {
              campaignId,
              titlePrefix: 'Copy of ',
            })
            invalidateCachedFetch('shell-conversations:')
            setConversations((prev) => [created, ...prev])
            openConversation(created.id)
          }}
          onCopyConversationLink={(conversationId) => {
            const url = `${window.location.origin}/home?conv=${encodeURIComponent(conversationId)}`
            void navigator.clipboard.writeText(url)
            toast.success('Link copied')
          }}
          onCopyConversationId={(conversationId) => {
            void navigator.clipboard.writeText(conversationId)
            toast.success('Conversation ID copied')
          }}
          onOpenConversationInNewTab={(conversationId) => {
            openInNewTab(`/home?conv=${encodeURIComponent(conversationId)}`)
          }}
          onShareConversation={setShareConversation}
          onBack={() => undefined}
          loading={loading}
          hideBackButton
          hideHeaderBottomBorder
          newButtonBelowSearch
          isOrgContext={isOrgContext}
          allAgentsMode={allAgentsMode}
          leadingIcon={filters.leadingIcon}
          agentByKey={agentByKey}
          groupBy={filters.groupBy}
          campaignNameById={campaignNameById}
          headerEndSlot={filterControls}
        />
      </div>
      {isOrgContext ? (
        <ConversationShareModal
          activeOrgId={activeOrgId}
          open={shareConversation !== null}
          conversation={shareConversation}
          orgName={activeOrgName}
          roster={roster}
          onClose={() => setShareConversation(null)}
          onSharesChanged={() => void reloadConversations()}
        />
      ) : null}
    </>
  )
}
