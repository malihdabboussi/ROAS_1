'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { toast } from 'sonner'
import { ConversationShareModal } from '@/components/conversations'
import { SpaceConversationsList } from '@/components/conversations/SpaceConversationsListAdapter'
import type { MissionAgent } from '@/features/mission-control/types'
import { orgService, type TeamRosterEntry } from '@/features/org/services/org.service'
import { useOrgStore } from '@/features/org/store/use-org-store'
import type { ArtifactPreviewSelection } from '@/features/spaces/components/artifacts/artifact-preview-selection'
import { ArtifactPreviewPanelHost } from '@/features/spaces/components/artifacts/ArtifactPreviewPanelHost'
import { SpaceConversationsCollapsedRail } from '@/features/spaces/components/chat/SpaceConversationsCollapsedRail'
import {
  assignConversationCampaign,
  deleteConversation,
  duplicateConversation,
  fetchConversations,
  renameConversation,
  selectConversation,
  setConversationArchived,
  setConversationPinned,
} from '@/features/studio/services/chat.service'
import { useChatStore } from '@/features/studio/store/use-chat-store'
import type { Conversation } from '@/features/studio/types'
import { AgentChatPanel } from '@/features/team/components/AgentChatPanel'
import { cachedFetch } from '@/lib/cache/keyed-fetch-cache'
import { reportFreezeEvent } from '@/lib/debug/freeze-diagnostics'
import { cn } from '@/lib/utils/cn'
import { openInNewTab } from '@/lib/utils/open-in-new-tab'
import { teamDmArtifactPreviewSelectionFromDetail } from '../lib/team-dm-artifact-preview'
import { ConversationScopeBanner } from './ConversationScopeBanner'
import {
  ConversationScopePicker,
  type ConversationScopePickerHandle,
} from './ConversationScopePicker'

const COLLAPSED_CONVERSATIONS_WIDTH_PX = 56
const EXPANDED_CONVERSATIONS_WIDTH_PX = 288
/** Slightly longer than Spaces chat (300ms) — smaller width delta reads as a snap otherwise. */
const CONVERSATIONS_SIDEBAR_WIDTH_TRANSITION_MS = 250

/**
 * In-memory stale-while-revalidate cache for the Team 2 agent chat
 * conversation lists, keyed by agent key. Switching agents (or returning to
 * /team) paints the last known list instantly while the fresh list loads in
 * the background. Model: `spaceConversationsCache`
 * (`features/studio/services/space-conversations-cache.ts`).
 */
const teamAgentConversationsByKey = new Map<string, Conversation[]>()

const teamAgentConversationsCache = {
  get(agentKey: string): Conversation[] | undefined {
    return teamAgentConversationsByKey.get(agentKey)
  },
  set(agentKey: string, conversations: Conversation[]) {
    teamAgentConversationsByKey.set(agentKey, conversations)
  },
}

function sortConversationsByUpdatedAt(list: Conversation[]): Conversation[] {
  return [...list].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  )
}

function mergeSidebarConversations(
  prev: Conversation[],
  incoming: Conversation[],
  agentKey: string,
): Conversation[] {
  const merged = new Map<string, Conversation>()
  for (const conversation of incoming) merged.set(conversation.id, conversation)
  for (const conversation of prev) {
    if (!merged.has(conversation.id)) merged.set(conversation.id, conversation)
  }
  for (const conversation of useChatStore.getState().conversations) {
    if (conversation.agent_id !== agentKey) continue
    const existing = merged.get(conversation.id)
    merged.set(conversation.id, existing ? { ...existing, ...conversation } : conversation)
  }
  return sortConversationsByUpdatedAt([...merged.values()])
}

interface Team2AgentChatWithConversationsProps {
  agent: MissionAgent
  modelId: string
}

/**
 * Team 2 chat tab — left rail keeps Team 2's `SpaceConversationsList` design.
 * Right side mounts the canonical `AgentChatPanel` (Team) with chrome hidden;
 * compact composer matches Team HR / Spaces chat sizing.
 *
 * `key={agent}-${draftNonce}` remounts only when the user explicitly starts a new draft.
 * Conversation switches (including first send from draft) update `initialSessionId` without remounting.
 */
