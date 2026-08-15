'use client'

import { create } from 'zustand'
import { useSpacesStore } from '@/features/spaces/store/use-spaces-store'
import { useChatStore } from '@/features/studio/store/use-chat-store'
import { cachedFetch } from '@/lib/cache/keyed-fetch-cache'
import { fetchTeamRoster, type TeamRosterEntry } from '@/lib/team/team-roster-api'
import {
  defaultAgentForSurface,
  GLOBAL_CHAT_DEFAULT_AGENT,
  isAgentAllowedForWorkContext,
  mergeAttachedWorkContext,
  surfaceFromPathname,
} from '../config/work-context.config'
import {
  readLegacySpacesChatCollapsed,
  readLegacySpacesChatWidth,
  readPersistedGlobalChat,
  writePersistedGlobalChat,
  type GlobalChatRailIntent,
  type GlobalWorkContext,
} from '../lib/global-chat-storage'

export const GLOBAL_CHAT_SEED_EVENT = 'vibey:global-chat-seed'
export const GLOBAL_CHAT_AGENT_SWITCH_EVENT = 'vibey:global-chat-agent-switch'
export const GLOBAL_CHAT_VOICE_START_EVENT = 'vibey:global-chat-voice-start'

export interface GlobalChatVoiceStartDetail {
  agentKey: string
}

export interface GlobalChatAgentSwitchDetail {
  agentKey: string
}

export interface GlobalChatSeedDetail {
  content: string
  agentKey?: string
  workContext?: Partial<GlobalWorkContext>
  railIntent?: GlobalChatRailIntent
  /** When set, open this conversation instead of starting a new/current thread. */
  conversationId?: string
  /** `attach` puts docs on the composer without sending; default sends. */
  seedMode?: 'send' | 'attach'
  /**
   * Create-menu item id (shell-create-menu.config). On attach the panel arms
   * the matching quick start so its systemContext rides the eventual send.
   */
  quickStartId?: string
  model?: string
  documents?: unknown[]
  artifacts?: unknown[]
  references?: unknown[]
  modelSettings?: unknown
}

export interface GlobalMeetingChatContext {
  spaceId: string
  meetingItemId: string
  conversationId: string
  awarenessContext: string
  timelineVersion: number
}

function defaultWorkContext(): GlobalWorkContext {
  return { surface: 'general' }
}

interface GlobalChatStore {
  collapsed: boolean
  widthPercent: number
  railIntent: GlobalChatRailIntent
  activeAgentKey: string
  workContext: GlobalWorkContext
  meetingContext: GlobalMeetingChatContext | null
  suggestedWorkContext: GlobalWorkContext | null
  roster: TeamRosterEntry[]
  rosterLoaded: boolean
  pendingSeed: GlobalChatSeedDetail | null
  pendingVoiceStart: GlobalChatVoiceStartDetail | null
  hideForHumanDm: boolean
  conversationListMode: 'scoped' | 'all'
  setCollapsed: (collapsed: boolean) => void
  setWidthPercent: (widthPercent: number) => void
  setRailIntent: (intent: GlobalChatRailIntent) => void
  setActiveAgentKey: (agentKey: string) => void
  requestAgentSwitch: (agentKey: string) => void
  setWorkContext: (patch: Partial<GlobalWorkContext>) => void
  attachMeetingContext: (context: GlobalMeetingChatContext) => void
  continueMeetingConversation: (context: GlobalMeetingChatContext) => void
  clearMeetingContext: () => void
  setSuggestedWorkContext: (ctx: GlobalWorkContext | null) => void
  syncRouteContext: (pathname: string) => void
  loadRoster: () => Promise<void>
  expandAndFocus: (opts?: {
    railIntent?: GlobalChatRailIntent
    agentKey?: string
    workContext?: Partial<GlobalWorkContext>
  }) => void
  seedComposer: (detail: GlobalChatSeedDetail) => void
  consumePendingSeed: () => GlobalChatSeedDetail | null
  requestVoiceStart: (agentKey: string, workContext?: Partial<GlobalWorkContext>) => void
  consumePendingVoiceStart: () => GlobalChatVoiceStartDetail | null
  setHideForHumanDm: (hide: boolean) => void
  setConversationListMode: (mode: 'scoped' | 'all') => void
  openConversationList: () => void
}

const persisted = typeof window !== 'undefined' ? readPersistedGlobalChat() : {}
const legacyCollapsed = typeof window !== 'undefined' ? readLegacySpacesChatCollapsed() : false
const legacyWidth = typeof window !== 'undefined' ? readLegacySpacesChatWidth() : null

