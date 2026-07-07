'use client'

import { useRef } from 'react'
import { ChevronDown, Menu, Search } from 'lucide-react'
import type { BrainConnection, BrainMemory } from '../types'
import ForceGraph, { type ForceGraphHandle } from './ForceGraph'
import LegendPanel from './LegendPanel'
import NavControls from './NavControls'

// ============================================================================
// Demo data: static graph for free-plan preview (no API calls)
// ============================================================================

const DEMO_NODES: BrainMemory[] = [
  {
    id: 'd1',
    content: 'Customer feedback drives product decisions',
    memory_type: 'insight',
    source_type: 'conversation',
    significance: 0.85,
    confidence: 0.9,
    tags: [],
    recalled_count: 0,
    created_at: '2025-03-01T10:00:00Z',
    updated_at: '2025-03-01T10:00:00Z',
    node_type: 'memory',
  },
  {
    id: 'd2',
    content: 'Prioritize speed over perfection for MVP',
    memory_type: 'decision',
    source_type: 'conversation',
    significance: 0.9,
    confidence: 0.95,
    tags: [],
    recalled_count: 0,
    created_at: '2025-03-02T14:00:00Z',
    updated_at: '2025-03-02T14:00:00Z',
    node_type: 'memory',
  },
  {
    id: 'd3',
    content: 'Weekly sync with stakeholders',
    memory_type: 'framework',
    source_type: 'conversation',
    significance: 0.7,
    confidence: 0.85,
    tags: [],
    recalled_count: 0,
    created_at: '2025-03-03T09:00:00Z',
    updated_at: '2025-03-03T09:00:00Z',
    node_type: 'memory',
  },
  {
    id: 'd4',
    content: 'Launch strategy for Q2',
    memory_type: 'fact',
    source_type: 'mission',
    significance: 0.75,
    confidence: 0.8,
    tags: [],
    recalled_count: 0,
    created_at: '2025-03-04T11:00:00Z',
    updated_at: '2025-03-04T11:00:00Z',
    node_type: 'memory',
  },
  {
    id: 'd5',
    content: 'Team alignment on goals',
    memory_type: 'insight',
    source_type: 'conversation',
    significance: 0.8,
    confidence: 0.88,
    tags: [],
    recalled_count: 0,
    created_at: '2025-03-05T16:00:00Z',
    updated_at: '2025-03-05T16:00:00Z',
    node_type: 'memory',
  },
  {
    id: 'd6',
    content: 'Key breakthrough moment',
    memory_type: 'event',
    source_type: 'conversation',
    significance: 0.95,
    confidence: 0.92,
    tags: [],
    recalled_count: 0,
    created_at: '2025-03-01T15:30:00Z',
    updated_at: '2025-03-01T15:30:00Z',
    node_type: 'snapshot',
    snapshot_type: 'Model',
  },
  {
    id: 'd7',
    content: 'Marketing funnel optimization',
    memory_type: 'insight',
    source_type: 'conversation',
    significance: 0.72,
    confidence: 0.82,
    tags: [],
    recalled_count: 0,
    created_at: '2025-03-02T12:00:00Z',
    updated_at: '2025-03-02T12:00:00Z',
    node_type: 'memory',
  },
  {
    id: 'd8',
    content: 'Budget allocation framework',
    memory_type: 'framework',
    source_type: 'upload',
    significance: 0.68,
    confidence: 0.78,
    tags: [],
    recalled_count: 0,
    created_at: '2025-03-03T10:00:00Z',
    updated_at: '2025-03-03T10:00:00Z',
    node_type: 'sk_entry',
    entry_type: 'concept',
    domain: 'finance',
  },
  {
    id: 'd9',
    content: 'User research synthesis',
    memory_type: 'story',
    source_type: 'conversation',
    significance: 0.82,
    confidence: 0.9,
    tags: [],
    recalled_count: 0,
    created_at: '2025-03-04T14:00:00Z',
    updated_at: '2025-03-04T14:00:00Z',
    node_type: 'memory',
  },
  {
    id: 'd10',
    content: 'Product roadmap principles',
    memory_type: 'principle',
    source_type: 'conversation',
    significance: 0.88,
    confidence: 0.93,
    tags: [],
    recalled_count: 0,
    created_at: '2025-03-05T09:00:00Z',
    updated_at: '2025-03-05T09:00:00Z',
    node_type: 'sk_entry',
    entry_type: 'principle',
    domain: 'strategy',
  },
  {
    id: 'd11',
    content: 'Call with investor',
    memory_type: 'event',
    source_type: 'fathom',
    significance: 0.9,
    confidence: 0.85,
    tags: [],
    recalled_count: 0,
    created_at: '2025-03-02T16:00:00Z',
    updated_at: '2025-03-02T16:00:00Z',
    node_type: 'experience',
  },
  {
    id: 'd12',
    content: 'Sprint retrospective insights',
    memory_type: 'insight',
    source_type: 'conversation',
    significance: 0.65,
    confidence: 0.8,
    tags: [],
    recalled_count: 0,
    created_at: '2025-03-06T11:00:00Z',
    updated_at: '2025-03-06T11:00:00Z',
    node_type: 'memory',
  },
]

