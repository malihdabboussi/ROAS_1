'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { ArrowLeft, Menu, PanelRight, Settings } from 'lucide-react'
import { toast } from 'sonner'
import { STUDIO_INLINE_ERRORS } from '../config/studio-inline-errors.config'
import { useCampaignMode } from '../contexts/CampaignModeContext'
import { usePanelResize } from '../hooks/usePanelResize'
import { usePreviewErrorFeedback } from '../hooks/usePreviewErrorFeedback'
import { readStudioOpenArtifactBootstrap } from '../lib/open-studio-artifact'
import { fetchCampaigns } from '../services/campaign.service'
import {
  fetchConversations,
  fetchMessages,
  isStreamActive,
  mergeMessagesPreservingOrderedBlocks,
  needsStreamRecovery,
  recoverConversation,
  sendMessageStreaming,
} from '../services/chat.service'
import { initStreamResilience } from '../services/stream-resilience'
import { useChatStore } from '../store/use-chat-store'
import { ChatInterface } from '../components/ChatInterface'
import { ResizableDivider } from '../components/layout/ResizableDivider'
import { StudioHeaderBar } from '../components/layout/StudioHeaderBar'
import { CampaignPreviewPanel } from '../components/preview/CampaignPreviewPanel'

/** Update the ?c= search param without triggering a navigation */
function syncConversationToUrl(conversationId: string | null) {
  const url = new URL(window.location.href)
  if (conversationId) {
    url.searchParams.set('c', conversationId)
  } else {
    url.searchParams.delete('c')
  }
  window.history.replaceState(window.history.state, '', url.toString())
}

export function StudioContainer() {
  return <StudioLayout />
}

