'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { toast } from 'sonner'
import { ChatHistoryFilterMenu } from '@/components/conversations/ChatHistoryFilterMenu'
import { SpaceConversationsList } from '@/components/conversations/SpaceConversationsListAdapter'
import { useGlobalChatStore } from '@/components/global-chat/store/use-global-chat-store'
import { useShellStore } from '@/components/shell/use-shell-store'
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
import { useOrgStore } from '@/lib/org'
import { cn } from '@/lib/utils/cn'
import { openInNewTab } from '@/lib/utils/open-in-new-tab'

export function AllChatsPage() {
  const openChatDrawer = useShellStore((s) => s.openChatDrawer)
  const openFreshChatDrawer = useShellStore((s) => s.openFreshChatDrawer)
  const setWorkAreaOpen = useShellStore((s) => s.setWorkAreaOpen)

  const activeAgentKey = useGlobalChatStore((s) => s.activeAgentKey)
  const roster = useGlobalChatStore((s) => s.roster)
  const loadRoster = useGlobalChatStore((s) => s.loadRoster)
  const setActiveConversationId = useChatStore((s) => s.setActiveConversationId)

  const activeOrgId = useOrgStore((s) => s.activeOrgId)
  const isOrgContext = Boolean(activeOrgId)

  const [filters, setFilters] = useState<ChatHistoryFilterState>({
    ...DEFAULT_CHAT_HISTORY_FILTERS,
    status: 'all',
    leadingIcon: 'agent',
  })
  /** Full-page chats always loads every agent; Icon filter only changes row leading marks. */
  const allAgentsMode = true
  const [listQuery, setListQuery] = useState('')
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [campaignNameById, setCampaignNameById] = useState<Record<string, string>>({})
  const [conversations, setConversations] = useState<Conversation[]>(
    () => peekCachedFetch<Conversation[]>('shell-conversations:all') ?? [],
  )
  const [loading, setLoading] = useState(
    () => peekCachedFetch<Conversation[]>('shell-conversations:all') === undefined,
  )

  useEffect(() => {
    void loadRoster()
  }, [loadRoster])

  useEffect(() => {
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
  }, [])

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

  useEffect(() => {
    const cacheKey = `shell-conversations:${allAgentsMode ? 'all' : activeAgentKey}`
    const peeked = peekCachedFetch<Conversation[]>(cacheKey)
    if (peeked) {
      setConversations(peeked)
      setLoading(false)
    } else {
      setLoading(true)
    }
    let cancelled = false
    void cachedFetch(
      cacheKey,
      () => fetchConversations(undefined, allAgentsMode ? null : activeAgentKey),
      { ttlMs: 30_000 },
    )
      .then((rows) => {
        if (!cancelled) setConversations(rows)
      })
      .catch(() => {
        if (!cancelled && !peeked) setConversations([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [activeAgentKey, allAgentsMode])

  const visibleConversations = useMemo(
    () => filterConversationsForHistory(conversations, filters),
    [conversations, filters],
  )

  const openConversation = useCallback(
    (id: string) => {
      if (selectMode) {
        setSelectedIds((prev) => {
          const next = new Set(prev)
          if (next.has(id)) next.delete(id)
          else next.add(id)
          return next
        })
        return
      }
      openChatDrawer(id)
      setWorkAreaOpen(true)
    },
    [openChatDrawer, selectMode, setWorkAreaOpen],
  )

  const handleNew = useCallback(() => {
    setActiveConversationId(null)
    openFreshChatDrawer()
    setWorkAreaOpen(true)
  }, [openFreshChatDrawer, setActiveConversationId, setWorkAreaOpen])

  const archiveSelected = useCallback(async () => {
    const ids = [...selectedIds]
    for (const id of ids) {
      await setConversationArchived(id, true)
    }
    invalidateCachedFetch('shell-conversations:')
    setConversations((prev) =>
      prev.map((row) => (selectedIds.has(row.id) ? { ...row, status: 'archived' } : row)),
    )
    setSelectedIds(new Set())
    setSelectMode(false)
    toast.success(`Archived ${ids.length} chat${ids.length === 1 ? '' : 's'}`)
  }, [selectedIds])

  const deleteSelected = useCallback(async () => {
    const ids = [...selectedIds]
    for (const id of ids) {
      await deleteConversation(id)
      useChatStore.getState().removeConversation(id)
    }
    invalidateCachedFetch('shell-conversations:')
    setConversations((prev) => prev.filter((row) => !selectedIds.has(row.id)))
    setSelectedIds(new Set())
    setSelectMode(false)
    toast.success(`Deleted ${ids.length} chat${ids.length === 1 ? '' : 's'}`)
  }, [selectedIds])

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div className="border-border gap-spacing-3 px-spacing-6 py-spacing-4 flex shrink-0 flex-wrap items-center border-b">
        <h1 className="typo-title text-foreground min-w-0 flex-1">CHATS AND TASKS</h1>
        <div className="gap-spacing-2 flex flex-wrap items-center">
          <label className="border-border bg-card gap-spacing-2 rounded-spacing-2 px-spacing-3 relative flex h-9 min-w-[200px] items-center border">
            <Search className="text-muted-foreground icon-sm shrink-0" aria-hidden />
            <input
              value={listQuery}
              onChange={(event) => setListQuery(event.target.value)}
              placeholder="Search"
              aria-label="Search chats"
              className="body-3 text-foreground placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent outline-none"
            />
          </label>
          <ChatHistoryFilterMenu value={filters} onChange={setFilters} />
          <button
            type="button"
            onClick={() => {
              setSelectMode((prev) => !prev)
              setSelectedIds(new Set())
            }}
            className={cn(
              'body-3 border-border rounded-spacing-2 px-spacing-3 h-9 border font-medium',
              selectMode ? 'bg-secondary text-foreground' : 'bg-card text-foreground',
            )}
          >
            {selectMode ? 'Cancel' : 'Select'}
          </button>
          <button
            type="button"
            onClick={handleNew}
            className="body-3 bg-foreground text-background rounded-spacing-2 gap-spacing-1 px-spacing-3 inline-flex h-9 items-center font-semibold"
          >
            <Plus className="icon-sm" aria-hidden />
            New
          </button>
        </div>
      </div>

      {selectMode && selectedIds.size > 0 ? (
        <div className="border-border bg-secondary gap-spacing-2 px-spacing-6 py-spacing-2 flex shrink-0 items-center border-b">
          <span className="body-3 text-muted-foreground">{selectedIds.size} selected</span>
          <button
            type="button"
            onClick={() => void archiveSelected()}
            className="body-3 text-foreground hover:underline"
          >
            Archive
          </button>
          <button
            type="button"
            onClick={() => void deleteSelected()}
            className="body-3 text-destructive hover:underline"
          >
            Delete
          </button>
        </div>
      ) : null}

      <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col overflow-hidden">
        <SpaceConversationsList
          conversations={visibleConversations}
          selectedConversationId={null}
          query={listQuery}
          onQueryChange={setListQuery}
          onSelectConversation={openConversation}
          onNewConversation={handleNew}
          onDeleteConversation={async (conversationId) => {
            await deleteConversation(conversationId)
            invalidateCachedFetch('shell-conversations:')
            useChatStore.getState().removeConversation(conversationId)
            setConversations((prev) => prev.filter((c) => c.id !== conversationId))
          }}
          onRenameConversation={async (conversationId, title) => {
            await renameConversation(conversationId, title)
            invalidateCachedFetch('shell-conversations:')
            setConversations((prev) =>
              prev.map((c) => (c.id === conversationId ? { ...c, title } : c)),
            )
          }}
          onTogglePinConversation={async (conversationId, pinned) => {
            const updated = await setConversationPinned(conversationId, pinned)
            invalidateCachedFetch('shell-conversations:')
            setConversations((prev) =>
              prev.map((c) => (c.id === conversationId ? { ...c, metadata: updated.metadata } : c)),
            )
          }}
          onToggleArchiveConversation={async (conversationId, archived) => {
            const updated = await setConversationArchived(conversationId, archived)
            invalidateCachedFetch('shell-conversations:')
            setConversations((prev) =>
              prev.map((c) => (c.id === conversationId ? { ...c, status: updated.status } : c)),
            )
          }}
          onMoveConversation={async (conversationId, campaignId) => {
            const updated = await assignConversationCampaign(conversationId, campaignId)
            invalidateCachedFetch('shell-conversations:')
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
          onShareConversation={() => undefined}
          onBack={() => undefined}
          loading={loading}
          hideBackButton
          hideHeaderBottomBorder
          hideNewButton
          hideSearch
          isOrgContext={isOrgContext}
          allAgentsMode={allAgentsMode}
          leadingIcon={filters.leadingIcon}
          agentByKey={agentByKey}
          groupBy={filters.groupBy}
          campaignNameById={campaignNameById}
        />
      </div>
    </div>
  )
}
