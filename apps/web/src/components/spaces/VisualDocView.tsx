'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, LayoutTemplate, MousePointer2, RefreshCw } from 'lucide-react'
import { HtmlMiniIframe } from '@/components/ui/HtmlMiniIframe'
import type { DocVisualStatus } from '@/lib/spaces'
import { cn } from '@/lib/utils/cn'

/** Empty-state illustration — same vocabulary as funnels / ads / IG research mockups. */
function VisualDocEmptyMockup() {
  return (
    <div aria-hidden className="relative h-48 w-80 max-w-full select-none">
      <div className="h-spacing-32 w-spacing-32 bg-muted-foreground absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-5 blur-3xl" />

      {/* Back: source doc sheet */}
      <div className="card-glass left-spacing-6 top-spacing-16 gap-spacing-2 p-spacing-2 absolute flex h-28 w-44 -rotate-6 flex-col opacity-40 shadow-lg">
        <div className="bg-secondary h-spacing-1-5 w-2/5 rounded-full" />
        <div className="space-y-spacing-1">
          <div className="bg-muted-foreground h-spacing-1 w-full rounded-full opacity-20" />
          <div className="bg-muted-foreground h-spacing-1 w-11/12 rounded-full opacity-15" />
          <div className="bg-muted-foreground h-spacing-1 w-4/5 rounded-full opacity-15" />
          <div className="bg-muted-foreground h-spacing-1 w-full rounded-full opacity-15" />
          <div className="bg-muted-foreground h-spacing-1 w-2/3 rounded-full opacity-15" />
        </div>
      </div>

      {/* Front: designed HTML page preview */}
      <div className="card-glass top-spacing-2 absolute left-1/2 flex h-44 w-56 max-w-[calc(100vw-2rem)] -translate-x-1/2 rotate-1 flex-col overflow-hidden p-0 shadow-2xl">
        <div className="h-spacing-6 gap-spacing-2 border-border bg-muted px-spacing-2 flex shrink-0 items-center border-b opacity-90">
          <div className="gap-spacing-1 flex shrink-0 items-center">
            <div className="bg-muted-foreground h-spacing-1 w-spacing-1 rounded-full opacity-20" />
            <div className="bg-muted-foreground h-spacing-1 w-spacing-1 rounded-full opacity-20" />
            <div className="bg-muted-foreground h-spacing-1 w-spacing-1 rounded-full opacity-20" />
          </div>
          <LayoutTemplate className="icon-xs text-muted-foreground shrink-0 opacity-45" />
          <div className="bg-muted-foreground h-spacing-2 min-w-0 flex-1 rounded-full opacity-15" />
        </div>
        <div className="rounded-spacing-1 bg-muted mt-spacing-2 mr-spacing-2 mb-spacing-2 ml-spacing-2 px-spacing-2 py-spacing-3 flex min-h-0 flex-1 flex-col">
          <div className="mb-spacing-2 space-y-spacing-1 w-full">
            <div className="bg-foreground h-spacing-2 w-full rounded-full opacity-15" />
            <div className="bg-foreground h-spacing-2 opacity-12 w-4/5 rounded-full" />
          </div>
          <div className="mb-spacing-3 space-y-spacing-1 w-full opacity-70">
            <div className="bg-muted-foreground h-spacing-1 w-3/4 rounded-full opacity-20" />
            <div className="bg-muted-foreground h-spacing-1 w-1/2 rounded-full opacity-15" />
          </div>
          <div className="relative mt-auto w-full">
            <div className="bg-primary h-spacing-6 rounded-spacing-1 relative w-full overflow-hidden opacity-40">
              <div className="animate-shimmer absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-foreground/20 to-transparent" />
            </div>
            <div className="bottom-spacing-1 right-spacing-2 absolute rotate-12">
              <MousePointer2 className="icon-xs text-muted-foreground opacity-70 drop-shadow-md" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function VisualDocView({
  html,
  status,
  sourceHash,
  currentDocBodyHash,
  hasDocBody,
  lastError,
  onVisualize,
  isVisualizing,
}: {
  html: string | null
  status: DocVisualStatus
  sourceHash: string | null
  currentDocBodyHash: string | null
  hasDocBody: boolean
  lastError: string | null
  onVisualize: (opts?: { prompt?: string }) => void | Promise<void>
  isVisualizing: boolean
}) {
  const [localHtml, setLocalHtml] = useState(html)
  const [prompt, setPrompt] = useState('')

  useEffect(() => setLocalHtml(html), [html])

  const outOfDate =
    !!localHtml && !!sourceHash && !!currentDocBodyHash && sourceHash !== currentDocBodyHash
  const canUsePrompt = !hasDocBody
  const showGenerating = isVisualizing || status === 'generating'

  return (
    <div className="gap-spacing-3 px-spacing-4 mx-auto flex min-h-0 w-full flex-1 flex-col">
      {(outOfDate || showGenerating || status === 'error') && (
        <div className="gap-spacing-2 flex flex-wrap items-center">
          {outOfDate && (
            <span className="badge-glass badge-glass-orange typo-caption font-medium">
              Out of sync
            </span>
          )}
          {showGenerating && (
            <span className="badge-glass badge-glass-blue typo-caption font-medium">Designing</span>
          )}
          {status === 'error' && (
            <span className="badge-glass badge-glass-red typo-caption gap-spacing-1 inline-flex items-center font-medium">
              <AlertCircle className="icon-xs" />
              {lastError ?? 'Needs another try'}
            </span>
          )}
        </div>
      )}

      {localHtml ? (
        <div className="surface-card rounded-spacing-4 border-border flex min-h-0 flex-1 flex-col overflow-hidden border">
          <HtmlMiniIframe
            html={localHtml}
            title="Visual doc"
            interactive
            className="bg-background"
          />
        </div>
      ) : (
        <div className="gap-spacing-6 px-spacing-4 py-spacing-8 flex min-h-0 flex-1 flex-col items-center justify-center text-center">
          <VisualDocEmptyMockup />
          <div className="space-y-spacing-1">
            <h3 className="title-h6 text-foreground">Create a visual doc</h3>
            <p className="body-3 text-muted-foreground max-w-md">
              I’ll turn this doc into a polished HTML page you can preview here, open in Design,
              or download — same idea as presentations, funnels, and ads.
            </p>
          </div>
          {canUsePrompt && (
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Describe what you want to visualize"
              className={cn(
                'body-3 mt-spacing-2 rounded-spacing-2 border-border bg-background p-spacing-3 text-foreground min-h-[96px] w-full max-w-lg resize-none border outline-none',
                'placeholder:text-muted-foreground focus:ring-ring focus:ring-2',
              )}
            />
          )}
          <button
            type="button"
            onClick={() => void onVisualize({ prompt: prompt.trim() })}
            disabled={showGenerating || (canUsePrompt && !prompt.trim())}
            className="badge-glass badge-glass-green body-3 rounded-spacing-2 inline-flex shrink-0 items-center gap-1 px-3 py-2 font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {showGenerating ? <RefreshCw className="h-3.5 w-3.5 shrink-0 animate-spin" /> : null}
            Visualize doc
          </button>
        </div>
      )}
    </div>
  )
}
