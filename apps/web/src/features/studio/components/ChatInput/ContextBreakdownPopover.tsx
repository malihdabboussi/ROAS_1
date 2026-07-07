'use client'

import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { ContextBreakdown, ContextCategorySlice } from '@vibey/context-breakdown'

const SLICE_VISUAL_BY_ID: Record<string, { dot: string; bg: string; row: string }> = {
  system: { dot: 'text-muted-foreground', bg: 'bg-muted-foreground', row: 'hover:bg-hover-subtle' },
  tools: { dot: 'text-primary', bg: 'bg-primary', row: 'hover:bg-hover-subtle' },
  skills: { dot: 'text-warning', bg: 'bg-warning', row: 'hover:bg-hover-subtle' },
  brain: { dot: 'text-success', bg: 'bg-success', row: 'hover:bg-hover-subtle' },
  integrations: { dot: 'text-warning', bg: 'bg-warning', row: 'hover:bg-hover-subtle' },
  user_team: { dot: 'text-primary', bg: 'bg-primary', row: 'hover:bg-hover-subtle' },
  artifacts_files: { dot: 'text-foreground', bg: 'bg-foreground', row: 'hover:bg-hover-subtle' },
  conversation: {
    dot: 'text-muted-foreground',
    bg: 'bg-muted-foreground',
    row: 'hover:bg-hover-subtle',
  },
  draft: { dot: 'text-destructive', bg: 'bg-destructive', row: 'hover:bg-hover-subtle' },
}

function formatTokenK(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`
  return String(n)
}

function pct(value: number, total: number): number {
  if (total <= 0) return 0
  return Math.max(0, Math.min(100, (value / total) * 100))
}

function SliceValue({
  hovered,
  tokens,
  percent,
}: {
  hovered: boolean
  tokens: number
  percent: number
}) {
  return (
    <span className="min-w-spacing-16 relative inline-flex justify-end overflow-hidden">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={hovered ? 'percent' : 'tokens'}
          initial={{ opacity: 0, y: 6, filter: 'blur(3px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -6, filter: 'blur(3px)' }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
        >
          {hovered ? `${Math.round(percent)}%` : formatTokenK(tokens)}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

function ContextStackedBar({
  slices,
  contextWindow,
  hoveredSliceId,
}: {
  slices: ContextCategorySlice[]
  contextWindow: number
  hoveredSliceId: string | null
}) {
  return (
    <div className="bg-muted flex h-2 w-full overflow-hidden rounded-full">
      {slices.map((slice) => {
        const width = pct(slice.tokens, contextWindow)
        const visual = SLICE_VISUAL_BY_ID[slice.id] ?? SLICE_VISUAL_BY_ID.conversation!
        const isDimmed = hoveredSliceId !== null && hoveredSliceId !== slice.id
        return (
          <motion.div
            key={slice.id}
            className={`${visual.bg} h-full shrink-0`}
            style={{ width: `${width}%` }}
            animate={{
              opacity: isDimmed ? 0.22 : 1,
              scaleY: hoveredSliceId === slice.id ? 1.45 : 1,
            }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          />
        )
      })}
      <div className="bg-secondary min-w-0 flex-1" />
    </div>
  )
}

export function ContextBreakdownPopover({
  breakdown,
  fallbackInputTokens,
  fallbackContextWindow,
}: {
  breakdown: ContextBreakdown | null
  fallbackInputTokens?: number
  fallbackContextWindow?: number
}) {
  const [expandedSliceId, setExpandedSliceId] = useState<string | null>(null)
  const [hoveredSliceId, setHoveredSliceId] = useState<string | null>(null)
  const slices = useMemo(
    () => (breakdown?.slices ?? []).filter((slice) => slice.tokens > 0),
    [breakdown?.slices],
  )
  const totalTokens = breakdown?.totalTokens ?? fallbackInputTokens ?? 0
  const contextWindow = breakdown?.contextWindow ?? fallbackContextWindow ?? 0
  const usedPct = pct(totalTokens, contextWindow)

  return (
    <div className="surface-card border-border rounded-spacing-4 p-spacing-3 w-full border shadow-xl">
      <div className="mb-spacing-2 gap-spacing-3 flex items-start justify-between">
        <div>
          <div className="body-2 text-foreground font-medium">Context</div>
          <div className="body-3 text-muted-foreground">
            {formatTokenK(totalTokens)} / {formatTokenK(contextWindow)} tokens
          </div>
        </div>
        <div className="body-4 text-muted-foreground">{Math.round(usedPct)}% full</div>
      </div>

      {slices.length > 0 ? (
        <>
          <ContextStackedBar
            slices={slices}
            contextWindow={contextWindow}
            hoveredSliceId={hoveredSliceId}
          />
          <div className="mt-spacing-2 space-y-spacing-1">
            {slices.map((slice) => {
              const isExpanded = expandedSliceId === slice.id
              const hasEntries = (slice.entries?.length ?? 0) > 0
              const visual = SLICE_VISUAL_BY_ID[slice.id] ?? SLICE_VISUAL_BY_ID.conversation!
              const percent = pct(slice.tokens, totalTokens)
              const isHovered = hoveredSliceId === slice.id
              return (
                <div key={slice.id} className="rounded-spacing-1">
                  <button
                    type="button"
                    className={`${visual.row} px-spacing-2 py-spacing-1 rounded-spacing-1 flex w-full items-center justify-between text-left transition-colors`}
                    onMouseEnter={() => setHoveredSliceId(slice.id)}
                    onMouseLeave={() => setHoveredSliceId(null)}
                    onFocus={() => setHoveredSliceId(slice.id)}
                    onBlur={() => setHoveredSliceId(null)}
                    onClick={() => hasEntries && setExpandedSliceId(isExpanded ? null : slice.id)}
                  >
                    <span className="gap-spacing-1 flex min-w-0 items-center">
                      <motion.span
                        className={`${visual.dot} body-2 leading-none`}
                        animate={{ scale: isHovered ? 1.25 : 1 }}
                        transition={{ duration: 0.16, ease: 'easeOut' }}
                      >
                        ●
                      </motion.span>
                      <span className="body-3 text-foreground truncate">{slice.label}</span>
                    </span>
                    <span className="body-3 text-muted-foreground shrink-0">
                      <SliceValue hovered={isHovered} tokens={slice.tokens} percent={percent} />
                    </span>
                  </button>
                  {isExpanded && hasEntries ? (
                    <div className="border-border ml-spacing-5 space-y-spacing-1 pl-spacing-2 border-l">
                      {slice.entries?.slice(0, 8).map((entry) => (
                        <div
                          key={entry.id}
                          className="body-4 text-muted-foreground gap-spacing-2 flex items-center justify-between"
                        >
                          <span className="truncate">{entry.label}</span>
                          <span className="shrink-0">{formatTokenK(entry.tokens)}</span>
                        </div>
                      ))}
                      {(slice.entries?.length ?? 0) > 8 ? (
                        <div className="body-4 text-muted-foreground">
                          +{(slice.entries?.length ?? 0) - 8} more
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        </>
      ) : (
        <div className="body-3 text-muted-foreground rounded-spacing-3 py-spacing-6 text-center">
          Context details will appear after the next message.
        </div>
      )}
    </div>
  )
}
