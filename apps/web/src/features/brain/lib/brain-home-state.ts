import type { BrainScopeNavOption } from '../hooks/use-brain-scope-nav-options'
import type { KnowledgeGraphStats } from '../services/knowledge-graph.service'
import type { BrainHealthData } from '../types'

export type BrainSort = 'name_asc' | 'name_desc' | 'last_active' | 'memories_desc'
export type BrainStatusFilter = 'loading' | 'training' | 'empty' | 'recent' | 'quiet' | 'dormant'
export type BrainViewMode = 'grid' | 'list'

export const SORT_OPTIONS = [
  { id: 'name_asc', label: 'Name A → Z' },
  { id: 'name_desc', label: 'Name Z → A' },
  { id: 'last_active', label: 'Last active' },
  { id: 'memories_desc', label: 'Most memories' },
] as const

export const STATUS_OPTIONS = [
  {
    id: 'recent',
    label: 'Recent',
    description: 'Last capture within 7 days',
  },
  {
    id: 'quiet',
    label: 'Quiet',
    description: 'Last capture 7–30 days ago',
  },
  {
    id: 'dormant',
    label: 'Dormant',
    description: 'No capture in 30+ days',
  },
  { id: 'training', label: 'Training', description: 'Embedding queue in progress' },
  { id: 'empty', label: 'Never trained', description: 'No captures yet' },
] as const

export const SCOPE_SECTIONS: Array<{
  id: string
  scopeTypes: BrainScopeNavOption['scopeType'][]
  title: string
  color: string
  emptyText?: string
}> = [
  { id: 'user', scopeTypes: ['user', 'shared'], title: 'User brains', color: 'blue' },
  { id: 'company', scopeTypes: ['company'], title: 'Company brains', color: 'violet' },
  {
    id: 'customer',
    scopeTypes: ['customer'],
    title: 'Customer brains',
    color: 'emerald',
    emptyText: 'No customer brain enabled.',
  },
  {
    id: 'agent',
    scopeTypes: ['agent'],
    title: 'Agent brains',
    color: 'cyan',
    emptyText: 'No agent brains yet.',
  },
  {
    id: 'campaign_knowledge',
    scopeTypes: ['campaign_knowledge'],
    title: 'Campaign Knowledge',
    color: 'purple',
    emptyText: 'No campaigns yet.',
  },
]

export function sectionIncludesScope(
  section: (typeof SCOPE_SECTIONS)[number],
  scopeType: BrainScopeNavOption['scopeType'],
): boolean {
  return section.scopeTypes.includes(scopeType)
}

export function isKnowledgeScopeType(scopeType: BrainScopeNavOption['scopeType']): boolean {
  return scopeType === 'campaign_knowledge'
}

export function knowledgeStatsToHealth(stats: KnowledgeGraphStats): BrainHealthData {
  return {
    status: 'ok',
    total_memories: stats.total_objects,
    total_connections: stats.total_edges,
    embedding_queue: 0,
    last_capture: stats.last_updated,
    last_recall: null,
  }
}

export function matchesSearch(option: BrainScopeNavOption, query: string): boolean {
  if (!query.trim()) return true
  const q = query.trim().toLowerCase()
  return (
    option.label.toLowerCase().includes(q) ||
    option.id.toLowerCase().includes(q) ||
    option.scopeType.toLowerCase().includes(q)
  )
}

export function sortBrains(
  list: BrainScopeNavOption[],
  sort: BrainSort,
  healthByBrainId: Map<string, BrainHealthData>,
): BrainScopeNavOption[] {
  const next = [...list]
  switch (sort) {
    case 'name_desc':
      return next.sort((a, b) => b.label.localeCompare(a.label))
    case 'last_active':
      return next.sort((a, b) => {
        const ta = healthByBrainId.get(a.brainId ?? '')?.last_capture
        const tb = healthByBrainId.get(b.brainId ?? '')?.last_capture
        const ma = ta ? new Date(ta).getTime() : 0
        const mb = tb ? new Date(tb).getTime() : 0
        return mb - ma
      })
    case 'memories_desc':
      return next.sort((a, b) => {
        const ma = healthByBrainId.get(a.brainId ?? '')?.total_memories ?? 0
        const mb = healthByBrainId.get(b.brainId ?? '')?.total_memories ?? 0
        return mb - ma
      })
    case 'name_asc':
    default:
      return next.sort((a, b) => a.label.localeCompare(b.label))
  }
}

export function buildBrainAtlasAwarenessContext(input: {
  isOrg: boolean
  view: BrainViewMode
  search: string
  sort: BrainSort
  statusFilters: BrainStatusFilter[]
  scopeOptions: BrainScopeNavOption[]
  sortedFiltered: BrainScopeNavOption[]
  visibleSections: Array<{ title: string; items: unknown[] }>
  healthLoading: boolean
  resolveHealth: (option: BrainScopeNavOption) => BrainHealthData | undefined
  resolveStatus: (option: BrainScopeNavOption) => string
  agentsWithoutBrainCount: number
}): string {
  const lines = [
    '[Brain Context]',
    'Page: Brain',
    `Workspace mode: ${input.isOrg ? 'organization' : 'personal'}`,
    `View: ${input.view}`,
    `Search query: ${input.search.trim() || 'none'}`,
    `Sort: ${input.sort}`,
    `Status filters: ${input.statusFilters.length ? input.statusFilters.join(', ') : 'none'}`,
    `Visible brains: ${input.sortedFiltered.length} of ${input.scopeOptions.length}`,
    `Agents without brain: ${input.agentsWithoutBrainCount}`,
    `Health loading: ${input.healthLoading ? 'yes' : 'no'}`,
  ]

  if (input.visibleSections.length > 0) {
    lines.push('Visible sections:')
    for (const section of input.visibleSections) {
      lines.push(`- ${section.title}: ${section.items.length}`)
    }
  }

  if (input.sortedFiltered.length > 0) {
    lines.push('Visible brain list:')
    for (const option of input.sortedFiltered.slice(0, 40)) {
      const health = input.resolveHealth(option)
      const status = input.resolveStatus(option)
      lines.push(
        `- ${option.label} (${option.scopeType}, status ${status}, memories ${
          health?.total_memories ?? 0
        }, last capture ${health?.last_capture ?? 'never'})`,
      )
    }
    if (input.sortedFiltered.length > 40) lines.push('- Additional visible brains are not listed.')
  } else {
    lines.push('Visible brain list: none')
  }

  lines.push(
    'If the user asks about this screen, use this context as the visible Brain state. If they ask to open, train, organize, or configure a brain, apply it to the named visible brain; if no brain is named, ask which brain.',
  )

  return lines.join('\n').slice(0, 6000)
}