export const useGlobalChatStore = create<GlobalChatStore>((set, get) => ({
  collapsed: persisted.collapsed ?? legacyCollapsed,
  widthPercent: persisted.widthPercent ?? legacyWidth ?? 40,
  railIntent: null,
  activeAgentKey: persisted.activeAgentKey ?? GLOBAL_CHAT_DEFAULT_AGENT,
  workContext: persisted.workContext ?? defaultWorkContext(),
  meetingContext: null,
  suggestedWorkContext: null,
  roster: [],
  rosterLoaded: false,
  pendingSeed: null,
  pendingVoiceStart: null,
  hideForHumanDm: false,
  conversationListMode: 'all',

  setCollapsed: (collapsed) => {
    writePersistedGlobalChat({ collapsed })
    set({ collapsed })
    useSpacesStore.getState().setChatCollapsed(collapsed)
  },

  setWidthPercent: (widthPercent) => {
    writePersistedGlobalChat({ widthPercent })
    set({ widthPercent })
  },

  setRailIntent: (intent) => {
    set({ railIntent: intent })
    // Keep Spaces rail intent in sync, including clears (meeting open cancels a stale "new").
    useSpacesStore
      .getState()
      .setChatRailIntent(intent === 'new' ? 'new' : intent === 'list' ? 'list' : null)
  },

  setActiveAgentKey: (agentKey) => {
    writePersistedGlobalChat({ activeAgentKey: agentKey })
    set({ activeAgentKey: agentKey })
  },

  requestAgentSwitch: (agentKey) => {
    writePersistedGlobalChat({ activeAgentKey: agentKey })
    set({ activeAgentKey: agentKey })
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent<GlobalChatAgentSwitchDetail>(GLOBAL_CHAT_AGENT_SWITCH_EVENT, {
          detail: { agentKey },
        }),
      )
    }
  },

  setWorkContext: (patch) => {
    const next = mergeAttachedWorkContext(get().workContext, patch)
    writePersistedGlobalChat({ workContext: next })
    set({ workContext: next })
  },

  attachMeetingContext: (meetingContext) => {
    const current = get().meetingContext
    if (
      current &&
      current.spaceId === meetingContext.spaceId &&
      current.meetingItemId === meetingContext.meetingItemId &&
      current.conversationId === meetingContext.conversationId &&
      current.awarenessContext === meetingContext.awarenessContext &&
      current.timelineVersion === meetingContext.timelineVersion
    ) {
      useChatStore.getState().setActiveConversationId(meetingContext.conversationId)
      return
    }
    // Meeting threads are Vibey-scoped; keep the agent filter off Delegator/etc.
    const nextWork = mergeAttachedWorkContext(get().workContext, {
      surface: 'spaces',
      spaceId: meetingContext.spaceId,
    })
    writePersistedGlobalChat({
      workContext: nextWork,
      activeAgentKey: GLOBAL_CHAT_DEFAULT_AGENT,
    })
    // Select first so consumers never observe a meeting context paired with a stale chat.
    useChatStore.getState().setActiveConversationId(meetingContext.conversationId)
    set({
      meetingContext,
      workContext: nextWork,
      activeAgentKey: GLOBAL_CHAT_DEFAULT_AGENT,
    })
  },

  continueMeetingConversation: (meetingContext) => {
    get().attachMeetingContext(meetingContext)
    get().setRailIntent(null)
    get().expandAndFocus({ railIntent: null })
  },

  clearMeetingContext: () => set({ meetingContext: null }),

  setSuggestedWorkContext: (ctx) => set({ suggestedWorkContext: ctx }),

  syncRouteContext: (pathname) => {
    const surface = surfaceFromPathname(pathname)
    const suggested: GlobalWorkContext = { surface }
    if (surface === 'spaces') {
      const activeSpaceId = useSpacesStore.getState().activeSpaceId
      const spaces = useSpacesStore.getState().spaces
      const activeSpace = spaces.find((s) => s.id === activeSpaceId)
      if (activeSpaceId) {
        suggested.spaceId = activeSpaceId
        suggested.campaignId = activeSpace?.campaign_id ?? null
      }
    }
    const channelMatch = pathname.match(/^\/home\/channels\/([^/]+)/)
    if (channelMatch?.[1]) {
      suggested.channelId = channelMatch[1]
    }
    set({ suggestedWorkContext: suggested })
    // Attached context follows the open conversation, not the background page.
    if (!useChatStore.getState().activeConversationId) {
      get().setWorkContext(suggested)
    }
  },

  loadRoster: async () => {
    const rows = await cachedFetch('team-roster:all', () => fetchTeamRoster({ kind: 'all' }), {
      ttlMs: 60_000,
    })
    set({ roster: rows, rosterLoaded: true })
    useSpacesStore.setState({ roster: rows, rosterLoaded: true })
  },

  expandAndFocus: (opts) => {
    const nextWork = opts?.workContext
      ? mergeAttachedWorkContext(get().workContext, opts.workContext)
      : get().workContext
    if (opts?.workContext) {
      get().setWorkContext(opts.workContext)
    }
    const agentKey = opts?.agentKey ?? get().activeAgentKey
    if (opts?.agentKey) {
      get().setActiveAgentKey(agentKey)
    } else if (!isAgentAllowedForWorkContext(agentKey, nextWork)) {
      get().setActiveAgentKey(defaultAgentForSurface(nextWork.surface))
    }
    set({ collapsed: false, railIntent: opts?.railIntent ?? null })
    writePersistedGlobalChat({ collapsed: false })
    useSpacesStore.getState().setChatCollapsed(false)
  },

  seedComposer: (detail) => {
    get().expandAndFocus({
      agentKey: detail.agentKey,
      workContext: detail.workContext,
      railIntent: detail.railIntent,
    })
    set({ pendingSeed: detail })
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(GLOBAL_CHAT_SEED_EVENT, { detail }))
    }
  },

  consumePendingSeed: () => {
    const pending = get().pendingSeed
    if (pending) set({ pendingSeed: null })
    return pending
  },

  requestVoiceStart: (agentKey, workContext) => {
    const detail: GlobalChatVoiceStartDetail = { agentKey }
    get().expandAndFocus({
      agentKey,
      workContext: workContext ?? { surface: 'general' },
    })
    set({ pendingVoiceStart: detail })
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent<GlobalChatVoiceStartDetail>(GLOBAL_CHAT_VOICE_START_EVENT, { detail }),
      )
    }
  },

  consumePendingVoiceStart: () => {
    const pending = get().pendingVoiceStart
    if (pending) set({ pendingVoiceStart: null })
    return pending
  },

  setHideForHumanDm: (hide) => set({ hideForHumanDm: hide }),

  setConversationListMode: (mode) => set({ conversationListMode: mode }),

  openConversationList: () => {
    get().expandAndFocus({ railIntent: 'list' })
  },
}))
