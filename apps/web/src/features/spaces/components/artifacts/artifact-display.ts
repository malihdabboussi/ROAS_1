import type { ArtifactViewBaseConfig, ReportingTimeRange } from '../../types/space-schema'
export { formatArtifactDate, formatRelativeArtifactDate } from '@/lib/artifacts/artifact-date'

export interface ArtifactListRow {
  id: string
  title: string
  subtitle?: string | null
  description?: string | null
  thumbnailUrl?: string | null
  created_at?: string | null
  updated_at?: string | null
  groupValues?: Record<string, string | null | undefined>
  sortValues?: Record<string, string | number | null | undefined>
  badges?: Array<{ label: string; tone?: 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'muted' }>
  raw: unknown
  /** Per-row preview kind for unified All Artifacts view. */
  previewKind?: import('./artifact-preview-selection').ArtifactPreviewSelection['type']
  /** Source artifact view type for unified All Artifacts view. */
  artifactViewType?: import('../../types/space-schema').ArtifactViewType
}

export interface ArtifactColumnDef {
  id: string
  label: string
  getValue: (row: ArtifactListRow) => string
}

export interface ArtifactGroup {
  key: string
  label: string
  rows: ArtifactListRow[]
}

export function resolveArtifactDateRange(
  timeRange?: ReportingTimeRange,
  customStart?: string,
  customEnd?: string,
): { start?: string; end?: string } {
  if (timeRange === 'all' || !timeRange) return {}
  if (timeRange === '24h') {
    const start = new Date(Date.now() - 24 * 3_600_000)
    return { start: start.toISOString() }
  }
  const dayMap: Partial<Record<ReportingTimeRange, number>> = {
    '7d': 7,
    '15d': 15,
    '30d': 30,
    '90d': 90,
  }
  if (dayMap[timeRange]) {
    const start = new Date(Date.now() - dayMap[timeRange]! * 86_400_000)
    return { start: start.toISOString() }
  }
  if (customStart || customEnd) return { start: customStart, end: customEnd }
  return {}
}

export function artifactMatchesSearch(row: ArtifactListRow, query?: string): boolean {
  const q = query?.trim().toLowerCase()
  if (!q) return true
  const haystack = [
    row.title,
    row.subtitle,
    row.description,
    ...(row.badges ?? []).map((badge) => badge.label),
    ...Object.values(row.groupValues ?? {}),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return haystack.includes(q)
}

export function artifactMatchesTimeRange(
  row: ArtifactListRow,
  config: ArtifactViewBaseConfig,
  field: 'created_at' | 'updated_at' | 'scheduled_at' = 'created_at',
): boolean {
  const range = resolveArtifactDateRange(config.time_range, config.custom_start, config.custom_end)
  if (!range.start && !range.end) return true
  const raw = field === 'updated_at' ? row.updated_at : (row.sortValues?.[field] ?? row.created_at)
  if (!raw || typeof raw !== 'string') return true
  if (range.start && raw < range.start) return false
  if (range.end && raw > range.end) return false
  return true
}

export function sortArtifactRows(
  rows: ArtifactListRow[],
  config: ArtifactViewBaseConfig,
): ArtifactListRow[] {
  const sortBy = config.sort_by ?? 'created_at'
  const sortDir = config.sort_dir ?? 'desc'
  return [...rows].sort((a, b) => {
    const av =
      a.sortValues?.[sortBy] ?? a.groupValues?.[sortBy] ?? a[sortBy as keyof ArtifactListRow]
    const bv =
      b.sortValues?.[sortBy] ?? b.groupValues?.[sortBy] ?? b[sortBy as keyof ArtifactListRow]
    const an =
      typeof av === 'number' ? av : typeof av === 'string' ? Date.parse(av) || av.toLowerCase() : ''
    const bn =
      typeof bv === 'number' ? bv : typeof bv === 'string' ? Date.parse(bv) || bv.toLowerCase() : ''
    if (an < bn) return sortDir === 'asc' ? -1 : 1
    if (an > bn) return sortDir === 'asc' ? 1 : -1
    return 0
  })
}

export function groupArtifactRows(
  rows: ArtifactListRow[],
  groupBy?: string,
  groupSort: 'asc' | 'desc' = 'asc',
): ArtifactGroup[] | null {
  if (!groupBy) return null
  const groups = new Map<string, ArtifactListRow[]>()
  for (const row of rows) {
    const value = row.groupValues?.[groupBy] || 'Uncategorized'
    const key = String(value)
    groups.set(key, [...(groups.get(key) ?? []), row])
  }
  const result = [...groups.entries()].map(([key, groupedRows]) => ({
    key,
    label: key,
    rows: groupedRows,
  }))
  result.sort((a, b) => a.label.localeCompare(b.label))
  return groupSort === 'desc' ? result.reverse() : result
}
