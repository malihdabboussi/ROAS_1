'use client'

import { useMemo, useState } from 'react'
import { Check, ChevronDown, ExternalLink, Globe, Loader2, X } from 'lucide-react'

export interface BrowserAction {
  id: string
  label: string
  state: 'active' | 'complete' | 'failed'
  timestamp: number
}

interface BrowserPreviewPanelProps {
  screenshots: Array<{ id: string; imageUrl: string; pageUrl?: string }>
  actions: BrowserAction[]
  isStreaming?: boolean
}

export function BrowserPreviewPanel({
  screenshots,
  actions,
  isStreaming,
}: BrowserPreviewPanelProps) {
  const [logExpanded, setLogExpanded] = useState(false)
  const [imageExpanded, setImageExpanded] = useState(false)

  const latestScreenshot = screenshots.at(-1)
  const latestAction = actions.at(-1)
  const hasActiveAction = actions.some((a) => a.state === 'active')

  const pageUrl = latestScreenshot?.pageUrl
  let domain = ''
  try {
    domain = pageUrl ? new URL(pageUrl).hostname.replace(/^www\./, '') : ''
  } catch {
    /* ignore */
  }

  const statusText = useMemo(() => {
    if (latestAction?.state === 'active') return latestAction.label
    if (latestAction) return latestAction.label
    return domain ? `Browsing ${domain}` : 'Browser session'
  }, [latestAction, domain])

  if (screenshots.length === 0 && actions.length === 0) return null

  return (
    <div className="my-spacing-2 w-full max-w-[520px] overflow-hidden">
      <div className="card-glass rounded-spacing-3 overflow-hidden">
        {latestScreenshot && (
          <button
            type="button"
            onClick={() => setImageExpanded((v) => !v)}
            className="border-border bg-muted/20 relative w-full cursor-pointer overflow-hidden border-b"
            style={{ maxHeight: imageExpanded ? 'none' : 280 }}
          >
            <img
              src={latestScreenshot.imageUrl}
              alt={domain ? `Screenshot of ${domain}` : 'Browser screenshot'}
              className="w-full object-cover object-top"
              loading="lazy"
              onError={() => {}}
            />
            {!imageExpanded && (
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-16"
                style={{
                  background: 'linear-gradient(to bottom, transparent, var(--color-card))',
                }}
              />
            )}
          </button>
        )}

        {!latestScreenshot && (
          <div className="border-border bg-muted/20 flex h-[120px] items-center justify-center border-b">
            <Loader2 className="icon-lg text-muted-foreground animate-spin" />
          </div>
        )}

        <button
          type="button"
          onClick={() => setLogExpanded((v) => !v)}
          className="gap-spacing-2 px-spacing-3 py-spacing-2 hover:bg-hover-subtle flex w-full items-center transition-colors"
        >
          {hasActiveAction || isStreaming ? (
            <Loader2 className="icon-sm text-accent shrink-0 animate-spin" />
          ) : (
            <Globe className="icon-sm text-muted-foreground shrink-0" />
          )}
          <span className="body-3 text-foreground min-w-0 truncate text-left">{statusText}</span>
          {pageUrl && (
            <a
              href={pageUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="shrink-0"
            >
              <ExternalLink className="icon-xs text-muted-foreground hover:text-accent transition-colors" />
            </a>
          )}
          {actions.length > 1 && (
            <ChevronDown
              className={`icon-xs text-muted-foreground ml-auto shrink-0 transition-transform ${logExpanded ? 'rotate-180' : ''}`}
            />
          )}
        </button>

        {logExpanded && actions.length > 0 && (
          <div className="border-border px-spacing-3 py-spacing-2 border-t">
            <div className="gap-spacing-1 flex flex-col">
              {actions.map((action) => (
                <div key={action.id} className="gap-spacing-2 flex items-center">
                  {action.state === 'active' ? (
                    <Loader2 className="icon-xs text-accent shrink-0 animate-spin" />
                  ) : action.state === 'failed' ? (
                    <X className="icon-xs text-destructive shrink-0" />
                  ) : (
                    <Check className="icon-xs text-muted-foreground shrink-0" />
                  )}
                  <span className="body-4 text-muted-foreground min-w-0 truncate">
                    {action.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
