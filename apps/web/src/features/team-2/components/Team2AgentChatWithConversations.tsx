'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { MissionAgent } from '@/features/mission-control/types'
import type { ArtifactPreviewSelection } from '@/features/spaces/components/artifacts/artifact-preview-selection'
import { ArtifactPreviewPanelHost } from '@/features/spaces/components/artifacts/ArtifactPreviewPanelHost'
import { fetchConversations, selectConversation } from '@/features/studio/services/chat.service'
import { useChatStore } from '@/features/studio/store/use-chat-store'
import type { Conversation } from '@/features/studio/types'
import { AgentChatPanel } from '@/features/team/components/AgentChatPanel'
import { cachedFetch } from '@/lib/cache/keyed-fetch-cache'
import type { Campaign } from '@/lib/campaigns'
import { reportFreezeEvent } from '@/lib/debug/freeze-diagnostics'
import { teamDmArtifactPreviewSelectionFromDetail } from '../lib/team-dm-artifact-preview'
import { ConversationScopeBanner } from './ConversationScopeBanner'
import {
  ConversationScopePicker,
  type ConversationScopePickerHandle,
} from './ConversationScopePicker'

/**
 * In-memory stale-while-revalidate cache for Team agent chat conversation lists,
 * keyed by agent key. Warms history for the panel without showing a mid-page list
 * (history lives in the global chat rail when the user opens Chat).
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
  assignedCampaigns?: Campaign[]
  nonGeneralCampaigns?: Campaign[]
  generalCampaignId?: string
  systemContext?: string
  compactLayout?: boolean
}

/**
 * Team agent chat tab — single middle composer (blank on open) + optional artifact
 * preview. Conversation history is not duplicated here; use the global Chat rail.
 */
export function Team2AgentChatWithConversations({
  agent,
  modelId,
  assignedCampaigns = [],
  nonGeneralCampaigns = [],
  generalCampaignId,
  systemContext,
  compactLayout = false,
}: Team2AgentChatWithConversationsProps) {
  const [conversations, setConversations] = useState<Conversation[]>(
    () => teamAgentConversationsCache.get(agent.agent_key) ?? [],
  )
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [artifactPreviewSelection, setArtifactPreviewSelection] =
    useState<ArtifactPreviewSelection | null>(null)
  const [draftNonce, setDraftNonce] = useState(0)
  const [isBlankDraft, setIsBlankDraft] = useState(true)
  const chatPreviewRowRef = useRef<HTMLDivElement>(null)
  const conversationScopePickerRef = useRef<ConversationScopePickerHandle>(null)
  const conversationScopeBannerAddRef = useRef<HTMLButtonElement>(null)

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

  const warmConversations = useCallback(async (isCancelled: () => boolean = () => false) => {
    const startedAt = performance.now()
    reportFreezeEvent('component_mark', {
      component: 'Team2AgentChatWithConversations',
      phase: 'conversations_background_start',
      agent_key: agent.agent_key,
    })
    try {
      const list = await cachedFetch(`conversations:agent:${agent.agent_key}`, () =>
        fetchConversations(undefined, agent.agent_key),
      )
      reportFreezeEvent('component_mark', {
        component: 'Team2AgentChatWithConversations',
        phase: 'conversations_background_end',
        agent_key: agent.agent_key,
        conversations_count: list.length,
        duration_ms: performance.now() - startedAt,
      })
      if (isCancelled()) return
      list.forEach((c) => useChatStore.getState().addConversation(c))
      setConversations(list)
    } catch {
      // Warming is best-effort; the panel fetches on send/session change.
    }
  }, [agent.agent_key])

  useEffect(() => {
    let cancelled = false
    setIsBlankDraft(true)
    setSelectedConversationId(null)
    useChatStore.getState().setActiveConversationId(null)
    setDraftNonce((value) => value + 1)
    void warmConversations(() => cancelled)
    return () => {
      cancelled = true
    }
  }, [agent.agent_key, warmConversations])

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
      setIsBlankDraft(false)
      setSelectedConversationId(conversation.id)
      void selectConversation(conversation.id)
    }
    window.addEventListener('vibey:conversation-forked', handler)
    return () => window.removeEventListener('vibey:conversation-forked', handler)
  }, [agent.agent_key])

  return (
    <div
      className={
        compactLayout
          ? 'flex min-h-0 w-full flex-col overflow-hidden'
          : 'flex h-full min-h-0 flex-1 overflow-hidden'
      }
    >
      <div
        ref={chatPreviewRowRef}
        className={
          compactLayout
            ? 'flex min-h-0 w-full flex-col overflow-hidden'
            : 'flex h-full min-h-0 min-w-0 flex-1 overflow-hidden'
        }
      >
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
          systemContext={systemContext}
          compactLayout={compactLayout}
          assignedCampaigns={assignedCampaigns}
          nonGeneralCampaigns={nonGeneralCampaigns}
          generalCampaignId={generalCampaignId}
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
        {!compactLayout ? (
          <ArtifactPreviewPanelHost
            parentRef={chatPreviewRowRef}
            campaignId={selectedConversation?.campaign_id ?? ''}
            selection={artifactPreviewSelection}
            onClose={() => setArtifactPreviewSelection(null)}
          />
        ) : null}
      </div>
    </div>
  )
}
