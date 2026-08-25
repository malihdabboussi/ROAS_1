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
import { clientScopeHref, useClientScope } from '@/lib/client-scope'
import {
  assignConversationCampaign,
  DEFAULT_CHAT_HISTORY_FILTERS,
  deleteConversation,
  duplicateConversation,
  fetchConversations,
  filterConversationsForHistory,
  renameConversation,
  setConversationArchived,
  type ChatHistoryFilterState,
  type Conversation,
  type ConversationAgentDisplay,
} from '@/lib/conversations'
import { openInNewTab } from '@/lib/utils/open-in-new-tab'
import { historyConversationOpenPlan } from './shell-chat-menu-open'
import { mergeConversationsWithStore, persistConversationPinned } from './shell-chat-menu-pin'
import { conversationCacheKey, peekConversationCache } from './shell-conversation-cache'
import { isShellHomeRoute } from './shell-route-policy'
import { ShellChatMenuActiveFilters } from './ShellChatMenuActiveFilters'
import { ShellChatMenuFilterControls } from './ShellChatMenuFilterControls'
import { useChatHistoryGroupLabels } from './use-chat-history-group-labels'
import { useShellStore } from './use-shell-store'

const PIXEL_AGENT_KEY = 'vibey'
export function ShellChatMenu({
  onCollapse,
  onOpenChat,
  hideNewButton = false,
  navigationSlot,
  simpleSidebar = false,
}: {
  onCollapse?: () => void
  onOpenChat?: () => void
  hideNewButton?: boolean
  navigationSlot?: ReactNode
  simpleSidebar?: boolean
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
  const { scope: clientScope } = useClientScope()
  const isOrgContext = Boolean(activeOrgId)
  const [filters, setFilters] = useState<ChatHistoryFilterState>(DEFAULT_CHAT_HISTORY_FILTERS)
  const [historyAgentKey, setHistoryAgentKey] = useState<string | null>(() =>
    simpleSidebar || activeAgentKey === PIXEL_AGENT_KEY ? null : activeAgentKey,
  )
  const [listQuery, setListQuery] = useState('')
  const [filterMenuOpen, setFilterMenuOpen] = useState(false)
  const [shareConversation, setShareConversation] = useState<Conversation | null>(null)
  const { campaignNameById, clientCampaignIds } = useChatHistoryGroupLabels(filters.groupBy)
  const conversationCacheArgs = [
    simpleSidebar,
    historyAgentKey,
    activeOrgId,
    clientScope?.clientId,
  ] as const
  const initialConversations = peekConversationCache(...conversationCacheArgs)
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
    if (storeConversations.length === 0) return
    setConversations((prev) =>
      mergeConversationsWithStore(
        prev,
        storeConversations,
        historyAgentKey,
        clientScope?.campaignId,
      ),
    )
  }, [clientScope?.campaignId, historyAgentKey, storeConversations])
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
    const cacheKey = conversationCacheKey(...conversationCacheArgs)
    const peeked = peekConversationCache(...conversationCacheArgs)
    if (peeked) {
      setConversations(peeked)
      setLoading(false)
    } else {
      setConversations([])
      setLoading(true)
    }
    try {
      const rows = await cachedFetch(
        cacheKey,
        () =>
          fetchConversations(undefined, historyAgentKey, undefined, {
            ...(simpleSidebar ? { feedScope: 'all' as const } : {}),
            ...(clientScope?.campaignId ? { campaign_id: clientScope.campaignId } : {}),
          }),
        { ttlMs: 30_000 },
      )
      setConversations(rows)
    } catch {
      if (!peeked) setConversations([])
    } finally {
      setLoading(false)
    }
  }, [activeOrgId, clientScope?.campaignId, clientScope?.clientId, historyAgentKey, simpleSidebar])

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
      const shell = useShellStore.getState()
      const plan = historyConversationOpenPlan({
        conversationId: id,
        simpleSidebar,
        rememberedPage: shell.lastWorkAreaPageByConversation[id],
        pathname,
        hasHomeConvParam: Boolean(searchParams.get('conv') || searchParams.get('chat')),
      })
      if (plan.restore) shell.setPendingWorkRestore(plan.restore)
      if (plan.openDrawer) {
        if (plan.href) shell.setWorkAreaOpen(true)
        openChatDrawer(id)
      } else {
        setActiveConversationId(id)
      }
      if (plan.href) router.push(clientScopeHref(plan.href, clientScope?.clientId ?? null))
      onOpenChat?.()
    },
    [
      conversations,
      clientScope?.clientId,
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
      router.push(clientScopeHref('/home', clientScope?.clientId ?? null))
      onOpenChat?.()
      return
    }
    if (isShellHomeRoute(pathname) && (searchParams.get('conv') || searchParams.get('chat'))) {
      router.push(clientScopeHref('/home', clientScope?.clientId ?? null))
    }
    openFreshChatDrawer()
    onOpenChat?.()
  }, [
    onOpenChat,
    clientScope?.clientId,
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
      onFilterOpenChange={setFilterMenuOpen}
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
            await persistConversationPinned({
              conversationId,
              pinned,
              current: conversations.find((row) => row.id === conversationId),
              setConversations,
            })
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
            const href = clientScopeHref(
              `/home?conv=${encodeURIComponent(conversationId)}`,
              clientScope?.clientId ?? null,
            )
            const url = `${window.location.origin}${href}`
            void navigator.clipboard.writeText(url)
            toast.success('Link copied')
          }}
          onCopyConversationId={(conversationId) => {
            void navigator.clipboard.writeText(conversationId)
            toast.success('Conversation ID copied')
          }}
          onOpenConversationInNewTab={(conversationId) => {
            openInNewTab(
              clientScopeHref(
                `/home?conv=${encodeURIComponent(conversationId)}`,
                clientScope?.clientId ?? null,
              ),
            )
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
          showConversationTypeIcon={false}
          agentByKey={agentByKey}
          groupBy={filters.groupBy}
          campaignNameById={campaignNameById}
          clientCampaignIds={
            filters.groupBy === 'client' && clientCampaignIds.length > 0
              ? clientCampaignIds
              : undefined
          }
          splitPinnedSection={simpleSidebar}
          headerEndSlot={filterControls}
          pinHeaderActions={filterMenuOpen}
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
