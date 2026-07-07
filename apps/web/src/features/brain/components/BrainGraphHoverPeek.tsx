import type { BrainMemory } from '../types'
import { nodeKindLabel, truncateHoverBody } from './force-graph-helpers'

export function BrainGraphHoverPeek({ memory }: { memory: BrainMemory }) {
  const nt = memory.node_type ?? 'memory'
  const kind = nodeKindLabel(memory)
  const title =
    memory.pattern_name ||
    memory.name ||
    memory.one_liner ||
    truncateHoverBody(memory.content || '', 72)
  const happenedAt =
    memory.occurred_at ?? memory.evidence_started_at ?? memory.effective_from ?? null
  const displayedDate = new Date(happenedAt ?? memory.created_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const dateLabel = happenedAt ? `Happened ${displayedDate}` : `Learned ${displayedDate}`

  let snippet: string | null = null
  if (nt === 'belief' || nt === 'perspective') {
    snippet = memory.description ? truncateHoverBody(memory.description, 96) : null
  } else if (!memory.pattern_name && !memory.name && !memory.one_liner && memory.content) {
    snippet = truncateHoverBody(memory.content, 96)
  }

  const metaParts: string[] = []
  if (nt === 'knowledge_item' || nt === 'knowledge_source') {
    if (memory.chunk_count != null) metaParts.push(`${memory.chunk_count} chunks`)
    metaParts.push(memory.knowledge_scope === 'campaign' ? 'Campaign Knowledge' : 'Space Knowledge')
  } else {
    metaParts.push(`Sig ${Math.round(memory.significance * 100)}%`)
    metaParts.push(`Confidence ${Math.round(memory.confidence * 100)}%`)
  }
  if (nt === 'belief' && memory.belief_status)
    metaParts.push(memory.belief_status.replace('_', ' '))
  if (nt === 'perspective' && memory.perspective_status)
    metaParts.push(memory.perspective_status.replace('_', ' '))

  return (
    <div className="surface-card border-border max-w-artifact-medium rounded-spacing-2 px-spacing-2 py-spacing-2 gap-spacing-1 flex flex-col border shadow-lg">
      <div className="gap-spacing-1 flex flex-wrap items-center justify-between">
        <span className="badge-glass badge-glass-cyan badge-glass-sm body-3 font-medium">
          {kind}
        </span>
        <span className="body-3 text-muted-foreground shrink-0">{dateLabel}</span>
      </div>
      <p className="body-2 text-foreground line-clamp-2 font-medium">{title}</p>
      <p className="body-3 text-muted-foreground">{metaParts.join(' · ')}</p>
      {snippet ? (
        <p className="body-3 text-muted-foreground mt-spacing-1 pt-spacing-1 line-clamp-2">
          {snippet}
        </p>
      ) : null}
    </div>
  )
}
