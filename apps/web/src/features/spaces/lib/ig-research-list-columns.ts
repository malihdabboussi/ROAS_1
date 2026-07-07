import type { FieldDef, IgResearchConfig, IgResearchListColumnId } from '../types/space-schema'
import { IG_RESEARCH_LIST_COLUMN_IDS } from '../types/space-schema'

/** Synthetic list field id for the preview column (maps to `DraggableColumnHeaders` “name” column). */
export const IG_LIST_PREVIEW_FIELD_ID = 'ig_list_preview' as const

/** Header label for the thumbnail / preview column in list mode. */
export const IG_LIST_PREVIEW_HEADER_LABEL = 'Preview'

export const IG_RESEARCH_LIST_COLUMN_META: { id: IgResearchListColumnId; label: string }[] = [
  { id: 'format', label: 'Format' },
  { id: 'multiplier', label: 'Multiplier' },
  { id: 'views', label: 'Views' },
  { id: 'likes', label: 'Likes' },
  { id: 'comments', label: 'Comments' },
  { id: 'posted', label: 'Posted' },
  { id: 'account', label: 'Account' },
  { id: 'caption', label: 'Caption' },
  { id: 'hook', label: 'Hook' },
  { id: 'transcript', label: 'Transcript' },
]

export function resolveIgListVisibleColumns(config: IgResearchConfig): IgResearchListColumnId[] {
  const v = config.list_visible_columns
  if (v === undefined) return [...IG_RESEARCH_LIST_COLUMN_IDS]
  if (v.length === 0) return []
  const allowed = new Set<IgResearchListColumnId>(IG_RESEARCH_LIST_COLUMN_IDS)
  return v.filter((id) => allowed.has(id))
}

/** Columns used when rendering list mode — never empty (falls back to defaults). */
export function resolveIgListEffectiveColumns(config: IgResearchConfig): IgResearchListColumnId[] {
  const cols = resolveIgListVisibleColumns(config)
  return cols.length > 0 ? cols : [...IG_RESEARCH_LIST_COLUMN_IDS]
}

/** Field defs for `DraggableColumnHeaders`: preview + visible data columns (order matches list). */
export function buildIgListFieldDefs(visibleColumnIds: IgResearchListColumnId[]): FieldDef[] {
  const meta = new Map(IG_RESEARCH_LIST_COLUMN_META.map((m) => [m.id, m]))
  const preview: FieldDef = {
    id: IG_LIST_PREVIEW_FIELD_ID,
    name: IG_LIST_PREVIEW_HEADER_LABEL,
    type: 'text',
    system: true,
  }
  const data: FieldDef[] = visibleColumnIds.map((id) => ({
    id,
    name: meta.get(id)?.label ?? id,
    type: 'text',
    system: true,
  }))
  return [preview, ...data]
}
