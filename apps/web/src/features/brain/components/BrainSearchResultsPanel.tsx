'use client'

import { knowledgeSourceTypeLabel, type BrainMemory } from '../types'

interface BrainSearchResultsPanelProps {
  searchLoading: boolean
  searchInput: string
  searchResults: BrainMemory[]
  onSelectResult: (memory: BrainMemory) => void
}

export function BrainSearchResultsPanel({
  searchLoading,
  searchInput,
  searchResults,
  onSelectResult,
}: BrainSearchResultsPanelProps) {
  const showEmpty = !searchLoading && searchInput.trim().length >= 2 && searchResults.length === 0

  return (
    <div className="card-glass border-border mt-spacing-2 absolute left-0 right-0 top-full z-50 max-h-72 overflow-y-auto rounded-xl border shadow-lg">
      {searchLoading && (
        <div className="px-spacing-4 py-spacing-4 body-3 text-muted-foreground text-center">
          Searching…
        </div>
      )}
      {showEmpty && (
        <div className="px-spacing-4 py-spacing-4 body-3 text-muted-foreground text-center">
          No results found
        </div>
      )}
      {!searchLoading &&
        searchResults.map((memory) => {
          const isSnapshot = memory.node_type === 'snapshot'
          const isKnowledgeResult =
            memory.node_type === 'knowledge_item' || memory.node_type === 'knowledge_source'
          const typeLabel = isSnapshot
            ? (memory.snapshot_type ?? 'Snapshot')
            : isKnowledgeResult
              ? knowledgeSourceTypeLabel(memory.knowledge_source_type ?? memory.source_type)
              : (memory.memory_type ?? 'memory')

          return (
            <button
              key={memory.id}
              type="button"
              onClick={() => onSelectResult(memory)}
              className="px-spacing-4 py-spacing-3 border-border hover:bg-hover-subtle w-full border-b text-left transition-colors last:border-b-0"
            >
              <div className="mb-1 flex items-center gap-2">
                <span className="typo-caption text-muted-foreground uppercase">{typeLabel}</span>
                <span className="typo-caption text-muted-foreground/50 ml-auto">
                  {isKnowledgeResult
                    ? memory.chunk_count != null
                      ? `${memory.chunk_count} chunks`
                      : 'Indexed'
                    : `${Math.round((memory.significance ?? 0) * 100)}%`}
                </span>
              </div>
              {memory.media_type && memory.media_type !== 'text' && (
                <div className="mb-1">
                  <span className="badge-glass badge-glass-muted rounded-spacing-1 px-spacing-1 typo-caption uppercase">
                    {memory.media_type}
                  </span>
                </div>
              )}
              <p className="body-3 text-foreground line-clamp-2">
                {memory.content || memory.name || 'Untitled'}
              </p>
            </button>
          )
        })}
    </div>
  )
}
