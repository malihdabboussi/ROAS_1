'use client'

/**
 * Brain visual tuned for the executive-brief split layout: same force-graph as the
 * marketing mockup, but with a compact insight card (top-right) and a smaller legend
 * (bottom-left) so it reads like a real screen inside the narrow right column.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useTheme } from 'next-themes'
import { List, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import ForceGraph, { type ForceGraphHandle } from '@/components/marketing/brain-app/ForceGraph'
import LegendPanel from '@/components/marketing/brain-app/LegendPanel'
import NavControls from '@/components/marketing/brain-app/NavControls'
import { getMarketingBrainDemoGraph } from '@/components/marketing/brain-app/marketingBrainDemoGraph'
import type { BrainMemory } from '@/components/marketing/brain-app/types'
import { MarketingMemoryInsightMockup } from '@/components/marketing/MarketingMemoryInsightMockup'

const DEMO = getMarketingBrainDemoGraph()

export function ExecutiveBriefBrainVisual() {
  const { resolvedTheme } = useTheme()
  const graphAppearance = resolvedTheme === 'light' ? 'light' : 'dark'
  const graphRef = useRef<ForceGraphHandle>(null)
  const [selectedNode, setSelectedNode] = useState<BrainMemory | null>(null)
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
    <div className="mockup-frame relative h-full min-h-[20rem] w-full overflow-hidden rounded-xl">
      <div
        className={cn(
          'studio-app-preview-root absolute inset-0 isolate overflow-hidden',
          graphAppearance === 'light' ? 'studio-app-preview-light' : 'site-mock-dark',
        )}
      >
        <div className="absolute inset-0 z-0">
          <ForceGraph
            ref={graphRef}
            className="h-full w-full"
            appearance={graphAppearance}
            nodes={filteredNodes}
            connections={filteredConnections}
            selectedNodeId={selectedNode?.id ?? null}
            searchQuery=""
            onNodeClick={setSelectedNode}
            animateEntrance
            entranceStartDelayMs={500}
            entranceBatchDelayMs={58}
            onEntranceComplete={() => setShowLegend(true)}
          />
        </div>

        <div className="pointer-events-none absolute left-3 top-3 z-50 flex items-center gap-1.5">
          <span className="button-glass-neutral flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium">
            <Search className="icon-xs text-muted-foreground" />
            <span className="text-foreground">Search</span>
          </span>
          <span className="button-glass-neutral flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium">
            <List className="icon-xs text-muted-foreground" />
            <span className="text-foreground">Memories</span>
          </span>
        </div>

        {showInsight && (
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="pointer-events-none absolute right-3 top-3 z-50 max-[480px]:hidden"
          >
            <div className="origin-top-right scale-[0.56]">
              <MarketingMemoryInsightMockup variant={graphAppearance} />
            </div>
          </motion.div>
        )}

        <NavControls
          onCenter={() => graphRef.current?.center()}
          onOrganize={() => graphRef.current?.organize()}
        />

        {showLegend && (
          <div className="pointer-events-none absolute bottom-3 left-3 z-50">
            <div className="pointer-events-none origin-bottom-left scale-[0.6]">
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
                  if (insightTimerRef.current != null) window.clearTimeout(insightTimerRef.current)
                  insightTimerRef.current = window.setTimeout(() => setShowInsight(true), 1500)
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
