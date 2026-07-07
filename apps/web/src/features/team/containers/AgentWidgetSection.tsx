'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Check, Code, Copy, Info, Settings } from 'lucide-react'
import { Switch } from '@/components/ui/forms/switch'
import { Tooltip } from '@/components/ui/tooltip'
import type { MissionAgent } from '@/features/mission-control/types'
import { backendGet, backendPatch } from '@/lib/api/backend-client'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/cn'
import { WidgetBuilderModal } from './WidgetBuilderModal'

interface WidgetConfigState {
  public_page_token: string | null
  widget_enabled: boolean
  widget_title: string | null
  widget_subtitle: string | null
  widget_greeting: string | null
  widget_accent_color: string | null
  widget_launcher_icon_url: string | null
  widget_position: 'bottom-right' | 'bottom-left'
  widget_allowed_origins: string[]
  widget_campaign_id: string | null
}

interface WidgetEndpointResponse {
  ok: boolean
  widget: WidgetConfigState | null
  public_agent_slug: string | null
}

const DEFAULT_STATE: WidgetConfigState = {
  public_page_token: null,
  widget_enabled: false,
  widget_title: null,
  widget_subtitle: null,
  widget_greeting: null,
  widget_accent_color: '#7C3AED',
  widget_launcher_icon_url: null,
  widget_position: 'bottom-right',
  widget_allowed_origins: [],
  widget_campaign_id: null,
}

interface AgentWidgetSectionProps {
  agent: MissionAgent
  embedHost?: string
  /** Hide the “Website Widget” heading when the parent already shows a section title. */
  suppressTitle?: boolean
  /** Omit top margins when nested under another section (parent handles spacing). */
  omitOuterSpacing?: boolean
}