function StudioLayout() {
  const setConversations = useChatStore((s) => s.setConversations)
  const setActiveConversationId = useChatStore((s) => s.setActiveConversationId)
  const setMessages = useChatStore((s) => s.setMessages)
  const setIsLoadingMessages = useChatStore((s) => s.setIsLoadingMessages)

  const { isPanelMinimized, activeCampaignId, activeCampaignName, setActiveCampaign, expandPanel } =
    useCampaignMode()
  usePreviewErrorFeedback(activeCampaignId)
  const activeConversationId = useChatStore((s) => s.activeConversationId)
  const conversations = useChatStore((s) => s.conversations)
  const showHome = activeConversationId === null
  const mobileConversationTitle =
    conversations.find((c) => c.id === activeConversationId)?.title ?? ''
  const campaignRestoredRef = useRef(false)
  const skipCampaignReloadRef = useRef(false)
  const { chatWidthPercent, isDragging, containerRef, handleMouseDown } = usePanelResize()
  const [isMobile, setIsMobile] = useState(false)
  const [mobileScreen, setMobileScreen] = useState<'chat' | 'campaign' | 'preview'>('chat')
  const [mobilePreviewInfo, setMobilePreviewInfo] = useState<{
    name: string
    hasSettings: boolean
  }>({ name: 'Preview', hasSettings: false })

  const searchParams = useSearchParams()
  const conversationFromUrl = searchParams.get('c')
  const discoveryMode = searchParams.get('discovery') === 'true'
  const discoverySentRef = useRef(false)

  useEffect(() => {
    initStreamResilience()
  }, [])

  useLayoutEffect(() => {
    const bootstrap = readStudioOpenArtifactBootstrap()
    if (!bootstrap) return

    setActiveCampaign(
      bootstrap.campaignId,
      bootstrap.campaignName ?? 'Campaign',
      bootstrap.campaignIcon ?? 'folder-kanban',
    )
    expandPanel('artifacts')
    window.__vibey_pending_artifact_open = bootstrap.pending
    window.dispatchEvent(new CustomEvent('workflow:open-artifact'))
    useChatStore.getState().setActiveConversationId(null)
    syncConversationToUrl(null)
  }, [setActiveCampaign, expandPanel])

  // Sync activeConversationId → URL whenever it changes
  useEffect(() => {
    let prev = useChatStore.getState().activeConversationId
    return useChatStore.subscribe((state) => {
      if (state.activeConversationId !== prev) {
        prev = state.activeConversationId
        syncConversationToUrl(state.activeConversationId)
      }
    })
  }, [])

  // Load conversations on mount and when campaign changes
  const loadGenRef = useRef(0)
  useEffect(() => {
    // Skip re-load when campaign was just restored from a conversation —
    // prevents the double-fetch cycle (unfiltered → campaign-filtered)
    if (skipCampaignReloadRef.current) {
      skipCampaignReloadRef.current = false
      return
    }

    const gen = ++loadGenRef.current

    async function load() {
      const state = useChatStore.getState()
      const wantsNew = state.wantsNewConversation

      // If store already has conversations and user is just switching campaigns,
      // skip the network fetch — sidebar filters client-side instantly.
      if (wantsNew && state.conversations.length > 0) {
        return
      }

      if (wantsNew) {
        try {
          const convs = await fetchConversations()
          if (gen !== loadGenRef.current) return
          setConversations(convs)
        } catch (e) {
          toast.error(
            e instanceof Error ? e.message : STUDIO_INLINE_ERRORS.LOAD_CONVERSATIONS_FAILED,
          )
        }
        return
      }

      // Determine probable target BEFORE fetching so we can check the cache
      const liveUrlId =
        typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('c') : null
      const urlId = liveUrlId ?? conversationFromUrl
      const cachedActiveId = state.activeConversationId
      const probableTarget = urlId ?? cachedActiveId

      const hasPendingActiveConversation =
        !!cachedActiveId &&
        cachedActiveId.startsWith('pending-') &&
        ((state.messagesByConversation[cachedActiveId]?.length ?? 0) > 0 ||
          isStreamActive(cachedActiveId))

      // When URL has no ?c= and there is no cached active conversation,
      // clear persisted state so StudioHome shows.
      // Keep state intact if we are in an in-flight pending conversation
      // OR if we have a valid cached conversation (e.g. returning from /team).
      if (!urlId && !hasPendingActiveConversation && !cachedActiveId) {
        setActiveConversationId(null)
      }
      const hasCachedMessages = probableTarget
        ? (state.messagesByConversation[probableTarget]?.length ?? 0) > 0
        : false

      // Only show loading indicator when there are no cached messages to display —
      // if cache exists the user already sees the conversation instantly
      if (!hasCachedMessages) {
        setIsLoadingMessages(true)
      }

      try {
        const convs = await fetchConversations()
        if (gen !== loadGenRef.current) return
        setConversations(convs)

        const latestState = useChatStore.getState()
        const latestActiveId = latestState.activeConversationId
        const hasPendingLatestConversation =
          !!latestActiveId &&
          latestActiveId.startsWith('pending-') &&
          ((latestState.messagesByConversation[latestActiveId]?.length ?? 0) > 0 ||
            isStreamActive(latestActiveId))

        // Prefer URL conversation when valid; otherwise preserve active conversation
        // if it's already in store (including optimistic pending IDs).
        const urlExists = urlId && convs.some((c) => c.id === urlId)
        const activeExists =
          !!latestActiveId &&
          (convs.some((c) => c.id === latestActiveId) || hasPendingLatestConversation)
        const targetId = urlExists ? urlId : activeExists ? latestActiveId : null

        if (targetId) {
          setActiveConversationId(targetId)
          const hasCachedTargetMessages = (state.messagesByConversation[targetId]?.length ?? 0) > 0
          if (!isStreamActive(targetId) && !hasCachedTargetMessages) {
            const msgs = await fetchMessages(targetId)
            if (gen !== loadGenRef.current) return
            setMessages(targetId, msgs)

            if (needsStreamRecovery(msgs)) {
              void recoverConversation(targetId)
            }
          } else if (!isStreamActive(targetId) && hasCachedTargetMessages) {
            const cached = state.messagesByConversation[targetId] ?? []
            if (needsStreamRecovery(cached)) {
              void recoverConversation(targetId)
            }
            void fetchMessages(targetId)
              .then((msgs) => {
                if (gen !== loadGenRef.current || isStreamActive(targetId)) return
                const local = useChatStore.getState().messagesByConversation[targetId] ?? []
                useChatStore
                  .getState()
                  .setMessages(targetId, mergeMessagesPreservingOrderedBlocks(local, msgs))
              })
              .catch(() => {})
          }
          // Restore campaign on refresh
          if (activeCampaignId === null && !campaignRestoredRef.current) {
            const selectedConv = convs.find((c) => c.id === targetId)
            if (selectedConv?.campaign_id) {
              campaignRestoredRef.current = true
              skipCampaignReloadRef.current = true
              try {
                const allCampaigns = await fetchCampaigns()
                if (gen !== loadGenRef.current) return
                const campaign = allCampaigns.find((c) => c.id === selectedConv.campaign_id)
                if (campaign) {
                  const icon =
                    ((campaign.config as Record<string, unknown>)?.icon as string) ??
                    'folder-kanban'
                  setActiveCampaign(campaign.id, campaign.name ?? 'Campaign', icon)
                }
              } catch (e) {
                toast.error(
                  e instanceof Error ? e.message : STUDIO_INLINE_ERRORS.RESTORE_CAMPAIGN_FAILED,
                )
              }
            }
          }
        } else {
          setActiveConversationId(null)
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : STUDIO_INLINE_ERRORS.LOAD_CONVERSATIONS_FAILED)
      } finally {
        if (gen === loadGenRef.current) {
          setIsLoadingMessages(false)
        }
      }
    }
    void load()
  }, [activeCampaignId])

  // Listen for vibey:sendMessage (e.g. from Instagram post "Ask Pixel to reply")
  useEffect(() => {
    const handler = (e: Event) => {
      const ev = e as CustomEvent<{ content: string }>
      const content = ev.detail?.content
      if (!content) return
      if (isMobile) setMobileScreen('chat')
      void sendMessageStreaming({
        conversation_id: activeConversationId ?? undefined,
        campaign_id: activeCampaignId ?? undefined,
        content,
      })
    }
    window.addEventListener('vibey:sendMessage', handler)
    return () => window.removeEventListener('vibey:sendMessage', handler)
  }, [activeConversationId, activeCampaignId, isMobile])

  useEffect(() => {
    if (!discoveryMode || discoverySentRef.current) return
    discoverySentRef.current = true
    const prompt = [
      'Discovery Mode: ROAS onboarding conversation.',
      'Phase 1: Ask focused questions to understand the business.',
      'Only after enough information, synthesize a proposed RPSO:',
      '- Result',
      '- Purpose',
      '- Strategy',
      '- Off-Limits',
      'Do not jump to mission creation before RPSO draft.',
    ].join('\n')
    void sendMessageStreaming({
      conversation_id: activeConversationId ?? undefined,
      campaign_id: activeCampaignId ?? undefined,
      content: prompt,
      suppressUserMessage: true,
    }).finally(() => {
      const url = new URL(window.location.href)
      url.searchParams.delete('discovery')
      window.history.replaceState(window.history.state, '', url.toString())
    })
  }, [discoveryMode, activeConversationId, activeCampaignId])

  // Global artifact watcher — triggers on child content (something to show), not empty folders.
  // funnel_pages, sequence_emails, ad_sets, ads = actual content. offers UPDATE = step added.
  useEffect(() => {
    if (!activeCampaignId) {
      return
    }
    const sb = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    const add = (nodeId: string) => {
      useChatStore.getState().addNewArtifactId(nodeId)
      if (isPanelMinimized) expandPanel('artifacts')
    }

    const channelName = `new-artifacts:${activeCampaignId}`
    let ch = sb.channel(channelName)

    // Child tables (no campaign_id; we subscribe broadly, RLS limits visibility)
    ch = ch
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'funnel_pages' }, (p) => {
        const id = (p.new as Record<string, unknown>)?.id as string | undefined
        if (id) add(`page-${id}`)
      })
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sequence_emails' },
        (p) => {
          const id = (p.new as Record<string, unknown>)?.id as string | undefined
          if (id) add(`email-${id}`)
        },
      )
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ad_sets' }, (p) => {
        const id = (p.new as Record<string, unknown>)?.id as string | undefined
        if (id) add(`adset-${id}`)
      })

    // Top-level leaf content (have campaign_id)
    for (const [table, prefix] of [
      ['ads', 'ad'],
      ['offers', 'offer'],
      ['lead_magnets', 'lm'],
      ['avatars', 'avatar'],
      ['social_posts', 'social-post'],
      ['funnels', 'funnel'],
      ['sequences', 'sequence'],
      ['ad_campaigns', 'adcamp'],
    ] as const) {
      ch = ch.on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table, filter: `campaign_id=eq.${activeCampaignId}` },
        (p) => {
          const id = (p.new as Record<string, unknown>)?.id as string | undefined
          if (id) add(`${prefix}-${id}`)
        },
      )
    }

    // Offer step added (UPDATE to offers)
    ch = ch.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'offers',
        filter: `campaign_id=eq.${activeCampaignId}`,
      },
      (p) => {
        const id = (p.new as Record<string, unknown>)?.id as string | undefined
        if (id) add(`offer-${id}`)
      },
    )

    const channel = ch.subscribe((status, err) => {
      if (status === 'CHANNEL_ERROR') console.error('[Realtime] new-artifacts channel error:', err)
    })
    return () => {
      void sb.removeChannel(channel)
      useChatStore.getState().clearNewArtifactIds()
    }
  }, [activeCampaignId, expandPanel, isPanelMinimized])

  // Supabase Realtime: sync messages when DB changes while SSE is not connected.
  // This catches the case where the agent finishes a response while the user is on
  // another page or conversation. SSE is primary; this is the safety net.
  useEffect(() => {
    if (!activeConversationId || activeConversationId.startsWith('pending-')) return

    const sb = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    let debounceTimer: ReturnType<typeof setTimeout> | null = null

    const channel = sb
      .channel(`messages:${activeConversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${activeConversationId}`,
        },
        () => {
          if (isStreamActive(activeConversationId)) return

          if (debounceTimer) clearTimeout(debounceTimer)
          debounceTimer = setTimeout(() => {
            void fetchMessages(activeConversationId)
              .then((msgs) => {
                if (!isStreamActive(activeConversationId)) {
                  const store = useChatStore.getState()
                  const local = store.messagesByConversation[activeConversationId] ?? []
                  store.setMessages(
                    activeConversationId,
                    mergeMessagesPreservingOrderedBlocks(local, msgs),
                  )
                }
              })
              .catch(() => {})
          }, 500)
        },
      )
      .subscribe()

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      void sb.removeChannel(channel)
    }
  }, [activeConversationId])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)')
    const handleChange = () => setIsMobile(mediaQuery.matches)
    handleChange()
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    if (isMobile) setMobileScreen('chat')
  }, [activeCampaignId, isMobile])

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ name: string; hasSettings: boolean }>).detail
      setMobilePreviewInfo(detail)
      setMobileScreen('preview')
    }
    window.addEventListener('mobile-artifact-preview', handler)
    return () => window.removeEventListener('mobile-artifact-preview', handler)
  }, [])

  const hasCampaign = activeCampaignId !== null

  /* ════════════════════════════════════════════════════════════════════════
     MOBILE: full-screen navigation stack  Menu ← Chat → Campaign → Preview
     ════════════════════════════════════════════════════════════════════════ */
  if (isMobile) {
    return (
      <div ref={containerRef} className="relative h-full w-full overflow-hidden">
        {/* ── Screen 1: Chat (default) ── */}
        <div
          className={`absolute inset-0 flex flex-col bg-[var(--color-background)] transition-transform duration-300 ease-in-out ${
            mobileScreen === 'chat' ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex items-center gap-3 px-3 pb-1 pt-3">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event('toggle-mobile-sidebar'))}
              className="chip-glass-neutral h-spacing-8 w-spacing-8 flex items-center justify-center rounded-lg"
              aria-label="Open menu"
            >
              <Menu className="h-4 w-4" />
            </button>
            <span className="body-2 min-w-0 flex-1 truncate text-center font-medium text-[var(--color-foreground)]">
              {mobileConversationTitle}
            </span>
            {hasCampaign ? (
              <button
                type="button"
                onClick={() => setMobileScreen('campaign')}
                className="chip-glass-neutral h-spacing-8 w-spacing-8 flex items-center justify-center rounded-lg"
                aria-label="Open campaign"
              >
                <PanelRight className="h-4 w-4" />
              </button>
            ) : (
              <div className="w-spacing-8" />
            )}
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <ChatInterface />
          </div>
        </div>

        {/* ── Screen 2+3: Campaign / Preview (single instance, header swaps) ── */}
        {hasCampaign && (
          <div
            className={`absolute inset-0 flex flex-col bg-[var(--color-background)] transition-transform duration-300 ease-in-out ${
              mobileScreen === 'chat' ? 'translate-x-full' : 'translate-x-0'
            }`}
          >
            {mobileScreen === 'preview' ? (
              <div className="flex items-center gap-3 px-3 pb-1 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    if (mobilePreviewInfo.name === 'Settings') {
                      setMobilePreviewInfo({
                        name: activeCampaignName ?? 'Campaign',
                        hasSettings: true,
                      })
                      window.dispatchEvent(new Event('mobile-artifact-back'))
                      return
                    }
                    setMobileScreen('campaign')
                    window.dispatchEvent(new Event('mobile-artifact-back'))
                  }}
                  className="chip-glass-neutral h-spacing-8 w-spacing-8 flex items-center justify-center rounded-lg"
                  aria-label="Back to campaign"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <span className="body-2 min-w-0 flex-1 truncate text-center font-medium text-[var(--color-foreground)]">
                  {mobilePreviewInfo.name}
                </span>
                {mobilePreviewInfo.hasSettings ? (
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new Event('mobile-artifact-settings'))}
                    className="chip-glass-neutral h-spacing-8 w-spacing-8 flex items-center justify-center rounded-lg"
                    aria-label="Settings"
                  >
                    <Settings className="h-4 w-4" />
                  </button>
                ) : (
                  <div className="w-spacing-8" />
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3 px-3 pb-1 pt-3">
                <button
                  type="button"
                  onClick={() => setMobileScreen('chat')}
                  className="chip-glass-neutral h-spacing-8 w-spacing-8 flex items-center justify-center rounded-lg"
                  aria-label="Back to chat"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <span className="body-2 min-w-0 flex-1 truncate text-center font-medium text-[var(--color-foreground)]">
                  {activeCampaignName ?? 'Campaign'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setMobilePreviewInfo({ name: 'Settings', hasSettings: false })
                    setMobileScreen('preview')
                    window.dispatchEvent(new CustomEvent('mobile-open-settings'))
                  }}
                  className="chip-glass-neutral h-spacing-8 w-spacing-8 flex items-center justify-center rounded-lg"
                  aria-label="Campaign settings"
                >
                  <Settings className="h-4 w-4" />
                </button>
              </div>
            )}
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <CampaignPreviewPanel mobilePreviewMode={mobileScreen === 'preview'} />
            </div>
          </div>
        )}
      </div>
    )
  }

  /* ════════════════════════════════════════════════════════════════════════
     DESKTOP: split pane layout (unchanged)
     ════════════════════════════════════════════════════════════════════════ */
  return (
    <div ref={containerRef} className="flex h-full min-h-0 overflow-hidden">
      <div
        className={`relative flex h-full min-h-0 flex-col ${
          isDragging ? '' : 'transition-all duration-300 ease-in-out'
        } ${!hasCampaign || isPanelMinimized ? 'flex-1' : ''}`}
        style={
          hasCampaign && !isPanelMinimized
            ? { width: `${chatWidthPercent}%`, minWidth: '300px' }
            : undefined
        }
      >
        {(!showHome || hasCampaign) && <StudioHeaderBar />}
        <ChatInterface />
      </div>

      {hasCampaign && !isPanelMinimized && (
        <ResizableDivider onMouseDown={handleMouseDown} isDragging={isDragging} compact />
      )}

      {hasCampaign && (
        <div
          className={`flex min-h-0 flex-col overflow-hidden bg-[var(--color-background)] ${
            isDragging ? '' : 'transition-[flex,opacity] duration-300 ease-in-out'
          } ${isPanelMinimized ? 'flex-[0_0_0%] opacity-0' : 'flex-1 opacity-100'}`}
        >
          <CampaignPreviewPanel />
        </div>
      )}
    </div>
  )
}
