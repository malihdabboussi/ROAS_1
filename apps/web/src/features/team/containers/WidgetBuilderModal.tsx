'use client'

import {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import {
  Check,
  ChevronDown,
  ChevronRight,
  Code,
  Copy,
  Info,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react'
import { ColorPickerPanelStandalone } from '@/components/ui/ColorPicker'
import { Switch } from '@/components/ui/forms/switch'
import { LucideIcon } from '@/components/ui/IconPicker'
import { Tooltip } from '@/components/ui/tooltip'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import type { MissionAgent } from '@/features/mission-control/types'
import {
  ColorPickerPopover,
  initialTagPanelValueFromOption,
  positionTagFullPickerNextToPresets,
  presetToHex,
  swatchVisualStyle,
} from '@/features/spaces/components/cells/field-color-presets-popover'
import { fetchCampaigns } from '@/features/studio/services/campaign.service'
import type { Campaign } from '@/features/studio/types'
import { backendGet, backendPatch } from '@/lib/api/backend-client'
import { resolveAppUrl } from '@/lib/platform/platform-urls'
import { cn } from '@/lib/utils/cn'
import { CampaignDestinationField } from '../components/shared/CampaignDestinationField'
import {
  WidgetBuilderImageField,
  WidgetBuilderImageFieldMenuPortalContext,
} from './WidgetBuilderImageField'

interface WidgetConfig {
  public_page_token: string | null
  widget_enabled: boolean
  widget_title: string | null
  widget_subtitle: string | null
  widget_show_subtitle: boolean
  widget_greeting: string | null
  widget_accent_color: string | null
  widget_launcher_icon_url: string | null
  widget_header_image_url: string | null
  widget_position: 'bottom-right' | 'bottom-left'
  widget_allowed_origins: string[]
  widget_home_config: HomeConfig
  widget_help_articles: HelpArticle[]
  widget_help_collections: HelpCollection[]
  widget_news_items: NewsItem[]
  widget_campaign_id: string | null
}

interface HomeConfig {
  heroText?: string
  ctaCards?: CtaCard[]
  showRecentMessage?: boolean
}

interface CtaCard {
  id: string
  title: string
  body: string
  imageUrl?: string
  linkUrl?: string
}

interface HelpArticle {
  id: string
  collection?: string
  title: string
  content: string
  order: number
}

interface HelpCollection {
  id: string
  name: string
  order: number
}

interface NewsItem {
  id: string
  title: string
  body: string
  imageUrl?: string
  linkUrl?: string
  publishedAt?: string
}

interface EndpointResponse {
  ok: boolean
  widget: WidgetConfig | null
  public_agent_slug: string | null
}

type BuilderTab = 'general' | 'home' | 'news'

const WIDGET_BUILDER_TABS: BuilderTab[] = ['general', 'home', 'news']

const WIDGET_BUILDER_TAB_META: Record<BuilderTab, { icon: string; label: string }> = {
  general: {
    icon: 'settings',
    label: 'General',
  },
  home: {
    icon: 'home',
    label: 'Home',
  },
  news: {
    icon: 'newspaper',
    label: 'Updates',
  },
}

const DEFAULT_HOME: HomeConfig = {
  heroText: 'Hello there.\nHow can we help?',
  showRecentMessage: true,
  ctaCards: [],
}

const DEFAULT_WIDGET_CONFIG: WidgetConfig = {
  public_page_token: null,
  widget_enabled: true,
  widget_title: null,
  widget_subtitle: null,
  widget_show_subtitle: true,
  widget_greeting: null,
  widget_accent_color: '#7C3AED',
  widget_launcher_icon_url: null,
  widget_header_image_url: null,
  widget_position: 'bottom-right',
  widget_allowed_origins: [],
  widget_home_config: DEFAULT_HOME,
  widget_help_articles: [],
  widget_help_collections: [],
  widget_news_items: [],
  widget_campaign_id: null,
}

interface WidgetBuilderModalProps {
  agent: MissionAgent
  /** Owner id for `/a/...` preview when `agent.user_id` is not on the mission payload. */
  viewerUserId?: string | null
  open: boolean
  onClose: () => void
  embedHost?: string
}

export function WidgetBuilderModal({
  agent,
  viewerUserId = null,
  open,
  onClose,
  embedHost,
}: WidgetBuilderModalProps) {
  const [config, setConfig] = useState<WidgetConfig | null>(null)
  const [slug, setSlug] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [tab, setTab] = useState<BuilderTab>('general')
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [imageFieldMenuHost, setImageFieldMenuHost] = useState<HTMLDivElement | null>(null)
  const previewRef = useRef<HTMLIFrameElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** Bumps on each Home update; if a save completes after newer edits, we keep `prev.widget_home_config`. */
  const homeConfigEditGen = useRef(0)
  const newsConfigEditGen = useRef(0)

  const loadConfig = useCallback(async () => {
    try {
      const res = await backendGet<EndpointResponse>(`/api/agents/${agent.agent_key}/widget`)
      if (res.widget) {
        setConfig({
          ...res.widget,
          widget_home_config: res.widget.widget_home_config ?? DEFAULT_HOME,
          widget_help_articles: res.widget.widget_help_articles ?? [],
          widget_help_collections: res.widget.widget_help_collections ?? [],
          widget_news_items: res.widget.widget_news_items ?? [],
        })
      } else {
        setConfig({ ...DEFAULT_WIDGET_CONFIG })
      }
      setSlug(res.public_agent_slug ?? null)
    } catch {
      setConfig({ ...DEFAULT_WIDGET_CONFIG })
      setSlug(null)
    } finally {
      setIsLoading(false)
    }
  }, [agent.agent_key])

  useLayoutEffect(() => {
    if (open) {
      setConfig(null)
      setIsLoading(true)
    } else {
      setConfig(null)
      setIsLoading(false)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    void loadConfig()
  }, [open, loadConfig])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    fetchCampaigns()
      .then((items) => {
        if (!cancelled) setCampaigns(items)
      })
      .catch(() => {
        if (!cancelled) setCampaigns([])
      })
    return () => {
      cancelled = true
    }
  }, [open])

  const patchWidget = useCallback(
    async (body: Record<string, unknown>) => {
      const homeGenAtSend = body.home_config !== undefined ? homeConfigEditGen.current : null
      const newsGenAtSend = body.news_items !== undefined ? newsConfigEditGen.current : null
      setSaving(true)
      try {
        const res = await backendPatch<EndpointResponse>(
          `/api/agents/${agent.agent_key}/widget`,
          body,
        )
        if (res.widget) {
          const fromApi = res.widget
          setConfig((prev) => {
            const w = {
              ...fromApi,
              widget_home_config: fromApi.widget_home_config ?? DEFAULT_HOME,
              widget_help_articles: fromApi.widget_help_articles ?? [],
              widget_help_collections: fromApi.widget_help_collections ?? [],
              widget_news_items: fromApi.widget_news_items ?? [],
            }
            if (homeGenAtSend !== null && prev && homeConfigEditGen.current !== homeGenAtSend) {
              w.widget_home_config = prev.widget_home_config
            }
            if (newsGenAtSend !== null && prev && newsConfigEditGen.current !== newsGenAtSend) {
              w.widget_news_items = prev.widget_news_items
            }
            return w
          })
        } else {
          setConfig((prev) => prev ?? { ...DEFAULT_WIDGET_CONFIG })
        }
        if (res.public_agent_slug) setSlug(res.public_agent_slug)
      } finally {
        setSaving(false)
      }
    },
    [agent.agent_key],
  )

  const debouncedPatch = useCallback(
    (body: Record<string, unknown>) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => void patchWidget(body), 700)
    },
    [patchWidget],
  )

  const updateGeneral = useCallback(
    (key: string, value: unknown) => {
      setConfig((prev) => (prev ? { ...prev, [key]: value } : prev))
      const apiKey = key.replace('widget_', '').replace('_enabled', '')
      const bodyKey =
        key === 'widget_enabled'
          ? 'enabled'
          : key === 'widget_title'
            ? 'title'
            : key === 'widget_subtitle'
              ? 'subtitle'
              : key === 'widget_show_subtitle'
                ? 'show_subtitle'
                : key === 'widget_greeting'
                  ? 'greeting'
                  : key === 'widget_accent_color'
                    ? 'accent_color'
                    : key === 'widget_position'
                      ? 'position'
                      : key === 'widget_launcher_icon_url'
                        ? 'launcher_icon_url'
                        : key === 'widget_campaign_id'
                          ? 'campaign_id'
                          : apiKey
      if (key === 'widget_allowed_origins' || key === 'widget_campaign_id') {
        void patchWidget({ [bodyKey]: value })
        return
      }
      debouncedPatch({ [bodyKey]: value })
    },
    [debouncedPatch, patchWidget],
  )

  const updateHome = useCallback(
    (homeConfig: HomeConfig) => {
      homeConfigEditGen.current += 1
      setConfig((prev) => (prev ? { ...prev, widget_home_config: homeConfig } : prev))
      debouncedPatch({ home_config: homeConfig })
    },
    [debouncedPatch],
  )

  const updateNews = useCallback(
    (items: NewsItem[]) => {
      newsConfigEditGen.current += 1
      setConfig((prev) => (prev ? { ...prev, widget_news_items: items } : prev))
      debouncedPatch({ news_items: items })
    },
    [debouncedPatch],
  )

  const postPreviewConfigToIframe = useCallback(() => {
    const win = previewRef.current?.contentWindow
    if (!win || !config) return
    const cfg = buildPreviewConfig()
    if (!cfg) return
    win.postMessage({ source: 'vibey-widget-parent', type: 'config-update', config: cfg }, '*')
  }, [config, slug, agent])

  useEffect(() => {
    postPreviewConfigToIframe()
  }, [postPreviewConfigToIframe])

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const d = e.data as { source?: string; type?: string } | null
      if (!d || d.source !== 'vibey-widget' || d.type !== 'ready') return
      postPreviewConfigToIframe()
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [postPreviewConfigToIframe])

  const snippet = useMemo(() => {
    if (!slug) return null
    const host =
      embedHost || (typeof window !== 'undefined' ? window.location.origin : resolveAppUrl())
    return `<script src="${host}/widget.js" data-slug="${slug}" data-agent="${agent.agent_key}" async></script>`
  }, [agent.agent_key, embedHost, slug])

  const devTestUrl = useMemo(() => {
    if (typeof window === 'undefined') return null
    if (window.location.hostname !== 'localhost') return null
    if (!slug) return null
    const token = config?.public_page_token
    if (!token) return null
    const params = new URLSearchParams({
      slug,
      agent: agent.agent_key,
      token,
    })
    return `${window.location.origin}/widget-test.html?${params.toString()}`
  }, [agent.agent_key, slug, config?.public_page_token])

  const handleCopy = useCallback(() => {
    if (!snippet) return
    navigator.clipboard.writeText(snippet)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [snippet])

  function buildPreviewConfig() {
    if (!config) return null
    const headerImage = config.widget_header_image_url?.trim() || agent.image_url || null
    return {
      name: agent.name,
      role: agent.role || '',
      imageUrl: headerImage,
      title: config.widget_title || agent.name,
      subtitle:
        config.widget_show_subtitle !== false ? config.widget_subtitle || agent.role || null : null,
      greeting: config.widget_greeting,
      accentColor: config.widget_accent_color || '#7C3AED',
      launcherIconUrl: config.widget_launcher_icon_url,
      position: config.widget_position,
      allowedOrigins: config.widget_allowed_origins,
      userSlug: slug,
      agentKey: agent.agent_key,
      homeConfig: config.widget_home_config,
      newsItems: config.widget_news_items,
    }
  }

  /** Stable URL only — dynamic copy/theme updates go through `postMessage` so the iframe does not reload on every keystroke. */
  const previewUrl = useMemo(() => {
    if (!slug) return null
    const host = typeof window !== 'undefined' ? window.location.origin : resolveAppUrl()
    const params = new URLSearchParams({
      embed: '1',
      preview: '1',
      _uid: agent.user_id || viewerUserId || '',
      _name: agent.name,
      _role: agent.role || '',
      _slug: slug,
      _image: agent.image_url || '',
    })
    return `${host}/a/${agent.agent_key}?${params.toString()}`
  }, [slug, agent.agent_key, agent.user_id, agent.name, agent.role, agent.image_url, viewerUserId])

  if (!open) return null

  const home = config?.widget_home_config ?? DEFAULT_HOME

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(openState) => {
        if (!openState) onClose()
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="z-modal-backdrop fixed inset-0" />
        <DialogPrimitive.Content
          className="z-modal-layer-3 sm:p-spacing-4 md:p-spacing-6 fixed inset-0 flex items-center justify-center overflow-hidden p-2"
          onPointerDownOutside={(e) => {
            const t = e.target as HTMLElement
            if (t.closest('[data-widget-modal-portal]')) e.preventDefault()
            if (t.tagName === 'IFRAME') e.preventDefault()
          }}
          onInteractOutside={(e) => {
            const t = e.target as HTMLElement
            if (t.closest('[data-widget-modal-portal]')) e.preventDefault()
            if (t.tagName === 'IFRAME') e.preventDefault()
          }}
        >
          <div
            ref={setImageFieldMenuHost}
            data-widget-modal-portal
            className="pointer-events-none absolute left-0 top-0 z-[100003] size-0 overflow-visible"
            aria-hidden
          />
          <WidgetBuilderImageFieldMenuPortalContext.Provider value={imageFieldMenuHost}>
            <VisuallyHidden.Root>
              <DialogPrimitive.Title>Widget Builder</DialogPrimitive.Title>
            </VisuallyHidden.Root>

            {isLoading || !config ? (
              <div className="flex items-start justify-center gap-1.5 sm:gap-2">
                <div className="surface-card card-elevated rounded-spacing-4 wizard-container-border border-border bg-card px-spacing-8 flex min-h-[32vh] w-[min(96vw,800px)] min-w-[min(100%,320px)] max-w-[800px] items-center justify-center border shadow-2xl">
                  <VibeyLoadingOrb text="Loading widget settings…" state="processing" size="lg" />
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-icon-bare z-20 mt-0.5 shrink-0"
                  aria-label="Close"
                >
                  <X className="icon-xs" />
                </button>
              </div>
            ) : (
              <div className="flex items-start justify-center gap-1.5 sm:gap-2">
                <div className="relative h-full w-[min(96vw,800px)] max-w-[800px] sm:h-[min(78vh,640px)] sm:max-h-[78vh]">
                  <div className="surface-card card-elevated rounded-spacing-4 wizard-container-border border-border relative flex h-full max-h-full min-h-0 w-full flex-row overflow-hidden border bg-[var(--color-card)] shadow-2xl">
                    <div className="flex min-h-0 min-w-0 basis-[48%] flex-col">
                      <div className="pt-spacing-4 shrink-0 px-3 sm:px-4">
                        <div className="flex items-start justify-between gap-2 pr-1">
                          <h2 className="title-h6 text-foreground min-w-0">Widget Builder</h2>
                          {saving && (
                            <span
                              className="typo-caption text-muted-foreground mt-0.5 shrink-0 whitespace-nowrap"
                              aria-live="polite"
                            >
                              Saving…
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Spaces / Team detail strip — matches TeamViewTabs + ViewSwitcher */}
                      <div className="border-border mt-spacing-3 flex min-w-0 shrink-0 items-center gap-1 border-b border-[var(--border)] px-3 sm:px-4">
                        <div className="scrollbar-thin flex min-h-0 min-w-0 flex-1 items-center gap-1 overflow-x-auto overflow-y-hidden overscroll-x-contain">
                          {WIDGET_BUILDER_TABS.map((id) => {
                            const meta = WIDGET_BUILDER_TAB_META[id]
                            const isActive = tab === id
                            return (
                              <button
                                key={id}
                                type="button"
                                onClick={() => setTab(id)}
                                className={cn(
                                  'relative flex min-w-0 shrink-0 items-center gap-1.5 rounded-md px-2 py-2 text-xs font-medium transition-colors hover:bg-[var(--color-hover-subtle)]',
                                  isActive
                                    ? 'text-[var(--foreground)]'
                                    : 'text-[var(--color-muted-foreground)] hover:text-[var(--foreground)]',
                                )}
                                aria-pressed={isActive}
                                aria-label={meta.label}
                              >
                                <LucideIcon name={meta.icon} className="h-3.5 w-3.5 shrink-0" />
                                <span className="max-w-[140px] truncate">{meta.label}</span>
                                {isActive ? (
                                  <span
                                    aria-hidden
                                    className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-[var(--foreground)]"
                                  />
                                ) : null}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
                        {tab === 'general' && (
                          <GeneralTab
                            config={config}
                            campaigns={campaigns}
                            onUpdate={updateGeneral}
                          />
                        )}
                        {tab === 'home' && (
                          <HomeTab
                            home={home}
                            newsItems={config.widget_news_items}
                            onUpdate={updateHome}
                          />
                        )}
                        {tab === 'news' && (
                          <NewsTab items={config.widget_news_items} onUpdate={updateNews} />
                        )}
                      </div>

                      {snippet && (
                        <div className="shrink-0 px-3 py-3 sm:py-3.5">
                          <div className="mb-1.5 flex items-center gap-2">
                            <Code className="h-4 w-4 text-muted-foreground" />
                            <p className="body-4 text-muted-foreground">Install snippet</p>
                          </div>
                          <div className="group relative">
                            <pre className="body-4 max-h-28 overflow-x-auto overflow-y-auto rounded-lg border border-border bg-black/40 p-3 pr-10 text-white/90">
                              {snippet}
                            </pre>
                            <button
                              type="button"
                              onClick={handleCopy}
                              title="Copy snippet"
                              aria-label="Copy snippet"
                              className={cn(
                                'absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-md border border-border bg-black/70 text-white/70 transition-opacity hover:bg-white/10 hover:text-white',
                                copied
                                  ? 'opacity-100'
                                  : 'opacity-0 group-focus-within:opacity-100 group-hover:opacity-100',
                              )}
                            >
                              {copied ? (
                                <Check className="h-4 w-4 text-green-400" aria-hidden />
                              ) : (
                                <Copy className="h-4 w-4" aria-hidden />
                              )}
                            </button>
                          </div>
                          {devTestUrl ? (
                            <a
                              href={devTestUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 inline-flex items-center gap-1 text-[11px] text-white/45 transition-colors hover:text-white/80"
                            >
                              Open dev test page →
                            </a>
                          ) : null}
                        </div>
                      )}
                    </div>

                    <div className="bg-muted/30 flex h-full min-h-0 w-full min-w-0 basis-[52%] flex-col px-1.5 py-1.5 sm:px-2 sm:py-2">
                      <div className="border-border rounded-spacing-4 relative min-h-0 w-full max-w-[min(100%,360px)] flex-1 self-center overflow-hidden border bg-[var(--color-card)] shadow-lg">
                        {previewUrl ? (
                          <iframe
                            ref={previewRef}
                            src={previewUrl}
                            onLoad={() => postPreviewConfigToIframe()}
                            className="h-full min-h-0 w-full border-0"
                            title="Widget preview"
                          />
                        ) : (
                          <div className="body-3 text-muted-foreground flex h-full items-center justify-center">
                            Setting up preview...
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-icon-bare z-20 mt-0.5 shrink-0"
                  aria-label="Close"
                >
                  <X className="icon-xs" />
                </button>
              </div>
            )}
          </WidgetBuilderImageFieldMenuPortalContext.Provider>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function InputField({
  label,
  value,
  placeholder,
  onChange,
  type = 'text',
}: {
  label: string
  value: string
  placeholder?: string
  onChange: (v: string) => void
  type?: string
}) {
  return (
    <div>
      <p className="body-4 mb-1 text-muted-foreground">{label}</p>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="body-3 w-full rounded-lg border border-border bg-surface-subtle px-3 py-2 text-foreground outline-none placeholder:text-white/30 focus:border-white/20"
      />
    </div>
  )
}

const LINK_SCHEME = /^(https?:|mailto:|tel:)/i

function normalizeAndValidateLinkUrl(
  raw: string,
): { ok: true; value: string | undefined } | { ok: false; message: string } {
  const t = raw.trim()
  if (!t) return { ok: true, value: undefined }
  let s = t
  if (s.startsWith('//')) {
    s = `https:${s}`
  } else if (!LINK_SCHEME.test(s) && /^[^\s@]+@[^@\s.]+\.[^@\s]+$/i.test(s)) {
    s = `mailto:${s}`
  } else if (!LINK_SCHEME.test(s)) {
    const rest = s.replace(/^\/+/, '')
    if (rest.startsWith('localhost') || /^(127\.\d+\.\d+\.\d+|0\.0\.0\.0)(:\d+)?/.test(rest)) {
      s = `http://${rest}`
    } else {
      s = `https://${rest}`
    }
  }
  try {
    const u = new URL(s)
    if (u.protocol === 'http:' || u.protocol === 'https:') {
      if (!u.host) return { ok: false, message: 'Enter a full link' }
      return { ok: true, value: u.href }
    }
    if (u.protocol === 'mailto:') {
      return { ok: true, value: u.href }
    }
    if (u.protocol === 'tel:') {
      if (!u.href.replace(/^tel:/i, '').trim()) {
        return { ok: false, message: 'Enter a valid phone' }
      }
      return { ok: true, value: u.href }
    }
    return { ok: false, message: 'Use http(s), mailto, or tel' }
  } catch {
    return { ok: false, message: 'Enter a valid link' }
  }
}

function LinkUrlField({
  label,
  value,
  onChange,
  placeholder = 'https://… or mysite.com',
}: {
  label: string
  value: string
  placeholder?: string
  onChange: (v: string | undefined) => void
}) {
  const [error, setError] = useState<string | null>(null)

  return (
    <div>
      <p className="body-4 mb-1 text-muted-foreground">{label}</p>
      <input
        type="text"
        inputMode="url"
        autoComplete="url"
        value={value}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        onChange={(e) => {
          setError(null)
          onChange(e.target.value)
        }}
        onBlur={() => {
          const r = normalizeAndValidateLinkUrl(value)
          if (r.ok) {
            setError(null)
            if (r.value === undefined) onChange(undefined)
            else onChange(r.value)
          } else {
            setError(r.message)
          }
        }}
        className={
          'body-3 w-full rounded-lg border bg-surface-subtle px-3 py-2 text-foreground outline-none placeholder:text-white/30 ' +
          (error
            ? 'border-red-400/50 focus:border-red-400/60'
            : 'border-border focus:border-white/20')
        }
      />
      {error ? <p className="body-4 mt-1 text-red-400/80">{error}</p> : null}
    </div>
  )
}

function WidgetAccentColorRow({
  value,
  onChange,
}: {
  value: string | null | undefined
  onChange: (hex: string) => void
}) {
  const effective = (value && value.trim()) || '#7C3AED'
  const displayHex = presetToHex(effective)
  const [popover, setPopover] = useState<{ top: number; left: number } | null>(null)
  const [fullPanel, setFullPanel] = useState<{ top: number; left: number } | null>(null)
  const [panelValue, setPanelValue] = useState(() => initialTagPanelValueFromOption(effective))
  const menuPortal = useContext(WidgetBuilderImageFieldMenuPortalContext)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverPortalRef = useRef<HTMLDivElement>(null)
  const colorMenuRef = useRef<HTMLDivElement>(null)
  const fullRef = useRef<HTMLDivElement>(null)
  const portalTarget = menuPortal ?? (typeof document !== 'undefined' ? document.body : null)

  const openPopover = useCallback(() => {
    const r = triggerRef.current?.getBoundingClientRect()
    if (!r || typeof window === 'undefined') return
    const left = Math.min(r.left, window.innerWidth - 228 - 8)
    setPopover({ top: r.bottom + 4, left: Math.max(8, left) })
  }, [])

  useEffect(() => {
    if (!popover && !fullPanel) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (fullPanel) setFullPanel(null)
      else setPopover(null)
    }
    const isInsidePickers = (t: EventTarget | null) => {
      if (!(t instanceof Node)) return false
      if (triggerRef.current?.contains(t)) return true
      if (popoverPortalRef.current?.contains(t)) return true
      if (colorMenuRef.current?.contains(t)) return true
      if (fullRef.current?.contains(t)) return true
      return false
    }
    const onDown = (e: MouseEvent) => {
      if (isInsidePickers(e.target)) return
      setFullPanel(null)
      setPopover(null)
    }
    document.addEventListener('keydown', onKey)
    // Bubble phase (not capture): capture was firing before swatch mousedown, unmounting the popover and canceling click.
    setTimeout(() => document.addEventListener('mousedown', onDown), 0)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
    }
  }, [popover, fullPanel])

  const applyColor = useCallback(
    (raw: string) => {
      const v = raw.startsWith('#') || raw.startsWith('linear-gradient') ? raw : presetToHex(raw)
      onChange(v)
      setPopover(null)
    },
    [onChange],
  )

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        title="Choose accent color"
        aria-expanded={Boolean(popover)}
        onClick={() => {
          if (popover) {
            setPopover(null)
            setFullPanel(null)
            return
          }
          openPopover()
        }}
        className="group relative h-9 w-9 shrink-0 overflow-hidden rounded-md border border-white/15 ring-offset-2 ring-offset-neutral-950 transition-[box-shadow] hover:ring-2 hover:ring-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
      >
        <span
          className="absolute inset-0 rounded-md"
          style={swatchVisualStyle(displayHex)}
          aria-hidden
        />
        <span
          className="pointer-events-none absolute inset-0 rounded-md bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100"
          aria-hidden
        />
      </button>
      {popover &&
        portalTarget &&
        createPortal(
          <div ref={popoverPortalRef} data-widget-modal-portal className="pointer-events-auto">
            <ColorPickerPopover
              ref={colorMenuRef}
              top={popover.top}
              left={popover.left}
              customSwatches={[]}
              onSelect={(c) => applyColor(c)}
              onOpenFullPicker={() => {
                setPanelValue(initialTagPanelValueFromOption(effective))
                const menu = colorMenuRef.current
                if (menu)
                  setFullPanel(positionTagFullPickerNextToPresets(menu.getBoundingClientRect()))
              }}
            />
          </div>,
          portalTarget,
        )}
      {fullPanel &&
        portalTarget &&
        createPortal(
          <div
            ref={fullRef}
            data-widget-modal-portal
            className="pointer-events-auto fixed z-[100001]"
            style={{ top: fullPanel.top, left: fullPanel.left }}
          >
            <ColorPickerPanelStandalone
              value={panelValue}
              onChange={(v) => {
                setPanelValue(v)
                onChange(v)
              }}
              allowGradient
            />
          </div>,
          portalTarget,
        )}
    </>
  )
}

function GeneralTab({
  config,
  campaigns,
  onUpdate,
}: {
  config: WidgetConfig
  campaigns: Campaign[]
  onUpdate: (key: string, value: unknown) => void
}) {
  return (
    <div className="space-y-4">
      <CampaignDestinationField
        value={config.widget_campaign_id}
        campaigns={campaigns}
        onChange={(campaignId) => onUpdate('widget_campaign_id', campaignId)}
      />

      <InputField
        label="Header title"
        value={config.widget_title ?? ''}
        placeholder="Agent name"
        onChange={(v) => onUpdate('widget_title', v || null)}
      />

      <div>
        <div className="flex items-center justify-between gap-3 text-left">
          <p className="body-4 text-muted-foreground">Show role / subtitle</p>
          <Switch
            checked={config.widget_show_subtitle !== false}
            onCheckedChange={(c) => onUpdate('widget_show_subtitle', c)}
          />
        </div>
        {config.widget_show_subtitle !== false ? (
          <div className="mt-2">
            <InputField
              label="Subtitle"
              value={config.widget_subtitle ?? ''}
              placeholder="Support"
              onChange={(v) => onUpdate('widget_subtitle', v || null)}
            />
          </div>
        ) : null}
      </div>

      <InputField
        label="Greeting message"
        value={config.widget_greeting ?? ''}
        placeholder="Hey! How can I help?"
        onChange={(v) => onUpdate('widget_greeting', v || null)}
      />

      <WidgetBuilderImageField
        variant="logo"
        label="Logo (optional)"
        hint="Shown in the widget header and above the Home hero."
        value={config.widget_header_image_url}
        onChange={(u) => onUpdate('widget_header_image_url', u)}
      />

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 text-left">
          <p className="body-4 shrink-0 text-muted-foreground">Accent color</p>
          <WidgetAccentColorRow
            value={config.widget_accent_color}
            onChange={(hex) => onUpdate('widget_accent_color', hex)}
          />
        </div>
        <div className="flex items-center justify-between gap-3 text-left">
          <div className="flex items-center gap-1.5">
            <p className="body-4 shrink-0 text-muted-foreground">Position</p>
            <Tooltip
              label="Which corner of the screen the widget appears in"
              side="top"
              delayMs={300}
            >
              <button
                type="button"
                className="text-white/30 transition-colors hover:text-white/60"
                aria-label="About widget position"
              >
                <Info className="h-3.5 w-3.5" aria-hidden />
              </button>
            </Tooltip>
          </div>
          <button
            type="button"
            onClick={() =>
              onUpdate(
                'widget_position',
                config.widget_position === 'bottom-left' ? 'bottom-right' : 'bottom-left',
              )
            }
            className="body-3 min-w-[4.5rem] shrink-0 rounded-lg border border-border bg-surface-subtle px-3 py-2 text-foreground transition-colors hover:border-white/20 hover:bg-white/[0.06]"
          >
            {config.widget_position === 'bottom-left' ? 'Left' : 'Right'}
          </button>
        </div>
      </div>

      <AllowedOriginsField
        value={config.widget_allowed_origins}
        onChange={(next) => onUpdate('widget_allowed_origins', next)}
      />
    </div>
  )
}

function AllowedOriginsField({
  value,
  onChange,
}: {
  value: string[]
  onChange: (next: string[]) => void
}) {
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)

  const normalize = (raw: string): string | null => {
    const trimmed = raw.trim().replace(/\/$/, '')
    if (!trimmed) return null
    const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    try {
      const url = new URL(candidate)
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
      return `${url.protocol}//${url.host}`
    } catch {
      return null
    }
  }

  const addEntry = () => {
    const wildcard = draft.trim().toLowerCase().startsWith('*.')
    const normalized = wildcard ? draft.trim().toLowerCase().replace(/\/$/, '') : normalize(draft)
    if (!normalized) {
      setError('Enter a valid origin (e.g. https://example.com or *.example.com)')
      return
    }
    if (value.includes(normalized)) {
      setError('Already in the list')
      return
    }
    onChange([...value, normalized])
    setDraft('')
    setError(null)
  }

  const removeEntry = (entry: string) => {
    onChange(value.filter((e) => e !== entry))
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <p className="body-4 text-muted-foreground">Allowed websites</p>
        <Tooltip
          wide
          label="Only these origins can load the widget. Empty list blocks every site. Wildcards allowed (e.g. *.example.com)."
          side="top"
          delayMs={300}
        >
          <button
            type="button"
            className="text-white/30 transition-colors hover:text-white/60"
            aria-label="About allowed websites"
          >
            <Info className="h-3.5 w-3.5" aria-hidden />
          </button>
        </Tooltip>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          placeholder="https://yourdomain.com"
          onChange={(e) => {
            setDraft(e.target.value)
            if (error) setError(null)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addEntry()
            }
          }}
          className="body-3 flex-1 rounded-lg border border-border bg-surface-subtle px-3 py-2 text-foreground outline-none placeholder:text-white/30 focus:border-white/20"
        />
        <button
          type="button"
          onClick={addEntry}
          disabled={!draft.trim()}
          className="body-3 shrink-0 rounded-lg border border-border bg-surface-subtle px-3 py-2 text-foreground transition-colors hover:border-white/20 hover:bg-white/[0.06] disabled:opacity-40 disabled:hover:border-border disabled:hover:bg-white/[0.03]"
        >
          Add
        </button>
      </div>

      {error && <p className="body-4 text-red-400/80">{error}</p>}

      {value.length === 0 ? (
        <p className="body-4 text-amber-400/70">
          No websites allowed yet — the widget is blocked everywhere until you add one.
        </p>
      ) : (
        <ul className="space-y-1">
          {value.map((entry) => (
            <li
              key={entry}
              className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface-subtle px-3 py-1.5"
            >
              <span className="body-3 truncate text-muted-foreground">{entry}</span>
              <button
                type="button"
                onClick={() => removeEntry(entry)}
                className="shrink-0 text-red-400/60 transition-colors hover:text-red-400"
                aria-label={`Remove ${entry}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function HomeTab({
  home,
  newsItems,
  onUpdate,
}: {
  home: HomeConfig
  newsItems: NewsItem[]
  onUpdate: (h: HomeConfig) => void
}) {
  const cards = home.ctaCards ?? []
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const toggleCollapse = (id: string) => setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }))

  const addCard = () => {
    onUpdate({
      ...home,
      ctaCards: [...cards, { id: crypto.randomUUID(), title: '', body: '' }],
    })
  }

  const syncFromNews = () => {
    const newCards: CtaCard[] = newsItems.map((item) => ({
      id: crypto.randomUUID(),
      title: item.title,
      body: item.body,
      imageUrl: item.imageUrl,
      linkUrl: item.linkUrl,
    }))
    onUpdate({ ...home, ctaCards: [...cards, ...newCards] })
  }

  const removeCard = (id: string) => {
    onUpdate({ ...home, ctaCards: cards.filter((c) => c.id !== id) })
  }

  const updateCard = (id: string, patch: Partial<CtaCard>) => {
    onUpdate({
      ...home,
      ctaCards: cards.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="body-4 mb-1 text-muted-foreground">Hero text</p>
        <textarea
          rows={3}
          value={home.heroText ?? ''}
          onChange={(e) => onUpdate({ ...home, heroText: e.target.value })}
          placeholder="Hello there.&#10;How can we help?"
          className="body-3 w-full resize-none rounded-lg border border-border bg-surface-subtle px-3 py-2 text-foreground outline-none placeholder:text-white/30 focus:border-white/20"
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="body-4 text-muted-foreground">Show recent message card</p>
        <Switch
          checked={home.showRecentMessage !== false}
          onCheckedChange={(c) => onUpdate({ ...home, showRecentMessage: c })}
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="body-4 text-muted-foreground">CTA Cards</p>
          <div className="flex items-center gap-1">
            <Tooltip label="Sync from Updates" side="top" delayMs={300}>
              <button
                type="button"
                onClick={syncFromNews}
                disabled={newsItems.length === 0}
                className="flex items-center justify-center rounded-lg p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-white/50"
                aria-label="Sync from Updates"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              </button>
            </Tooltip>
            <Tooltip label="Add card" side="top" delayMs={300}>
              <button
                type="button"
                onClick={addCard}
                className="flex items-center justify-center rounded-lg p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Add card"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden />
              </button>
            </Tooltip>
          </div>
        </div>
        <div className="space-y-3">
          {cards.map((card) => {
            const isCollapsed = collapsed[card.id] ?? true
            return (
              <div key={card.id} className="rounded-xl border border-border bg-surface-subtle p-3">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => toggleCollapse(card.id)}
                    className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    )}
                    <p className="truncate text-xs font-medium text-muted-foreground">
                      {card.title || 'Card'}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeCard(card.id)}
                    className="shrink-0 text-red-400/60 transition-colors hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                {!isCollapsed && (
                  <div className="mt-2 space-y-2">
                    <InputField
                      label="Title"
                      value={card.title}
                      onChange={(v) => updateCard(card.id, { title: v })}
                    />
                    <div>
                      <p className="body-4 mb-1 text-muted-foreground">Body</p>
                      <textarea
                        rows={3}
                        value={card.body}
                        onChange={(e) => updateCard(card.id, { body: e.target.value })}
                        placeholder="Card description…"
                        className="body-3 w-full resize-none rounded-lg border border-border bg-surface-subtle px-3 py-2 text-foreground outline-none placeholder:text-white/30 focus:border-white/20"
                      />
                    </div>
                    <WidgetBuilderImageField
                      variant="logo"
                      label="Image (optional)"
                      hint="Card thumbnail on Home."
                      value={card.imageUrl}
                      onChange={(u) => updateCard(card.id, { imageUrl: u || undefined })}
                    />
                    <LinkUrlField
                      label="Link URL"
                      value={card.linkUrl ?? ''}
                      onChange={(v) => updateCard(card.id, { linkUrl: v || undefined })}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function NewsTab({
  items,
  onUpdate,
}: {
  items: NewsItem[]
  onUpdate: (items: NewsItem[]) => void
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const toggleCollapse = (id: string) => setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }))

  const addItem = () => {
    onUpdate([
      ...items,
      {
        id: crypto.randomUUID(),
        title: '',
        body: '',
        publishedAt: new Date().toISOString().slice(0, 10),
      },
    ])
  }

  const removeItem = (id: string) => {
    onUpdate(items.filter((i) => i.id !== id))
  }

  const updateItem = (id: string, patch: Partial<NewsItem>) => {
    onUpdate(items.map((i) => (i.id === id ? { ...i, ...patch } : i)))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="body-4 font-medium text-muted-foreground">Updates</p>
        <button
          type="button"
          onClick={addItem}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-white/50 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Plus className="h-3 w-3" /> Add
        </button>
      </div>

      <div className="space-y-3">
        {items.map((item) => {
          const isCollapsed = collapsed[item.id] ?? true
          return (
            <div key={item.id} className="rounded-xl border border-border bg-surface-subtle p-3">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => toggleCollapse(item.id)}
                  className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  )}
                  <p className="truncate text-xs font-medium text-muted-foreground">
                    {item.title || 'Update'}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="shrink-0 text-red-400/60 transition-colors hover:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              {!isCollapsed && (
                <div className="mt-2 space-y-2">
                  <InputField
                    label="Title"
                    value={item.title}
                    onChange={(v) => updateItem(item.id, { title: v })}
                  />
                  <div>
                    <p className="body-4 mb-1 text-muted-foreground">Body</p>
                    <textarea
                      rows={3}
                      value={item.body}
                      onChange={(e) => updateItem(item.id, { body: e.target.value })}
                      placeholder="What's new..."
                      className="body-3 w-full resize-none rounded-lg border border-border bg-surface-subtle px-3 py-2 text-foreground outline-none placeholder:text-white/30 focus:border-white/20"
                    />
                  </div>
                  <WidgetBuilderImageField
                    variant="logo"
                    label="Image (optional)"
                    hint="Shown on the News card."
                    value={item.imageUrl}
                    onChange={(u) => updateItem(item.id, { imageUrl: u || undefined })}
                  />
                  <LinkUrlField
                    label="Link URL"
                    value={item.linkUrl ?? ''}
                    onChange={(v) => updateItem(item.id, { linkUrl: v || undefined })}
                  />
                  <InputField
                    label="Publish date"
                    value={item.publishedAt ?? ''}
                    type="date"
                    onChange={(v) => updateItem(item.id, { publishedAt: v || undefined })}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {items.length === 0 && (
        <p className="py-4 text-center text-xs text-muted-foreground">
          No updates yet. Add one to share news with your visitors.
        </p>
      )}
    </div>
  )
}