export function AgentWidgetSection({
  agent,
  embedHost,
  suppressTitle,
  omitOuterSpacing,
}: AgentWidgetSectionProps) {
  const [config, setConfig] = useState<WidgetConfigState>(DEFAULT_STATE)
  const [slug, setSlug] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [builderOpen, setBuilderOpen] = useState(false)
  const [viewerUserId, setViewerUserId] = useState<string | null>(null)

  useEffect(() => {
    void createClient()
      .auth.getUser()
      .then(({ data: { user } }) => {
        setViewerUserId(user?.id ?? null)
      })
  }, [])

  const loadConfig = useCallback(async () => {
    setLoading(true)
    try {
      const res = await backendGet<WidgetEndpointResponse>(`/api/agents/${agent.agent_key}/widget`)
      if (res.widget) {
        setConfig({
          ...DEFAULT_STATE,
          ...res.widget,
          widget_accent_color: res.widget.widget_accent_color ?? DEFAULT_STATE.widget_accent_color,
        })
      }
      setSlug(res.public_agent_slug ?? null)
    } catch (err) {
      console.error('Failed to load widget config', err)
    } finally {
      setLoading(false)
    }
  }, [agent.agent_key])

  useEffect(() => {
    void loadConfig()
  }, [loadConfig])

  const patchWidget = useCallback(
    async (patch: Partial<WidgetConfigState>) => {
      setSaving(true)
      try {
        const body: Record<string, unknown> = {}
        if (patch.widget_enabled !== undefined) body.enabled = patch.widget_enabled

        const res = await backendPatch<WidgetEndpointResponse>(
          `/api/agents/${agent.agent_key}/widget`,
          body,
        )
        if (res.widget) {
          setConfig({
            ...DEFAULT_STATE,
            ...res.widget,
            widget_accent_color:
              res.widget.widget_accent_color ?? DEFAULT_STATE.widget_accent_color,
          })
        }
        if (res.public_agent_slug) setSlug(res.public_agent_slug)
      } catch (err) {
        console.error('Failed to update widget', err)
      } finally {
        setSaving(false)
      }
    },
    [agent.agent_key],
  )

  const handleToggle = useCallback(
    (enabled: boolean) => {
      setConfig((prev) => ({ ...prev, widget_enabled: enabled }))
      void patchWidget({ widget_enabled: enabled })
      if (enabled) setBuilderOpen(true)
    },
    [patchWidget],
  )

  const snippet = useMemo(() => {
    if (!slug) return null
    const host =
      embedHost || (typeof window !== 'undefined' ? window.location.origin : 'https://app.vibey.im')
    return `<script src="${host}/widget.js" data-slug="${slug}" data-agent="${agent.agent_key}" async></script>`
  }, [agent.agent_key, embedHost, slug])

  const snippetPreRef = useRef<HTMLPreElement>(null)
  const [showSnippetRightMask, setShowSnippetRightMask] = useState(false)

  const updateSnippetScrollMask = useCallback(() => {
    const el = snippetPreRef.current
    if (!el) {
      setShowSnippetRightMask(false)
      return
    }
    const { scrollLeft, scrollWidth, clientWidth } = el
    if (scrollWidth <= clientWidth + 1) {
      setShowSnippetRightMask(false)
      return
    }
    setShowSnippetRightMask(scrollLeft < scrollWidth - clientWidth - 2)
  }, [])

  useLayoutEffect(() => {
    const id = requestAnimationFrame(() => updateSnippetScrollMask())
    return () => cancelAnimationFrame(id)
  }, [snippet, config.widget_enabled, updateSnippetScrollMask])

  useEffect(() => {
    window.addEventListener('resize', updateSnippetScrollMask)
    return () => window.removeEventListener('resize', updateSnippetScrollMask)
  }, [updateSnippetScrollMask])

  const handleCopy = useCallback(() => {
    if (!snippet) return
    navigator.clipboard.writeText(snippet)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [snippet])

  if (loading) {
    return (
      <div className={omitOuterSpacing ? undefined : 'pt-spacing-3 mt-spacing-3'}>
        <p className="body-4 text-muted-foreground/60">Loading widget...</p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-spacing-3', !omitOuterSpacing && 'pt-spacing-3 mt-spacing-3')}>
      <div>
        {!suppressTitle ? (
          <p className="body-4 text-muted-foreground/60 mb-spacing-2 uppercase tracking-wide">
            Website Widget
          </p>
        ) : null}

        <div className="gap-spacing-2 sm:gap-spacing-4 relative flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1.5 sm:pt-1.5">
            <p className="body-4 text-muted-foreground/70">Embed chat on your website</p>
            <Tooltip
              wide
              label="A drop-in chat bubble on your site that talks to this agent."
              side="top"
              delayMs={300}
            >
              <button
                type="button"
                className="text-muted-foreground inline-flex cursor-help"
                aria-label="About website widget"
              >
                <Info className="icon-xs shrink-0" aria-hidden />
              </button>
            </Tooltip>
          </div>
          <Switch
            checked={config.widget_enabled}
            disabled={saving}
            onCheckedChange={(val) => handleToggle(val)}
          />
        </div>

        {config.widget_enabled && (
          <div className="mt-spacing-2 flex justify-end">
            <button
              type="button"
              onClick={() => setBuilderOpen(true)}
              className="body-4 text-foreground px-spacing-2 inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-surface-subtle py-0.5 font-medium leading-none transition-colors hover:bg-white/[0.06]"
            >
              <Settings className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
              Customize
            </button>
          </div>
        )}
      </div>

      {config.widget_enabled && (
        <div className="space-y-spacing-2">
          {snippet && (
            <div>
              <div className="gap-spacing-2 mb-1 flex items-center">
                <Code className="text-muted-foreground size-4" aria-hidden />
                <p className="body-4 text-muted-foreground/70">Install snippet</p>
              </div>
              <div className="flex items-stretch gap-2">
                <div className="relative min-w-0 flex-1 overflow-hidden rounded-lg border border-border bg-black/40">
                  <pre
                    ref={snippetPreRef}
                    onScroll={updateSnippetScrollMask}
                    className="body-4 text-foreground/90 max-w-full overflow-x-auto px-3 py-1.5 [scrollbar-gutter:stable]"
                  >
                    {snippet}
                  </pre>
                  {showSnippetRightMask && (
                    <div
                      className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 sm:w-20"
                      style={{
                        background:
                          'linear-gradient(270deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.18) 38%, rgba(0,0,0,0.05) 65%, transparent 100%)',
                      }}
                      aria-hidden
                    />
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="text-muted-foreground hover:bg-hover-subtle rounded-spacing-1 hover:text-foreground flex h-full min-h-8 w-8 shrink-0 items-center justify-center self-stretch transition-colors"
                  title="Copy snippet"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="body-4 text-muted-foreground/50 mt-1">
                Paste this before <code>&lt;/body&gt;</code> on any page.
              </p>
            </div>
          )}

          {!slug && <p className="body-4 text-amber-400/80">Setting up your public slug...</p>}
        </div>
      )}

      <WidgetBuilderModal
        agent={agent}
        viewerUserId={viewerUserId}
        open={builderOpen}
        onClose={() => {
          setBuilderOpen(false)
          void loadConfig()
        }}
        embedHost={embedHost}
      />
    </div>
  )
}
