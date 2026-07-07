'use client'

/**
 * Marketing Brain: 1:1 shell with apps/web — ForceGraph, LegendPanel, NavControls, top toolbar chrome (static).
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useTheme } from 'next-themes'
import { ChevronDown, List, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import ForceGraph, { type ForceGraphHandle } from './brain-app/ForceGraph'
import LegendPanel from './brain-app/LegendPanel'
import { getMarketingBrainDemoGraph } from './brain-app/marketingBrainDemoGraph'
import NavControls from './brain-app/NavControls'
import type { BrainMemory } from './brain-app/types'
import { MarketingMemoryInsightMockup } from './MarketingMemoryInsightMockup'

const DEMO = getMarketingBrainDemoGraph()

export function MarketingBrainGraphMockup() {
  const { resolvedTheme } = useTheme()
  const graphAppearance = resolvedTheme === 'light' ? 'light' : 'dark'
  const graphRef = useRef<ForceGraphHandle>(null)
  const [selectedNode, setSelectedNode] = useState<BrainMemory | null>(null)
  const [searchQuery] = useState('')
  const [showLegend, setShowLegend] = useState(false)
  const [showInsight, setShowInsight] = useState(false)
  const insightTimerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (insightTimerRef.current != null) window.clearTimeout(insightTimerRef.current)
    }
  }, [])

  const filteredNodes = DEMO.nodes
  const filteredConnections = DEMO.connections

  const memoryCounts = useMemo(() => {
    const out: Record<string, number> = {}
    for (const n of filteredNodes) {
      if ((n.node_type ?? 'memory') === 'memory') {
        const t = (n.memory_type as string) || 'fact'
        out[t] = (out[t] ?? 0) + 1
      }
      if (n.node_type === 'sk_entry') {
        const t = (n.entry_type as string) || 'concept'
        out[t] = (out[t] ?? 0) + 1
      }
    }
    return out
  }, [filteredNodes])

  const snapshotCounts = useMemo(() => {
    const out: Record<string, number> = {}
    for (const n of filteredNodes) {
      if (n.node_type === 'snapshot' && n.snapshot_type) {
        const t = n.snapshot_type as string
        out[t] = (out[t] ?? 0) + 1
      }
    }
    return out
  }, [filteredNodes])

  const counts = useMemo(() => {
    const exp = filteredNodes.filter(
      (n) => n.node_type === 'experience' || n.node_type === 'sk_source',
    ).length
    const skEntry = filteredNodes.filter((n) => n.node_type === 'sk_entry').length
    return { experiences: exp, skEntries: skEntry }
  }, [filteredNodes])

  return (
    <div className="mockup-frame flex h-full min-h-[360px] w-full flex-col overflow-hidden md:min-h-[420px]">
      <div
        className={cn(
          'studio-app-preview-root relative isolate min-h-0 flex-1 overflow-hidden',
          graphAppearance === 'light' ? 'studio-app-preview-light' : 'site-mock-dark',
        )}
      >
        <div className="absolute inset-0 z-0 min-h-0">
          <ForceGraph
            ref={graphRef}
            className="h-full w-full"
            appearance={graphAppearance}
            nodes={filteredNodes}
            connections={filteredConnections}
            selectedNodeId={selectedNode?.id ?? null}
            searchQuery={searchQuery}
            onNodeClick={setSelectedNode}
            animateEntrance
            entranceStartDelayMs={500}
            entranceBatchDelayMs={58}
            onEntranceComplete={() => setShowLegend(true)}
          />
        </div>

        <div className="pointer-events-none absolute left-4 right-4 top-4 z-50 hidden items-start justify-between gap-2 md:flex">
          <div className="md:gap-spacing-2 pointer-events-none flex items-center gap-1">
            <button
              type="button"
              disabled
              className="button-glass-neutral body-3 gap-spacing-2 px-spacing-3 py-spacing-2 pointer-events-auto flex cursor-default items-center rounded-lg font-medium opacity-95"
            >
              <span className="gap-spacing-2 text-foreground flex items-center">
                Your Brain
                <ChevronDown className="icon-xs text-muted-foreground" />
              </span>
            </button>
            <button
              type="button"
              disabled
              className="button-glass-neutral body-3 gap-spacing-2 px-spacing-3 py-spacing-2 pointer-events-auto flex cursor-default items-center rounded-lg font-medium opacity-95"
            >
              <span className="gap-spacing-2 text-foreground flex items-center">
                All
                <ChevronDown className="icon-xs text-muted-foreground" />
              </span>
            </button>
            <button
              type="button"
              disabled
              className="button-glass-neutral body-3 px-spacing-3 py-spacing-2 pointer-events-auto flex cursor-default items-center gap-2 rounded-lg font-medium opacity-95"
            >
              <Search className="icon-sm text-muted-foreground" />
              <span className="text-foreground">Search</span>
            </button>
            <button
              type="button"
              disabled
              className="button-glass-neutral body-3 px-spacing-3 py-spacing-2 pointer-events-auto flex cursor-default items-center gap-2 rounded-lg font-medium opacity-95"
            >
              <List className="icon-sm text-muted-foreground" />
              <span className="text-foreground">Memories</span>
            </button>
          </div>
        </div>

        {showInsight && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="pointer-events-none absolute right-1.5 top-1.5 z-50 w-[9rem] max-w-[40%] sm:right-2 sm:top-2 sm:w-[10.5rem] sm:max-w-[44%] md:right-4 md:top-4 md:w-80 md:max-w-[min(20rem,92%)]"
          >
            <MarketingMemoryInsightMockup variant={graphAppearance} />
          </motion.div>
        )}

        <NavControls
          onCenter={() => graphRef.current?.center()}
          onOrganize={() => graphRef.current?.organize()}
        />

        {selectedNode && (
          <div className="border-border bg-[var(--color-card)]/95 md:px-spacing-3 md:py-spacing-2 pointer-events-none absolute bottom-3 left-1/2 z-30 max-w-[min(88%,300px)] -translate-x-1/2 rounded-lg border px-2 py-1.5 shadow-lg backdrop-blur-sm md:bottom-4 md:max-w-[min(92%,360px)]">
            <p className="md:body-3 line-clamp-2 text-[10px] font-medium leading-snug text-[var(--color-foreground)] md:leading-normal">
              {selectedNode.content || selectedNode.name || 'Memory'}
            </p>
          </div>
        )}

        {showLegend && (
          <div className="pointer-events-none absolute bottom-1.5 left-1.5 z-50 sm:bottom-2 sm:left-2 md:bottom-4 md:left-4">
            <div className="pointer-events-none origin-bottom-left scale-[0.48] sm:scale-[0.65] md:scale-100 max-md:[&_.body-3]:!text-[9px] max-md:[&_.body-3]:!leading-snug max-md:[&_.typo-caption]:!text-[8px] max-md:[&_.typo-caption]:!leading-snug">
              <div className="pointer-events-auto">
                <LegendPanel
                  embed
                  memoryCounts={memoryCounts}
                  snapshotCounts={snapshotCounts}
                  experienceCount={counts.experiences}
                  skEntryCount={counts.skEntries}
                  connections={filteredConnections}
                  isAgentBrain={false}
                  showSnapshots={false}
                  showSkKnowledge={false}
                  animate
                  fadeIn
                  numberRollDelay={0.55}
                  onFadeInComplete={() => {
                    if (insightTimerRef.current != null)
                      window.clearTimeout(insightTimerRef.current)
                    insightTimerRef.current = window.setTimeout(() => setShowInsight(true), 1500)
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
