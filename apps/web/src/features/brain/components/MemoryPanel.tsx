'use client'

import { useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import type { BrainMemory } from '../types'
import {
  knowledgeSourceTypeColor,
  knowledgeSourceTypeLabel,
  MEMORY_TYPE_COLORS,
  SNAPSHOT_TYPE_COLORS,
} from '../types'

// ============================================================================
// Props
// ============================================================================

interface MemoryPanelProps {
  memories: BrainMemory[]
  selectedId: string | null
  onSelect: (memory: BrainMemory) => void
  visible: boolean
  onClose: () => void
}

// ============================================================================
// Component
// ============================================================================

export default function MemoryPanel({
  memories,
  selectedId,
  onSelect,
  visible,
  onClose,
}: MemoryPanelProps) {
  const [search, setSearch] = useState('')
  const isKnowledgePanel = memories.some(
    (memory) => memory.node_type === 'knowledge_item' || memory.node_type === 'knowledge_source',
  )

  const filtered = useMemo(() => {
    if (!search.trim()) return memories
    const q = search.toLowerCase()
    return memories.filter(
      (m) =>
        m.content?.toLowerCase().includes(q) ||
        m.name?.toLowerCase().includes(q) ||
        m.memory_type?.toLowerCase().includes(q),
    )
  }, [memories, search])

  if (!visible) return null

  return (
    <div className="surface-card border-border absolute right-0 top-0 z-50 flex h-full w-80 max-w-full flex-col border-l">
      {/* Header */}
      <div className="px-spacing-4 py-spacing-3 border-border flex items-center justify-between border-b">
        <span className="body-3 text-foreground font-medium">
          {isKnowledgePanel ? 'Objects' : 'Memories'} ({filtered.length})
        </span>
        <button onClick={onClose} className="btn-icon-bare">
          <X className="icon-xs" />
        </button>
      </div>

      {/* Search */}
      <div className="px-spacing-4 border-border border-b py-2">
        <div className="bg-muted/10 flex items-center gap-2 rounded-lg px-2.5 py-1.5">
          <Search className="icon-xs text-muted-foreground" />
          <input
            type="text"
            placeholder={isKnowledgePanel ? 'Filter objects...' : 'Filter memories...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="body-3 text-foreground placeholder:text-muted-foreground flex-1 bg-transparent outline-none"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.map((m) => {
          const nodeType = m.node_type ?? 'memory'
          const isKnowledgeNode = nodeType === 'knowledge_item' || nodeType === 'knowledge_source'
          const color = isKnowledgeNode
            ? knowledgeSourceTypeColor(m.knowledge_source_type ?? m.source_type)
            : nodeType === 'snapshot'
              ? (SNAPSHOT_TYPE_COLORS[m.snapshot_type ?? ''] ?? '#a855f7')
              : (MEMORY_TYPE_COLORS[m.memory_type] ?? '#64748B')
          const isSelected = m.id === selectedId

          return (
            <button
              key={m.id}
              onClick={() => onSelect(m)}
              className={`px-spacing-4 py-spacing-3 border-border w-full border-b text-left transition-colors ${
                isSelected
                  ? 'bg-primary/10 border-l-2'
                  : 'hover:bg-muted/20 border-l-2 border-l-transparent'
              }`}
              style={isSelected ? { borderLeftColor: color } : undefined}
            >
              <div className="mb-1 flex items-center gap-2">
                <div
                  className="h-2 w-2 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="typo-caption text-muted-foreground uppercase tracking-wider">
                  {nodeType === 'snapshot'
                    ? (m.snapshot_type ?? 'Snapshot')
                    : isKnowledgeNode
                      ? knowledgeSourceTypeLabel(m.knowledge_source_type ?? m.source_type)
                      : nodeType === 'experience'
                        ? 'Experience'
                        : m.memory_type}
                </span>
                <span className="typo-caption text-muted-foreground/50 ml-auto">
                  {isKnowledgeNode
                    ? m.chunk_count != null
                      ? `${m.chunk_count} chunks`
                      : 'Indexed'
                    : `${(m.significance * 100).toFixed(0)}%`}
                </span>
              </div>
              <p className="body-3 text-muted-foreground line-clamp-2">
                {m.content || m.name || 'Untitled'}
              </p>
            </button>
          )
        })}

        {filtered.length === 0 && (
          <div className="px-spacing-4 py-spacing-8 body-3 text-muted-foreground text-center">
            {isKnowledgePanel ? 'No objects found' : 'No memories found'}
          </div>
        )}
      </div>
    </div>
  )
}
