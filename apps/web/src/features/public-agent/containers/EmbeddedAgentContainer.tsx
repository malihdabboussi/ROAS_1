'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Home, MessageSquare, Newspaper, X } from 'lucide-react'
import {
  fetchPublicWidgetConfig,
  prewarmPublicAgent,
  type WidgetConfigResponse,
  type WidgetHomeConfig,
  type WidgetNewsItem,
} from '../services/public-agent.service'
import type { PublicAgentInfo } from '../types/public-agent.types'
import { EmbeddedConversationsList } from './EmbeddedConversationsList'
import { EmbeddedHomeView } from './EmbeddedHomeView'
import { EmbeddedMessagesView } from './EmbeddedMessagesView'
import { EmbeddedNewsView } from './EmbeddedNewsView'

const ACTIVE_CONV_KEY_PREFIX = 'vibey-embed-active-conv-'
const VISITOR_ID_KEY = 'vibey-public-visitor-id'

type MessagesView = { mode: 'list' } | { mode: 'thread'; conversationId: string | null }

export interface EmbeddedAgentBrand {
  title: string
  subtitle: string | null
  greeting: string | null
  accentColor: string
  imageUrl: string | null
  poweredByTagline: string
}

interface EmbeddedAgentContainerProps {
  agent: PublicAgentInfo
  brand: EmbeddedAgentBrand
  /** Widget builder iframe: parent pushes config via postMessage; skip fetch to avoid overwriting draft. */
  suppressInitialWidgetFetch?: boolean
}

export type WidgetTab = 'home' | 'messages' | 'news'

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '')
  const full =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h
  const n = parseInt(full, 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

function contrastText(hex: string): string {
  try {
    const { r, g, b } = hexToRgb(hex)
    const yiq = (r * 299 + g * 587 + b * 114) / 1000
    return yiq >= 150 ? '#0f172a' : '#ffffff'
  } catch {
    return '#ffffff'
  }
}

function postToParent(type: string, payload?: Record<string, unknown>) {
  if (typeof window === 'undefined' || window.parent === window) return
  window.parent.postMessage({ source: 'vibey-widget', type, ...payload }, '*')
}

const TAB_ITEMS: { id: WidgetTab; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'news', label: 'Updates', icon: Newspaper },
]