export function Team2AgentChatWithConversations({
  agent,
  modelId,
}: Team2AgentChatWithConversationsProps) {
  const activeOrgId = useOrgStore((s) => s.activeOrgId)
  const conversationShareOrgName = useOrgStore(
    (s) => s.getActiveOrg()?.organizations.name ?? 'Workspace',
  )
  const isOrgContext = activeOrgId !== null
  // Cache-first: paint the last known conversation list synchronously on
  // mount, then revalidate in the background (model: spaceConversationsCache).
  const [conversations, setConversations] = useState<Conversation[]>(
    () => teamAgentConversationsCache.get(agent.agent_key) ?? [],
  )
  const [conversationsLoading, setConversationsLoading] = useState(false)
  const [conversationQuery, setConversationQuery] = useState('')
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [roster, setRoster] = useState<TeamRosterEntry[]>([])
  const [shareConversation, setShareConversation] = useState<Conversation | null>(null)
  const [artifactPreviewSelection, setArtifactPreviewSelection] =
    useState<ArtifactPreviewSelection | null>(null)
  const [conversationsCollapsed, setConversationsCollapsed] = useState(false)
  const [openCompactSearch, setOpenCompactSearch] = useState(false)
  const [desktopSidebar, setDesktopSidebar] = useState(false)
  const [draftNonce, setDraftNonce] = useState(0)
  const [isBlankDraft, setIsBlankDraft] = useState(false)
  const chatPreviewRowRef = useRef<HTMLDivElement>(null)
  const conversationScopePickerRef = useRef<ConversationScopePickerHandle>(null)
  const conversationScopeBannerAddRef = useRef<HTMLButtonElement>(null)
  const selectedConversationIdRef = useRef<string | null>(null)

  useEffect(() => {
    selectedConversationIdRef.current = selectedConversationId
  }, [selectedConversationId])

  // Keep the per-agent cache in sync with local state. If the agent changes
  // in place (no remount), reset to the new agent's cached list instead of
  // writing the previous agent's rows under the new key.
  const conversationsScopeRef = useRef(agent.agent_key)
  useEffect(() => {
    if (conversationsScopeRef.current !== agent.agent_key) {
      conversationsScopeRef.current = agent.agent_key
      setConversations(teamAgentConversationsCache.get(agent.agent_key) ?? [])
      return
    }
    teamAgentConversationsCache.set(agent.agent_key, conversations)
  }, [agent.agent_key, conversations])

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId],
  )

  const loadConversations = useCallback(
    async (isCancelled: () => boolean = () => false, opts?: { background?: boolean }) => {
      const background = opts?.background === true
      const startedAt = performance.now()
      const debugPhase = background ? 'conversations_background' : 'conversations'
      reportFreezeEvent('component_mark', {
        component: 'Team2AgentChatWithConversations',
        phase: `${debugPhase}_start`,
        agent_key: agent.agent_key,
      })
      if (!background) setConversationsLoading(true)
      try {
        // ttl 0 = dedupe only — concurrent callers (this sidebar + the
        // AgentChatPanel mount fetch) share a single request.
        const list = await cachedFetch(`conversations:agent:${agent.agent_key}`, () =>
          fetchConversations(undefined, agent.agent_key),
        )
        reportFreezeEvent('component_mark', {
          component: 'Team2AgentChatWithConversations',
          phase: `${debugPhase}_end`,
          agent_key: agent.agent_key,
          conversations_count: list.length,
          duration_ms: performance.now() - startedAt,
        })
        if (isCancelled()) return
        list.forEach((c) => useChatStore.getState().addConversation(c))
        setConversations(list)
        if (background) {
          // Background revalidation of a cache-painted list: keep the current
          // selection when it still exists; only reconcile when it vanished.
          const currentId = selectedConversationIdRef.current
          if (currentId && list.some((c) => c.id === currentId)) return
        }
        const target = list[0]?.id ?? null
        setSelectedConversationId(target)
        if (target) await selectConversation(target)
        else useChatStore.getState().setActiveConversationId(null)
      } finally {
        if (!isCancelled() && !background) setConversationsLoading(false)
      }
    },
    [agent.agent_key],
  )

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 768px)')
    const syncDesktopSidebar = () => setDesktopSidebar(mediaQuery.matches)
    syncDesktopSidebar()
    mediaQuery.addEventListener('change', syncDesktopSidebar)
    return () => mediaQuery.removeEventListener('change', syncDesktopSidebar)
  }, [])

  useEffect(() => {
    let cancelled = false
    setIsBlankDraft(false)
    const cached = teamAgentConversationsCache.get(agent.agent_key)
    if (cached && cached.length > 0) {
      // Cache-first: restore the last list and select its first conversation
      // instantly (messages hydrate from the chat store when warm), then
      // revalidate in the background — no blank flash on agent switches.
      const target = cached[0]?.id ?? null
      setSelectedConversationId(target)
      if (target) void selectConversation(target)
      else useChatStore.getState().setActiveConversationId(null)
      void loadConversations(() => cancelled, { background: true })
    } else {
      setSelectedConversationId(null)
      useChatStore.getState().setActiveConversationId(null)
      void loadConversations(() => cancelled)
    }
    return () => {
      cancelled = true
    }
  }, [agent.agent_key, loadConversations])

  useEffect(() => {
    if (!isOrgContext) {
      setRoster([])
      return
    }
    let cancelled = false
    orgService
      .listRoster({ kind: 'human' })
      .then((rows) => {
        if (!cancelled) setRoster(rows)
      })
      .catch(() => {
        if (!cancelled) setRoster([])
      })
    return () => {
      cancelled = true
    }
  }, [isOrgContext])

  const handleNewConversation = useCallback(() => {
    setSelectedConversationId(null)
    setIsBlankDraft(true)
    useChatStore.getState().setActiveConversationId(null)
    setDraftNonce((value) => value + 1)
  }, [])

  const handlePanelSessionChange = useCallback(
    (conversationId: string | null) => {
      if (!conversationId) {
        setSelectedConversationId(null)
        return
      }
      setIsBlankDraft(false)
      const cached = useChatStore
        .getState()
        .conversations.find((c) => c.id === conversationId && c.agent_id === agent.agent_key)
      if (cached) {
        setSelectedConversationId(conversationId)
        setConversations((prev) => mergeSidebarConversations(prev, [cached], agent.agent_key))
      }
      void cachedFetch(`conversations:agent:${agent.agent_key}`, () =>
        fetchConversations(undefined, agent.agent_key),
      ).then((list) => {
        list.forEach((conversation) => useChatStore.getState().addConversation(conversation))
        setConversations((prev) => mergeSidebarConversations(prev, list, agent.agent_key))
        if (list.some((conversation) => conversation.id === conversationId)) {
          setSelectedConversationId(conversationId)
        }
      })
    },
    [agent.agent_key],
  )

  const handleSelectConversation = useCallback(async (conversationId: string) => {
    setIsBlankDraft(false)
    setSelectedConversationId(conversationId)
    await selectConversation(conversationId)
  }, [])

  const handleDeleteConversation = useCallback(
    async (conversationId: string) => {
      await deleteConversation(conversationId)
      useChatStore.getState().removeConversation(conversationId)
      let nextList: Conversation[] = []
      setConversations((prev) => {
        nextList = prev.filter((c) => c.id !== conversationId)
        return nextList
      })
      if (selectedConversationId === conversationId) {
        const fallback = nextList[0]?.id ?? null
        setSelectedConversationId(fallback)
        if (fallback) void selectConversation(fallback)
      }
    },
    [selectedConversationId],
  )

  const handleRenameConversation = useCallback(async (conversationId: string, title: string) => {
    try {
      await renameConversation(conversationId, title)
      useChatStore.getState().updateConversation(conversationId, { title })
      setConversations((prev) => prev.map((c) => (c.id === conversationId ? { ...c, title } : c)))
    } catch (err) {
      console.error('Rename conversation failed:', err)
      toast.error('Could not rename conversation')
    }
  }, [])

  const handleTogglePinConversation = useCallback(
    async (conversationId: string, pinned: boolean) => {
      try {
        const updated = await setConversationPinned(conversationId, pinned)
        useChatStore.getState().updateConversation(conversationId, { metadata: updated.metadata })
        setConversations((prev) =>
          prev.map((c) => (c.id === conversationId ? { ...c, metadata: updated.metadata } : c)),
        )
      } catch (err) {
        console.error('Pin conversation failed:', err)
        toast.error(pinned ? 'Could not pin conversation' : 'Could not unpin conversation')
      }
    },
    [],
  )

  const handleToggleArchiveConversation = useCallback(
    async (conversationId: string, archived: boolean) => {
      try {
        const updated = await setConversationArchived(conversationId, archived)
        useChatStore.getState().updateConversation(conversationId, { status: updated.status })
        setConversations((prev) =>
          prev.map((c) => (c.id === conversationId ? { ...c, status: updated.status } : c)),
        )
      } catch (err) {
        console.error('Archive conversation failed:', err)
        toast.error(
          archived ? 'Could not archive conversation' : 'Could not unarchive conversation',
        )
      }
    },
    [],
  )

  const handleMoveConversation = useCallback(
    async (conversationId: string, nextCampaignId: string | null) => {
      try {
        const updated = await assignConversationCampaign(conversationId, nextCampaignId)
        useChatStore
          .getState()
          .updateConversation(conversationId, { campaign_id: updated.campaign_id })
        setConversations((prev) =>
          prev.map((c) =>
            c.id === conversationId ? { ...c, campaign_id: updated.campaign_id } : c,
          ),
        )
        toast.success('Moved to campaign')
      } catch (err) {
        console.error('Move conversation failed:', err)
        toast.error('Could not move conversation')
      }
    },
    [],
  )

  const handleDuplicateConversation = useCallback(
    async (conversationId: string, targetCampaignId?: string | null) => {
      try {
        const newConv = await duplicateConversation(conversationId, {
          campaignId: targetCampaignId === undefined ? undefined : targetCampaignId,
        })
        setConversations((prev) => [newConv, ...prev.filter((c) => c.id !== newConv.id)])
        toast.success('Conversation duplicated')
      } catch (err) {
        console.error('Duplicate conversation failed:', err)
        toast.error('Could not duplicate conversation')
      }
    },
    [],
  )

  const buildConversationUrl = useCallback(
    (conversationId: string) => {
      if (typeof window === 'undefined') return ''
      return `${window.location.origin}/team?agent=${encodeURIComponent(
        agent.agent_key,
      )}&tab=chat&conv=${encodeURIComponent(conversationId)}`
    },
    [agent.agent_key],
  )

  const handleCopyConversationLink = useCallback(
    (conversationId: string) => {
      const url = buildConversationUrl(conversationId)
      if (!url) return
      try {
        void navigator.clipboard.writeText(url)
        toast.success('Link copied')
      } catch {
        toast.error('Could not copy link')
      }
    },
    [buildConversationUrl],
  )

  const handleCopyConversationId = useCallback((conversationId: string) => {
    try {
      void navigator.clipboard.writeText(conversationId)
      toast.success('ID copied')
    } catch {
      toast.error('Could not copy ID')
    }
  }, [])

  const handleOpenConversationInNewTab = useCallback(
    (conversationId: string) => {
      const url = buildConversationUrl(conversationId)
      if (!url) return
      openInNewTab(url)
    },
    [buildConversationUrl],
  )

  const handleConversationUpdated = useCallback(
    (updated: Conversation) => {
      useChatStore.getState().updateConversation(updated.id, updated)
      setConversations((prev) => mergeSidebarConversations(prev, [updated], agent.agent_key))
    },
    [agent.agent_key],
  )

  useEffect(() => {
    const handler = (event: Event) => {
      const selection = teamDmArtifactPreviewSelectionFromDetail(
        (
          event as CustomEvent<{
            artifactType?: string
            artifactId?: string
            name?: string
          }>
        ).detail ?? {},
      )
      if (selection) setArtifactPreviewSelection(selection)
    }
    window.addEventListener('vibey-open-artifact', handler)
    return () => window.removeEventListener('vibey-open-artifact', handler)
  }, [])

  useEffect(() => {
    const handler = (event: Event) => {
      const ev = event as CustomEvent<{ conversation: Conversation }>
      const conversation = ev.detail?.conversation
      if (!conversation?.id) return
      if (conversation.agent_id && conversation.agent_id !== agent.agent_key) return
      setConversations((prev) => [
        conversation,
        ...prev.filter((item) => item.id !== conversation.id),
      ])
      setSelectedConversationId(conversation.id)
      void selectConversation(conversation.id)
    }
    window.addEventListener('vibey:conversation-forked', handler)
    return () => window.removeEventListener('vibey:conversation-forked', handler)
  }, [agent.agent_key])

  const sidebarWidthStyle: CSSProperties = {
    width: desktopSidebar
      ? conversationsCollapsed
        ? `${COLLAPSED_CONVERSATIONS_WIDTH_PX}px`
        : `${EXPANDED_CONVERSATIONS_WIDTH_PX}px`
      : conversationsCollapsed
        ? `${COLLAPSED_CONVERSATIONS_WIDTH_PX}px`
        : '100%',
    transition: `width ${CONVERSATIONS_SIDEBAR_WIDTH_TRANSITION_MS}ms ease-out`,
  }

  return (
    <div className="gap-spacing-2 flex h-full min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
      <div
        data-team-agent-conversations-sidebar
        className={cn(
          'relative min-h-0 min-w-0 shrink-0 overflow-hidden will-change-[width]',
          desktopSidebar ? 'pb-spacing-3 flex h-full flex-col' : 'max-h-[min(40vh,260px)]',
        )}
        style={sidebarWidthStyle}
      >
        <div className="card-glass flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border-0">
          <div className={conversationsCollapsed ? 'hidden' : 'h-full min-h-0'}>
            <SpaceConversationsList
              hideBackButton
              hideHeaderBottomBorder
              compactHeader
              parentControlsCollapse
              collapsed={conversationsCollapsed}
              onCollapsedChange={setConversationsCollapsed}
              openCompactSearch={openCompactSearch}
              onOpenCompactSearchConsumed={() => setOpenCompactSearch(false)}
              conversations={conversations}
              selectedConversationId={selectedConversationId}
              query={conversationQuery}
              onQueryChange={setConversationQuery}
              onSelectConversation={(conversationId) =>
                void handleSelectConversation(conversationId)
              }
              onNewConversation={() => void handleNewConversation()}
              onDeleteConversation={(conversationId) =>
                void handleDeleteConversation(conversationId)
              }
              onRenameConversation={handleRenameConversation}
              onTogglePinConversation={handleTogglePinConversation}
              onToggleArchiveConversation={handleToggleArchiveConversation}
              onMoveConversation={handleMoveConversation}
              onDuplicateConversation={handleDuplicateConversation}
              onCopyConversationLink={handleCopyConversationLink}
              onCopyConversationId={handleCopyConversationId}
              onOpenConversationInNewTab={handleOpenConversationInNewTab}
              onShareConversation={setShareConversation}
              onBack={() => {}}
              loading={conversationsLoading}
              isOrgContext={isOrgContext}
            />
          </div>
          {conversationsCollapsed ? (
            <div className="h-full min-h-0">
              <SpaceConversationsCollapsedRail
                onExpand={() => setConversationsCollapsed(false)}
                onNewConversation={() => void handleNewConversation()}
                onOpenSearch={() => {
                  setConversationsCollapsed(false)
                  setOpenCompactSearch(true)
                }}
              />
            </div>
          ) : null}
        </div>
      </div>
      <div ref={chatPreviewRowRef} className="flex h-full min-h-0 min-w-0 flex-1 overflow-hidden">
        <AgentChatPanel
          key={`${agent.agent_key}-${draftNonce}`}
          agent={agent}
          modelId={modelId}
          initialSessionId={selectedConversationId}
          onSessionChange={handlePanelSessionChange}
          onConversationUpdated={handleConversationUpdated}
          startBlankSession={isBlankDraft}
          hideConversationsSidebar
          hideHeader
          hideCampaignPanel
          composerStyle="compact"
          renderComposerTopSlot={({ selectedSession }) => (
            <ConversationScopeBanner
              conversationId={selectedSession?.id ?? null}
              addButtonRef={conversationScopeBannerAddRef}
              onAddClick={() => conversationScopePickerRef.current?.openMenuFromBanner()}
            />
          )}
          renderComposerFooterAfterIntegrationsSlot={({
            selectedSession,
            onConversationUpdated,
          }) => (
            <ConversationScopePicker
              ref={conversationScopePickerRef}
              bannerAnchorRef={conversationScopeBannerAddRef}
              conversation={selectedSession}
              onConversationUpdated={(updated) => {
                onConversationUpdated(updated)
                handleConversationUpdated(updated)
              }}
            />
          )}
        />
        <ArtifactPreviewPanelHost
          parentRef={chatPreviewRowRef}
          campaignId={selectedConversation?.campaign_id ?? ''}
          selection={artifactPreviewSelection}
          onClose={() => setArtifactPreviewSelection(null)}
        />
      </div>
      {isOrgContext ? (
        <ConversationShareModal
          activeOrgId={activeOrgId}
          open={shareConversation !== null}
          conversation={shareConversation}
          orgName={conversationShareOrgName}
          roster={roster}
          onClose={() => setShareConversation(null)}
          onSharesChanged={() => void loadConversations()}
        />
      ) : null}
    </div>
  )
}
