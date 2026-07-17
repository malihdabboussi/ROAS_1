'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ListFilter } from 'lucide-react'
import { toast } from 'sonner'
import { SpaceConversationsList } from '@/components/conversations/SpaceConversationsListAdapter'
import { Team2FilterDropdown } from '@/components/filters'
import { useGlobalChatStore } from '@/components/global-chat/store/use-global-chat-store'
import { useOrgStore } from '@/features/org/store/use-org-store'
import { useChatStore } from '@/features/studio/store/use-chat-store'
import { dispatchOpenStudioSearch } from '@/features/studio/utils/open-studio-search-result'
import { ShellSidebarSearchButton } from './ShellMenuChrome'
import {
  assignConversationCampaign,
  deleteConversation,
  duplicateConversation,
  fetchConversations,
  getConversationAgentKey,
  isConversationPinned,
  renameConversation,
  setConversationArchived,
  setConversationPinned,
  type Conversation,
  type ConversationAgentDisplay,
} from '@/lib/conversations'
import { cachedFetch, invalidateCachedFetch, peekCachedFetch } from '@/lib/cache/keyed-fetch-cache'
import { useShellStore } from './use-shell-store'

type ChatListFilter = 'all' | 'pinned' | 'campaign' | 'non-campaign' | `agent:${string}`

function isWorkspacePath(pathname: string): boolean {
  return (
    pathname.startsWith('/spaces') ||
    pathname.startsWith('/campaigns') ||
    pathname.startsWith('/brain') ||
    pathname.startsWith('/flows') ||
    pathname.startsWith('/projects') ||
    pathname.startsWith('/team')
  )
}

function matchesChatFilter(conversation: Conversation, filter: ChatListFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'pinned') return isConversationPinned(conversation)
  if (filter === 'campaign') return Boolean(conversation.campaign_id)
  if (filter === 'non-campaign') return !conversation.campaign_id
  if (filter.startsWith('agent:')) {
    return getConversationAgentKey(conversation) === filter.slice('agent:'.length)
  }
  return true
}

