'use client'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { ConversationShareModal } from '@/components/conversations'
import { SpaceConversationsList } from '@/components/conversations/SpaceConversationsListAdapter'
import { useGlobalChatStore } from '@/components/global-chat/store/use-global-chat-store'
import { useOrgStore } from '@/features/org/store/use-org-store'
import { useChatStore } from '@/features/studio/store/use-chat-store'
import { cachedFetch, invalidateCachedFetch } from '@/lib/cache/keyed-fetch-cache'
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
import { conversationCacheKey, peekConversationCache } from './shell-conversation-cache'
import { isShellHomeRoute } from './shell-route-policy'
import { ShellChatMenuActiveFilters } from './ShellChatMenuActiveFilters'
import { ShellChatMenuFilterControls } from './ShellChatMenuFilterControls'
import { useShellStore } from './use-shell-store'
const PIXEL_AGENT_KEY = 'vibey'
export function ShellChatMenu({
  onCollapse,
  onOpenChat,
  hideNewButton = false,
  navigationSlot,
  simpleSidebar = false,
  compactHeaderStartSlot,
  compactHeaderEndSlot,
  compactHeaderTitleClassName,
}: {
  onCollapse?: () => void
  onOpenChat?: () => void
  hideNewButton?: boolean
  navigationSlot?: ReactNode
  simpleSidebar?: boolean
  compactHeaderStartSlot?: ReactNode
  compactHeaderEndSlot?: ReactNode
  compactHeaderTitleClassName?: string
}) {
  const pathname = usePathname() ?? '/home'
  const router = useRouter()
  const searchParams = useSearchParams()
  const openChatDrawer = useShellStore((s) => s.openChatDrawer)
  const openFreshChatDrawer = useShellStore((s) => s.openFreshChatDrawer)
  const chatDrawer = useShellStore((s) => s.chatDrawer)
  const activeAgentKey = useGlobalChatStore((s) => s.activeAgentKey)
  const roster = useGlobalChatStore((s) => s.roster)
  const loadRoster = useGlobalChatStore((s) => s.loadRoster)
  const meetingContext = useGlobalChatStore((s) => s.meetingContext)
  const clearMeetingContext = useGlobalChatStore((s) => s.clearMeetingContext)
  const setActiveConversationId = useChatStore((s) => s.setActiveConversationId)
  const storeConversations = useChatStore((s) => s.conversations)
  const activeConversationId = useChatStore((s) => s.activeConversationId)
  const activeOrgId = useOrgStore((s) => s.activeOrgId)
  const activeOrgName = useOrgStore((s) => s.getActiveOrg()?.organizations.name ?? 'Workspace')
  const isOrgContext = Boolean(activeOrgId)
  const [filters, setFilters] = useState<ChatHistoryFilterState>(DEFAULT_CHAT_HISTORY_FILTERS)
  const [historyAgentKey, setHistoryAgentKey] = useState<string | null>(() =>
    simpleSidebar || activeAgentKey === PIXEL_AGENT_KEY ? null : activeAgentKey,
  )
  const [listQuery, setListQuery] = useState('')
  const [shareConversation, setShareConversation] = useState<Conversation | null>(null)
  const [campaignNameById, setCampaignNameById] = useState<Record<string, string>>({})
  const initialConversations = peekConversationCache(simpleSidebar, historyAgentKey, activeOrgId)
  const [conversations, setConversations] = useState<Conversation[]>(
    () => initialConversations ?? [],
  )
  const [loading, setLoading] = useState(() => initialConversations === undefined)
  useEffect(() => {
    void loadRoster()
  }, [loadRoster])

  useEffect(() => {
    setHistoryAgentKey(simpleSidebar || activeAgentKey === PIXEL_AGENT_KEY ? null : activeAgentKey)
  }, [activeAgentKey, simpleSidebar])
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
      const scopedStoreRows = storeConversations.filter(
        (row) => historyAgentKey === null || row.agent_id === historyAgentKey,
      )
      if (scopedStoreRows.length === 0) return prev
      const previousIds = new Set(prev.map((row) => row.id))
      const storeRowById = new Map(scopedStoreRows.map((row) => [row.id, row]))
      const insertedRows = scopedStoreRows.filter((row) => !previousIds.has(row.id))
      const mergedRows = prev.map((row) => {
        const storeRow = storeRowById.get(row.id)
        return storeRow ? { ...row, ...storeRow } : row
      })
      return [...insertedRows, ...mergedRows]
    })
  }, [historyAgentKey, storeConversations])
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
    const options: { key: string; label: string }[] = []
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
  const selectedHistoryAgent = chatAgents.find(
    (agent) => agent.agent_key?.trim() === historyAgentKey,
  )
  const reloadConversations = useCallback(async () => {
    const cacheKey = conversationCacheKey(simpleSidebar, historyAgentKey, activeOrgId)
    const peeked = peekConversationCache(simpleSidebar, historyAgentKey, activeOrgId)
    if (peeked) {
      setConversations(peeked)
      setLoading(false)
    } else {
      setLoading(true)
    }
    try {
      const rows = await cachedFetch(
        cacheKey,
        () =>
          fetchConversations(
            undefined,
            historyAgentKey,
            undefined,
            simpleSidebar ? { feedScope: 'all' } : undefined,
          ),
        { ttlMs: 30_000 },
      )
      setConversations(rows)
    } catch {
      if (!peeked) setConversations([])
    } finally {
      setLoading(false)
    }
  }, [activeOrgId, historyAgentKey, simpleSidebar])

  useEffect(() => {
    void reloadConversations()
  }, [reloadConversations])
  const visibleConversations = useMemo(
    () => filterConversationsForHistory(conversations, filters),
    [conversations, filters],
  )
  const openConversation = useCallback(
    (id: string) => {
      if (meetingContext && meetingContext.conversationId !== id) clearMeetingContext()
      const conversation = conversations.find((row) => row.id === id)
      if (conversation) useChatStore.getState().addConversation(conversation)
      if (simpleSidebar) {
        setActiveConversationId(id)
        router.push(`/home?conv=${encodeURIComponent(id)}`)
        onOpenChat?.()
        return
      }
      if (isShellHomeRoute(pathname) && (searchParams.get('conv') || searchParams.get('chat'))) {
        router.push('/home')
      }
      openChatDrawer(id)
      onOpenChat?.()
    },
    [
      conversations,
      clearMeetingContext,
      meetingContext,
      onOpenChat,
      openChatDrawer,
      pathname,
      router,
      searchParams,
      setActiveConversationId,
      simpleSidebar,
    ],
  )

  const handleNewConversation = useCallback(() => {
    if (meetingContext) clearMeetingContext()
    setActiveConversationId(null)
    if (simpleSidebar) {
      router.push('/home')
      onOpenChat?.()
      return
    }
    if (isShellHomeRoute(pathname) && (searchParams.get('conv') || searchParams.get('chat'))) {
      router.push('/home')
    }
    openFreshChatDrawer()
    onOpenChat?.()
  }, [
    onOpenChat,
    clearMeetingContext,
    meetingContext,
    openFreshChatDrawer,
    pathname,
    router,
    searchParams,
    setActiveConversationId,
    simpleSidebar,
  ])

  const openAllChats = useCallback(() => {
    router.push('/chats')
  }, [router])

  const selectedConversationId = chatDrawer.conversationId ?? activeConversationId
  const filterControls = (
    <ShellChatMenuFilterControls
      filters={filters}
      onFiltersChange={setFilters}
      historyAgentKey={historyAgentKey}
      agentOptions={agentOptions}
      onAgentKeyChange={setHistoryAgentKey}
      onOpenAllChats={openAllChats}
      onCollapse={onCollapse}
      simpleSidebar={simpleSidebar}
    />
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
          newButtonBelowSearch={!simpleSidebar}
          hideNewButton={hideNewButton || simpleSidebar}
          compactHeader={simpleSidebar}
          compactHeaderTitle={simpleSidebar ? 'Recents' : undefined}
          isOrgContext={isOrgContext}
          allAgentsMode={historyAgentKey === null}
          leadingIcon={filters.leadingIcon}
          showConversationTypeIcon={simpleSidebar}
          agentByKey={agentByKey}
          groupBy={filters.groupBy}
          campaignNameById={campaignNameById}
          headerEndSlot={
            <>
              {filterControls}
              {compactHeaderEndSlot}
            </>
          }
          headerStartSlot={compactHeaderStartSlot}
          compactHeaderTitleClassName={compactHeaderTitleClassName}
          beforeHeaderSlot={simpleSidebar ? navigationSlot : undefined}
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