export function EmbeddedAgentContainer({
  agent,
  brand,
  suppressInitialWidgetFetch = false,
}: EmbeddedAgentContainerProps) {
  const [activeTab, setActiveTab] = useState<WidgetTab>('home')
  const [widgetConfig, setWidgetConfig] = useState<WidgetConfigResponse | null>(null)
  const [messagesView, setMessagesView] = useState<MessagesView>({ mode: 'list' })
  const [visitorId, setVisitorId] = useState<string>('')
  const [savedEmail, setSavedEmail] = useState<string | null>(null)

  const shellTitle = widgetConfig?.title ?? brand.title
  const shellSubtitle =
    widgetConfig != null && widgetConfig.showSubtitle === false
      ? null
      : (widgetConfig?.subtitle ?? brand.subtitle)
  const shellGreeting = widgetConfig?.greeting ?? brand.greeting
  const accent = widgetConfig?.accentColor ?? brand.accentColor ?? '#7C3AED'
  const accentText = contrastText(accent)

  useEffect(() => {
    postToParent('ready')
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    let id = localStorage.getItem(VISITOR_ID_KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(VISITOR_ID_KEY, id)
    }
    setVisitorId(id)
    try {
      const raw = localStorage.getItem(`vibey-public-visitor-identity-${agent.agentKey}`)
      if (raw) {
        const parsed = JSON.parse(raw) as { email?: string }
        if (typeof parsed.email === 'string' && parsed.email.trim()) {
          setSavedEmail(parsed.email.trim().toLowerCase())
        }
      }
    } catch {
      // ignore malformed storage
    }
  }, [agent.agentKey])

  useEffect(() => {
    if (!visitorId) return
    void prewarmPublicAgent(agent.userSlug, agent.agentKey, { visitor_id: visitorId })
  }, [agent.agentKey, agent.userSlug, visitorId])

  const openConversation = useCallback(
    (id: string) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem(ACTIVE_CONV_KEY_PREFIX + agent.agentKey, id)
      }
      setMessagesView({ mode: 'thread', conversationId: id })
    },
    [agent.agentKey],
  )

  const startNewConversation = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(ACTIVE_CONV_KEY_PREFIX + agent.agentKey)
    }
    setMessagesView({ mode: 'thread', conversationId: null })
  }, [agent.agentKey])

  const goBackToList = useCallback(() => {
    setMessagesView({ mode: 'list' })
  }, [])

  const handleConversationCreated = useCallback(
    (id: string) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem(ACTIVE_CONV_KEY_PREFIX + agent.agentKey, id)
      }
      setMessagesView((prev) =>
        prev.mode === 'thread' && prev.conversationId === null
          ? { mode: 'thread', conversationId: id }
          : prev,
      )
    },
    [agent.agentKey],
  )

  useEffect(() => {
    if (suppressInitialWidgetFetch) return
    void fetchPublicWidgetConfig(agent.userSlug, agent.agentKey).then((cfg) => {
      if (cfg) setWidgetConfig(cfg)
    })
  }, [agent.userSlug, agent.agentKey, suppressInitialWidgetFetch])

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (!e.data || e.data.source !== 'vibey-widget-parent') return
      if (e.data.type === 'navigate' && typeof e.data.tab === 'string') {
        const t = e.data.tab
        if (t === 'help') return
        if (t === 'home' || t === 'messages' || t === 'news') {
          setActiveTab(t)
        }
      }
      if (e.data.type === 'config-update' && e.data.config) {
        setWidgetConfig(e.data.config as WidgetConfigResponse)
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  const handleTabChange = useCallback(
    (tab: WidgetTab) => {
      setActiveTab(tab)
      postToParent('tab-changed', { tab })
      if (tab === 'messages') {
        if (typeof window !== 'undefined') {
          const saved = localStorage.getItem(ACTIVE_CONV_KEY_PREFIX + agent.agentKey)
          if (saved) {
            setMessagesView({ mode: 'thread', conversationId: saved })
            return
          }
        }
        setMessagesView({ mode: 'list' })
      }
    },
    [agent.agentKey],
  )

  const homeConfig: WidgetHomeConfig = (widgetConfig?.homeConfig as WidgetHomeConfig) ?? {}
  const newsItems: WidgetNewsItem[] = (widgetConfig?.newsItems as WidgetNewsItem[]) ?? []

  const displayImage = widgetConfig?.imageUrl ?? brand.imageUrl

  const configForHome: WidgetConfigResponse = widgetConfig
    ? { ...widgetConfig, imageUrl: displayImage }
    : {
        name: shellTitle,
        role: '',
        imageUrl: displayImage,
        title: shellTitle,
        subtitle: shellSubtitle,
        greeting: shellGreeting,
        accentColor: accent,
        launcherIconUrl: null,
        position: 'bottom-right',
        allowedOrigins: [],
        userSlug: agent.userSlug,
        agentKey: agent.agentKey,
      }

  return (
    <div
      className="flex h-dvh flex-col bg-neutral-950 text-white"
      style={{ ['--vw-accent' as string]: accent, ['--vw-accent-text' as string]: accentText }}
    >
      {activeTab !== 'home' && (
        <header
          className="flex items-center gap-3 px-4 py-3"
          style={{ background: accent, color: accentText }}
        >
          {activeTab === 'messages' && (
            <button
              type="button"
              onClick={() => {
                if (messagesView.mode === 'thread') {
                  goBackToList()
                } else {
                  handleTabChange('home')
                }
              }}
              className="rounded-full p-1.5 opacity-80 transition-opacity hover:opacity-100"
              aria-label={messagesView.mode === 'thread' ? 'Back to conversations' : 'Back'}
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          {displayImage ? (
            <img
              src={displayImage}
              alt={shellTitle}
              className="h-9 w-9 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-sm font-bold">
              {shellTitle.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[15px] font-semibold leading-tight">{shellTitle}</h1>
            {shellSubtitle ? <p className="truncate text-xs opacity-80">{shellSubtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={() => postToParent('close')}
            className="rounded-full p-1.5 opacity-80 transition-opacity hover:opacity-100"
            aria-label="Close chat"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
      )}

      {activeTab === 'home' && (
        <EmbeddedHomeView
          config={configForHome}
          homeConfig={homeConfig}
          accent={accent}
          accentText={accentText}
          onNavigate={(tab) => handleTabChange(tab as WidgetTab)}
          onClose={() => postToParent('close')}
        />
      )}
      {activeTab === 'messages' &&
        (messagesView.mode === 'list' ? (
          <EmbeddedConversationsList
            agent={agent}
            accent={accent}
            accentText={accentText}
            visitorId={visitorId}
            visitorEmail={savedEmail}
            onOpenConversation={openConversation}
            onStartNew={startNewConversation}
          />
        ) : (
          <EmbeddedMessagesView
            agent={agent}
            accent={accent}
            accentText={accentText}
            title={shellTitle}
            greeting={shellGreeting}
            initialConversationId={messagesView.conversationId}
            onConversationCreated={handleConversationCreated}
          />
        ))}
      {activeTab === 'news' && (
        <EmbeddedNewsView items={newsItems} teamName={shellTitle} accent={accent} />
      )}

      <nav className="flex shrink-0 border-t border-white/10 bg-neutral-950">
        {TAB_ITEMS.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => handleTabChange(id)}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] transition-colors ${
                isActive ? 'text-white' : 'text-white/40 hover:text-white/60'
              }`}
            >
              <Icon className="h-5 w-5" style={isActive ? { color: accent } : undefined} />
              <span>{label}</span>
            </button>
          )
        })}
      </nav>

      <a
        href="https://vibey.im"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-1.5 border-t border-white/10 bg-neutral-950 py-1.5 text-[11px] text-white/50 transition-colors hover:text-white/80"
      >
        <span>{brand.poweredByTagline}</span>
      </a>
    </div>
  )
}