const DEMO_CONNECTIONS: BrainConnection[] = [
  {
    id: 'c1',
    source_memory_id: 'd1',
    target_memory_id: 'd2',
    relationship_type: 'supports',
    strength: 0.8,
  },
  {
    id: 'c2',
    source_memory_id: 'd2',
    target_memory_id: 'd4',
    relationship_type: 'elaborates',
    strength: 0.7,
  },
  {
    id: 'c3',
    source_memory_id: 'd1',
    target_memory_id: 'd5',
    relationship_type: 'related_to',
    strength: 0.6,
  },
  {
    id: 'c4',
    source_memory_id: 'd3',
    target_memory_id: 'd5',
    relationship_type: 'supports',
    strength: 0.75,
  },
  {
    id: 'c5',
    source_memory_id: 'd4',
    target_memory_id: 'd7',
    relationship_type: 'related_to',
    strength: 0.65,
  },
  {
    id: 'c6',
    source_memory_id: 'd6',
    target_memory_id: 'd2',
    relationship_type: 'caused_by',
    strength: 0.9,
  },
  {
    id: 'c7',
    source_memory_id: 'd7',
    target_memory_id: 'd8',
    relationship_type: 'elaborates',
    strength: 0.7,
  },
  {
    id: 'c8',
    source_memory_id: 'd8',
    target_memory_id: 'd4',
    relationship_type: 'supports',
    strength: 0.6,
  },
  {
    id: 'c9',
    source_memory_id: 'd9',
    target_memory_id: 'd1',
    relationship_type: 'related_to',
    strength: 0.8,
  },
  {
    id: 'c10',
    source_memory_id: 'd10',
    target_memory_id: 'd4',
    relationship_type: 'supports',
    strength: 0.85,
  },
  {
    id: 'c11',
    source_memory_id: 'd11',
    target_memory_id: 'd6',
    relationship_type: 'emerged_from',
    strength: 0.95,
  },
  {
    id: 'c12',
    source_memory_id: 'd12',
    target_memory_id: 'd3',
    relationship_type: 'elaborates',
    strength: 0.6,
  },
  {
    id: 'c13',
    source_memory_id: 'd5',
    target_memory_id: 'd10',
    relationship_type: 'related_to',
    strength: 0.55,
  },
  {
    id: 'c14',
    source_memory_id: 'd6',
    target_memory_id: 'd5',
    relationship_type: 'evolved_from',
    strength: 0.7,
  },
]

// ============================================================================
// Component
// ============================================================================

export function BrainWindowPreview() {
  const graphRef = useRef<ForceGraphHandle | null>(null)

  const memoryCounts: Record<string, number> = {}
  const snapshotCounts: Record<string, number> = {}
  for (const n of DEMO_NODES) {
    if ((n.node_type ?? 'memory') === 'memory') {
      const t = (n.memory_type as string) || 'fact'
      memoryCounts[t] = (memoryCounts[t] ?? 0) + 1
    }
    if (n.node_type === 'snapshot' && n.snapshot_type) {
      snapshotCounts[n.snapshot_type] = (snapshotCounts[n.snapshot_type] ?? 0) + 1
    }
  }

  const noop = () => {}

  return (
    <div className="bg-background pointer-events-none relative h-full w-full overflow-hidden">
      <ForceGraph
        ref={graphRef}
        nodes={DEMO_NODES}
        connections={DEMO_CONNECTIONS}
        selectedNodeId={null}
        searchQuery=""
        onNodeClick={noop}
      />

      {/* Mobile header */}
      <div className="absolute inset-x-0 top-0 z-40 flex items-center gap-3 px-3 pb-1 pt-3 md:hidden">
        <div className="chip-glass-neutral h-spacing-8 w-spacing-8 flex items-center justify-center rounded-lg">
          <Menu className="h-4 w-4" />
        </div>
        <span className="body-2 min-w-0 flex-1 truncate text-center font-medium text-[var(--color-foreground)]">
          Brain
        </span>
        <div className="chip-glass-neutral h-spacing-8 w-spacing-8 flex items-center justify-center rounded-lg">
          <Search className="h-4 w-4" />
        </div>
        <div className="chip-glass-neutral h-spacing-8 flex items-center gap-1 rounded-lg px-2">
          <span className="body-3 max-w-[80px] truncate font-medium">Your Brain</span>
          <ChevronDown className="h-3 w-3" />
        </div>
      </div>

      {/* Top bar, same layout as BrainVisualization (desktop) */}
      <div className="top-spacing-4 left-spacing-4 right-spacing-4 absolute z-40 hidden items-start justify-between gap-2 md:flex">
        <div className="md:gap-spacing-2 flex items-center gap-1">
          <button className="button-glass-neutral gap-spacing-2 px-spacing-3 py-spacing-2 body-3 flex items-center rounded-lg font-medium">
            <span className="gap-spacing-2 relative z-10 flex items-center">
              Your Brain
              <ChevronDown className="icon-xs text-muted-foreground" />
            </span>
          </button>
          <button className="button-glass-neutral gap-spacing-2 px-spacing-3 py-spacing-2 body-3 flex items-center rounded-lg font-medium">
            <span className="gap-spacing-2 relative z-10 flex items-center">
              All
              <ChevronDown className="icon-xs text-muted-foreground" />
            </span>
          </button>
          <button className="button-glass-neutral px-spacing-3 py-spacing-2 body-3 flex items-center gap-2 rounded-lg font-medium">
            <Search className="icon-sm text-muted-foreground" />
            <span className="relative z-10">Search</span>
          </button>
        </div>
      </div>

      <div className="hidden md:block">
        <NavControls onZoomIn={noop} onZoomOut={noop} onCenter={noop} onOrganize={noop} />
      </div>

      <div className="hidden md:block">
        <LegendPanel
          memoryCounts={memoryCounts}
          snapshotCounts={snapshotCounts}
          memoryCount={8}
          experienceCount={1}
          snapshotCount={1}
          skEntryCount={2}
          domainCounts={{ finance: 1, strategy: 1 }}
          sourceCounts={{}}
          connections={DEMO_CONNECTIONS}
          scopeType="user"
          isAgentBrain={false}
          brainId={null}
        />
      </div>
    </div>
  )
}
