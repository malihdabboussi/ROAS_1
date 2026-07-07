'use client'

import { useEffect, useRef, useState } from 'react'
import ForceGraph, { type ForceGraphHandle } from './brain-app/ForceGraph'
import { getMarketingBrainDemoGraph } from './brain-app/marketingBrainDemoGraph'
import type { BrainMemory } from './brain-app/types'

const DEMO = getMarketingBrainDemoGraph()

/** Plain brain graph for blog banner — no legend, no insight card, no toolbar chrome. */
export function MarketingBrainGraphBlogBanner() {
  const graphRef = useRef<ForceGraphHandle>(null)
  const [selectedNode, setSelectedNode] = useState<BrainMemory | null>(null)

  useEffect(() => {
    // After the canvas has measured its container, re-center the graph so
    // positions saved from the full-size feature page don't misalign the view.
    const t = window.setTimeout(() => {
      graphRef.current?.center()
    }, 600)
    return () => window.clearTimeout(t)
  }, [])

  return (
    <div className="relative h-full w-full">
      <ForceGraph
        ref={graphRef}
        className="h-full w-full"
        nodes={DEMO.nodes}
        connections={DEMO.connections}
        selectedNodeId={selectedNode?.id ?? null}
        searchQuery=""
        onNodeClick={setSelectedNode}
        animateEntrance
        entranceStartDelayMs={300}
        entranceBatchDelayMs={48}
      />
      {selectedNode && (
        <div className="border-border bg-[var(--color-card)]/95 pointer-events-none absolute bottom-3 left-1/2 z-30 max-w-[min(88%,300px)] -translate-x-1/2 rounded-lg border px-2 py-1.5 shadow-lg backdrop-blur-sm">
          <p className="line-clamp-2 text-[10px] font-medium leading-snug text-[var(--color-foreground)]">
            {selectedNode.content || selectedNode.name || 'Memory'}
          </p>
        </div>
      )}
    </div>
  )
}
