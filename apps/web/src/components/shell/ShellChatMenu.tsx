'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft } from 'lucide-react'
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
  autoTitleConversation,
  DEFAULT_CHAT_HISTORY_FILTERS,
  deleteConversation,
  duplicateConversation,
  fetchConversations,
  filterConversationsForHistory,
  needsGeneratedConversationTitle,
  renameConversation,
  setConversationArchived,
  setConversationPinned,
  type ChatHistoryFilterState,
  type Conversation,
  type ConversationAgentDisplay,
} from '@/lib/conversations'
import { openInNewTab } from '@/lib/utils/open-in-new-tab'
import { isShellHomeRoute } from './shell-route-policy'
import { ShellChatMenuActiveFilters } from './ShellChatMenuActiveFilters'
import { useShellStore } from './use-shell-store'

const PIXEL_AGENT_KEY = 'vibey'

function historyScopeForAgent(agentKey: string | null) {
  return agentKey === PIXEL_AGENT_KEY ? null : agentKey
}

export function ShellChatMenu({ onCollapse }: { onCollapse?: () => void }) {
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
  const [historyAgentKey, setHistoryAgentKey] = useState<string | null>(() =>
    historyScopeForAgent(activeAgentKey),
  )
  const allAgentsMode = historyAgentKey === null
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
    setHistoryAgentKey(historyScopeForAgent(activeAgentKey))
  }, [activeAgentKey])

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

  const agentOptions = useMemo(() => {
    const options: Array<{ key: string; label: string }> = []
    for (const agent of chatAgents) {
      const key = agent.agent_key?.trim()
      if (!key) continue
      options.push({ key, label: agent.display_name })
    }
    return options.sort((left, right) => {
      if (left.key === PIXEL_AGENT_KEY) return -1
      if (right.key === PIXEL_AGENT_KEY) return 1
      return left.label.localeCompare(right.label)
    })
  }, [chatAgents])

  const selectedHistoryAgent = useMemo(
    () => chatAgents.find((agent) => agent.agent_key?.trim() === historyAgentKey) ?? null,
    [chatAgents, historyAgentKey],
  )

  const reloadConversations = useCallback(async () => {
    const cacheKey = `shell-conversations:${historyAgentKey ?? 'all'}`
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
        () => fetchConversations(undefined, historyAgentKey),
        { ttlMs: 30_000 },
      )
      setConversations(rows)
    } catch {
      if (!peeked) setConversations([])
    } finally {
      setLoading(false)
    }
  }, [historyAgentKey])

  useEffect(() => {
    void reloadConversations()
  }, [reloadConversations])

  const autoTitleAttemptedRef = useRef(new Set<string>())

  // Upgrade raw first-line / "Slack Chat" titles to short AI topic labels (bounded).
  useEffect(() => {
    const candidates = conversations
      .filter(
        (row) =>
          needsGeneratedConversationTitle(row.title) && !autoTitleAttemptedRef.current.has(row.id),
      )
      .slice(0, 12)
    if (candidates.length === 0) return

    let cancelled = false
    const run = async () => {
      for (const row of candidates) {
        if (cancelled) return
        autoTitleAttemptedRef.current.add(row.id)
        try {
          const result = await autoTitleConversation(row.id)
          if (!result.updated || !result.title) continue
          if (cancelled) return
          useChatStore.getState().updateConversation(row.id, { title: result.title })
          setConversations((prev) =>
            prev.map((c) => (c.id === row.id ? { ...c, title: result.title } : c)),
          )
        } catch {
          // Non-critical — keep the existing title.
        }
      }
      invalidateCachedFetch('shell-conversations:')
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [conversations])

  const visibleConversations = useMemo(
    () => filterConversationsForHistory(conversations, filters),
    [conversations, filters],
  )

  const openConversation = useCallback(
    (id: string) => {
      const conversation = conversations.find((row) => row.id === id)
      if (conversation) useChatStore.getState().addConversation(conversation)
      if (isShellHomeRoute(pathname) && (searchParams.get('conv') || searchParams.get('chat'))) {
        router.push('/home')
      }
      openChatDrawer(id)
    },
    [conversations, openChatDrawer, pathname, router, searchParams],
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
    <div className="gap-spacing-1 flex items-center">
      <ChatHistoryFilterMenu
        value={filters}
        onChange={setFilters}
        agentKey={historyAgentKey}
        agentOptions={agentOptions}
        onAgentKeyChange={setHistoryAgentKey}
        onOpenAllChats={openAllChats}
      />
      {onCollapse ? (
        <button
          type="button"
          onClick={onCollapse}
          className="nav-glass-text-purple p-spacing-1 hover:text-foreground flex items-center justify-center transition-colors"
          aria-label="Collapse chat history"
          title="Collapse chat history"
        >
          <ChevronLeft className="icon-xs" aria-hidden />
        </button>
      ) : null}
    </div>
  )

  const activeFilters = (
    <ShellChatMenuActiveFilters
      historyAgentKey={historyAgentKey}
      agentByKey={agentByKey}
      selectedAgentRole={selectedHistoryAgent?.role_label}
      filters={filters}
      onAgentKeyChange={setHistoryAgentKey}
      onFiltersChange={setFilters}
    />
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
          headerFooterSlot={activeFilters}
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
