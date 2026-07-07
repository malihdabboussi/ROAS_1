'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react'
import { fetchSkStats, type SkStats } from '../services/sk.service'
import {
  ENTRY_TYPE_COLORS,
  MEMORY_TYPE_COLORS,
} from '../types'
import type { BrainConnection } from '../types'
import { DefaultLegendSection } from './LegendPanelDefaultSection'
import { LegendPanelSourcesSection } from './LegendPanelSourcesSection'
import {
  CampaignLegendSection,
  CompanyLegendSection,
  KnowledgeLegendSection,
} from './LegendPanelScopeSections'

interface LegendPanelProps {
  memoryCounts?: Record<string, number>
  snapshotCounts?: Record<string, number>
  domainCounts?: Record<string, number>
  sourceCounts?: Record<string, number>
  memoryCount?: number
  experienceCount?: number
  snapshotCount?: number
  skEntryCount?: number
  beliefCount?: number
  perspectiveCount?: number
  connections?: BrainConnection[]
  /** When set, used instead of counting `connections` (full-brain DB totals). */
  connectionCounts?: Record<string, number>
  scopeType?:
    | 'user'
    | 'agent'
    | 'campaign'
    | 'space_knowledge'
    | 'campaign_knowledge'
    | 'customer'
    | 'company'
    | 'shared'
  isAgentBrain?: boolean
  brainId?: string | null
  /** Renders above the legend card (e.g. Cortex MAX); stacks upward from bottom-right with layout animation when legend expands/collapses. */
  leadingSlot?: ReactNode
}

type PanelView = 'legend' | 'sources'