export function ShellChatMenu() {
  const pathname = usePathname() ?? '/home'
  const router = useRouter()
  const openChatDrawer = useShellStore((s) => s.openChatDrawer)
  const restoreChatDrawer = useShellStore((s) => s.restoreChatDrawer)
  const requestNewChat = useShellStore((s) => s.requestNewChat)
  const setMenuMode = useShellStore((s) => s.setMenuMode)
  const chatDrawer = useShellStore((s) => s.chatDrawer)

  const activeAgentKey = useGlobalChatStore((s) => s.activeAgentKey)
  const roster = useGlobalChatStore((s) => s.roster)
  const loadRoster = useGlobalChatStore((s) => s.loadRoster)
  const setActiveConversationId = useChatStore((s) => s.setActiveConversationId)
  const storeConversations = useChatStore((s) => s.conversations)

  const activeOrgId = useOrgStore((s) => s.activeOrgId)
  const isOrgContext = Boolean(activeOrgId)

  const [allAgentsMode, setAllAgentsMode] = useState(false)
  const [listFilter, setListFilter] = useState<ChatListFilter>('all')
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    // Initial mount is always agent-scoped (allAgentsMode starts false).
    return peekCachedFetch<Conversation[]>(`shell-conversations:${activeAgentKey}`) ?? []
  })
  const [loading, setLoading] = useState(
    () => peekCachedFetch<Conversation[]>(`shell-conversations:${activeAgentKey}`) === undefined,
  )

  useEffect(() => {
    void loadRoster()
  }, [loadRoster])

  // Mirror live title updates from the chat send path into the shell list.
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
    () =>
      roster.filter(
        (entry) => entry.kind === 'agent' && Boolean(entry.agent_key?.trim()),
      ),
    [roster],
  )

  const agentByKey = useMemo(() => {
    const map: Record<string, ConversationAgentDisplay> = {}
    for (const agent of chatAgents) {
      map[agent.agent_key] = {
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

  const filterOptions = useMemo(() => {
    const agentKeys = new Set<string>()
    for (const conversation of conversations) {
      agentKeys.add(getConversationAgentKey(conversation))
    }
    const agentOptions = [...agentKeys]
      .sort((a, b) => {
        const nameA = agentByKey[a]?.name ?? a
        const nameB = agentByKey[b]?.name ?? b
        return nameA.localeCompare(nameB)
      })
      .map((agentKey) => ({
        id: `agent:${agentKey}`,
        label: agentByKey[agentKey]?.name ?? agentKey,
        description: 'Agent',
      }))
    return [
      { id: 'all', label: 'All chats' },
      { id: 'pinned', label: 'Pinned' },
      { id: 'campaign', label: 'Campaign chats' },
      { id: 'non-campaign', label: 'General chats' },
      ...agentOptions,
    ]
  }, [agentByKey, conversations])

  const visibleConversations = useMemo(
    () => conversations.filter((conversation) => matchesChatFilter(conversation, listFilter)),
    [conversations, listFilter],
  )

  const openConversation = useCallback(
    (id: string) => {
      setMenuMode('chat')
      if (isWorkspacePath(pathname)) {
        openChatDrawer(id)
        return
      }
      if (chatDrawer.minimized && chatDrawer.conversationId === id) {
        restoreChatDrawer()
      }
      router.push(`/home?conv=${encodeURIComponent(id)}`)
    },
    [
      chatDrawer.conversationId,
      chatDrawer.minimized,
      openChatDrawer,
      pathname,
      restoreChatDrawer,
      router,
      setMenuMode,
    ],
  )

  const handleNewConversation = useCallback(() => {
    requestNewChat()
    setMenuMode('chat')
    setActiveConversationId(null)
    router.push('/home?chat=new')
  }, [requestNewChat, router, setActiveConversationId, setMenuMode])

  const activeConversationId = useChatStore((s) => s.activeConversationId)
  const selectedConversationId = chatDrawer.conversationId ?? activeConversationId ?? null

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <SpaceConversationsList
        conversations={visibleConversations}
        selectedConversationId={selectedConversationId}
        query=""
        onQueryChange={() => undefined}
        hideSearch
        searchSlot={
          <ShellSidebarSearchButton embedded onClick={() => dispatchOpenStudioSearch()} />
        }
        onSelectConversation={openConversation}
        onNewConversation={handleNewConversation}
        onDeleteConversation={async (conversationId) => {
          await deleteConversation(conversationId)
          invalidateCachedFetch('shell-conversations:')
          useChatStore.getState().removeConversation(conversationId)
          setConversations((prev) => prev.filter((c) => c.id !== conversationId))
          if (selectedConversationId === conversationId) {
            setActiveConversationId(null)
            if (isWorkspacePath(pathname)) openChatDrawer(null)
            else router.push('/home')
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
            prev.map((c) =>
              c.id === conversationId ? { ...c, metadata: updated.metadata } : c,
            ),
          )
        }}
        onToggleArchiveConversation={async (conversationId, archived) => {
          const updated = await setConversationArchived(conversationId, archived)
          invalidateCachedFetch('shell-conversations:')
          useChatStore.getState().updateConversation(conversationId, {
            status: updated.status,
          })
          setConversations((prev) =>
            prev.map((c) =>
              c.id === conversationId ? { ...c, status: updated.status } : c,
            ),
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
              c.id === conversationId
                ? { ...c, campaign_id: updated.campaign_id }
                : c,
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
          window.open(`/home?conv=${encodeURIComponent(conversationId)}`, '_blank')
        }}
        onShareConversation={() => {
          toast.message('Share from the chat panel when available')
        }}
        onBack={() => undefined}
        loading={loading}
        hideBackButton
        hideHeaderBottomBorder
        hideNewButton
        isOrgContext={isOrgContext}
        showAllAgentsToggle
        allAgentsMode={allAgentsMode}
        onAllAgentsModeChange={setAllAgentsMode}
        agentByKey={agentByKey}
        headerEndSlot={
          <Team2FilterDropdown
            label="Filter"
            trigger="icon"
            icon={<ListFilter className="icon-sm" />}
            options={filterOptions}
            currentId={listFilter}
            onSelect={(id) => setListFilter(id as ChatListFilter)}
            align="right"
            menuClassName="min-w-48 max-h-72 overflow-y-auto"
            showDescriptionAsTooltip
          />
        }
      />
    </div>
  )
}