export default function LegendPanel({
  memoryCounts,
  snapshotCounts,
  domainCounts,
  sourceCounts,
  experienceCount,
  skEntryCount,
  beliefCount,
  perspectiveCount,
  connections,
  connectionCounts: connectionCountsProp,
  scopeType = 'user',
  isAgentBrain,
  brainId,
  leadingSlot,
}: LegendPanelProps) {
  const isCampaign = scopeType === 'campaign'
  const isKnowledge = scopeType === 'space_knowledge' || scopeType === 'campaign_knowledge'
  const isCompany = scopeType === 'company'
  const connectionCounts =
    connectionCountsProp ??
    (connections ?? []).reduce<Record<string, number>>((acc, c) => {
      const key = c.relationship_type ?? 'related_to'
      acc[key] = (acc[key] ?? 0) + 1
      return acc
    }, {})
  const memoryLegendKeys = useMemo(
    () => [
      ...new Set([
        ...Object.keys(MEMORY_TYPE_COLORS).filter((key) => key !== 'snapshot'),
        ...Object.keys(memoryCounts ?? {}).filter((key) => key !== 'snapshot'),
      ]),
    ],
    [memoryCounts],
  )
  const skRenderedKeys = useMemo(
    () =>
      isAgentBrain
        ? Object.keys(memoryCounts ?? {}).filter((key) => (memoryCounts?.[key] ?? 0) > 0)
        : Object.keys(ENTRY_TYPE_COLORS).filter((key) => (memoryCounts?.[key] ?? 0) > 0),
    [isAgentBrain, memoryCounts],
  )
  const [view, setView] = useState<PanelView>('legend')
  const [collapsed, setCollapsed] = useState(false)
  const [stats, setStats] = useState<SkStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)

  const loadStats = useCallback(async () => {
    if (!brainId) return
    setStatsLoading(true)
    const data = await fetchSkStats(brainId).catch(() => null)
    setStats(data)
    setStatsLoading(false)
  }, [brainId])

  useEffect(() => {
    if (isAgentBrain && brainId && view === 'sources') void loadStats()
  }, [isAgentBrain, brainId, view, loadStats])

  const canShowSources = !!isAgentBrain
  const views: PanelView[] = canShowSources ? ['legend', 'sources'] : ['legend']
  const viewIndex = views.indexOf(view)

  const goLeft = () => {
    const prev = viewIndex - 1
    if (prev >= 0) setView(views[prev]!)
  }
  const goRight = () => {
    const next = viewIndex + 1
    if (next < views.length) setView(views[next]!)
  }

  const LEGEND_STACK_TRANSITION = { duration: 0.28, ease: [0.4, 0, 0.2, 1] as const }

  return (
    <motion.div
      layout
      transition={{ layout: LEGEND_STACK_TRANSITION }}
      className="right-spacing-4 bottom-spacing-4 gap-spacing-2 absolute z-30 flex w-[180px] flex-col"
    >
      {leadingSlot ? (
        <motion.div
          layout="position"
          transition={{ layout: LEGEND_STACK_TRANSITION }}
          className="w-full shrink-0"
        >
          {leadingSlot}
        </motion.div>
      ) : null}
      <div className="surface-card border-border w-full overflow-hidden rounded-lg border">
        {/* Header: Legend/Knowledge + chevron toggles expand/collapse; hover surface */}
        <div className="px-spacing-3 py-spacing-2 flex items-center">
          {collapsed ? (
            <button
              type="button"
              onClick={() => setCollapsed((c) => !c)}
              className="hover:bg-hover-subtle text-muted-foreground hover:text-foreground body-3 gap-spacing-2 px-spacing-2 py-spacing-1 flex w-full items-center justify-between rounded-lg font-medium transition-colors"
              aria-expanded={false}
            >
              <span className="text-foreground min-w-0 truncate">Legend</span>
              <ChevronUp className="icon-xs shrink-0" aria-hidden />
            </button>
          ) : (
            <div className="gap-spacing-1 flex w-full min-w-0 items-center">
              {canShowSources ? (
                <button
                  type="button"
                  onClick={goLeft}
                  disabled={viewIndex === 0}
                  className="text-muted-foreground hover:bg-hover-subtle hover:text-foreground p-spacing-1 shrink-0 rounded-lg transition-colors disabled:pointer-events-none disabled:opacity-20"
                  aria-label="Previous panel"
                >
                  <ChevronLeft className="icon-xs" />
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setCollapsed((c) => !c)}
                className="hover:bg-hover-subtle text-muted-foreground hover:text-foreground body-3 gap-spacing-2 px-spacing-2 py-spacing-1 flex min-w-0 flex-1 items-center justify-between rounded-lg font-medium transition-colors"
                aria-expanded
                title="Toggle legend"
              >
                <span className="text-foreground min-w-0 truncate">
                  {view === 'legend' ? 'Legend' : 'Knowledge'}
                </span>
                <ChevronDown className="icon-xs shrink-0" aria-hidden />
              </button>
              {canShowSources ? (
                <button
                  type="button"
                  onClick={goRight}
                  disabled={viewIndex === views.length - 1}
                  className="text-muted-foreground hover:bg-hover-subtle hover:text-foreground p-spacing-1 shrink-0 rounded-lg transition-colors disabled:pointer-events-none disabled:opacity-20"
                  aria-label="Next panel"
                >
                  <ChevronRight className="icon-xs" />
                </button>
              ) : null}
            </div>
          )}
        </div>

        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              key="legend-body"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden"
            >
              <div className="scrollbar-thin max-h-[min(50vh,26rem)] overflow-y-auto">
                {view === 'legend' && isKnowledge && (
                  <KnowledgeLegendSection
                    connectionCounts={connectionCounts}
                    sourceCounts={sourceCounts}
                  />
                )}

                {view === 'legend' && isCampaign && (
                  <CampaignLegendSection
                    connectionCounts={connectionCounts}
                    domainCounts={domainCounts}
                    sourceCounts={sourceCounts}
                  />
                )}

                {view === 'legend' && isCompany && (
                  <CompanyLegendSection
                    connectionCounts={connectionCounts}
                    experienceCount={experienceCount}
                    memoryCounts={memoryCounts}
                  />
                )}

                {view === 'legend' && !isCampaign && !isCompany && !isKnowledge && (
                  <DefaultLegendSection
                    beliefCount={beliefCount}
                    connectionCounts={connectionCounts}
                    experienceCount={experienceCount}
                    isAgentBrain={isAgentBrain}
                    memoryCounts={memoryCounts}
                    memoryLegendKeys={memoryLegendKeys}
                    perspectiveCount={perspectiveCount}
                    skEntryCount={skEntryCount}
                    skRenderedKeys={skRenderedKeys}
                    snapshotCounts={snapshotCounts}
                  />
                )}

                {view === 'sources' && (
                  <LegendPanelSourcesSection stats={stats} statsLoading={statsLoading} />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
