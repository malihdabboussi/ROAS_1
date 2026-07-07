/**
 * Artifact view tabs for client workspace spaces (presentations, funnels, …).
 * Shape mirrors apps/api buildArtifactViewDef().
 */
export type ArtifactViewType = 'presentations' | 'funnels'

export const CLIENT_WORKSPACE_SLUG: Record<string, string> = {
  acme: 'plinthworks-workspace',
  beta: 'saltline-workspace',
  gamma: 'helmsmark-workspace',
  delta: 'cloverkin-workspace',
  epsilon: 'throughput-workspace',
  zeta: 'almanac-workspace',
}

const VIEW_META: Record<ArtifactViewType, { name: string; icon: string; configKey: string }> = {
  presentations: { name: 'Presentations', icon: 'presentation', configKey: 'presentations_config' },
  funnels: { name: 'Funnels', icon: 'git-branch', configKey: 'funnels_config' },
}

export function buildArtifactViewDef(viewType: ArtifactViewType): Record<string, unknown> {
  const meta = VIEW_META[viewType]
  return {
    id: viewType,
    type: viewType,
    name: meta.name,
    icon: meta.icon,
    [meta.configKey]: {
      display_mode: 'grid',
      time_range: 'all',
      sort_by: 'created_at',
      sort_dir: 'desc',
    },
  }
}

export function schemaHasArtifactView(schema: unknown, viewType: ArtifactViewType): boolean {
  if (!schema || typeof schema !== 'object') return false
  const views = (schema as { views?: unknown }).views
  if (!Array.isArray(views)) return false
  return views.some(
    (view) =>
      view &&
      typeof view === 'object' &&
      ((view as { type?: string }).type === viewType || (view as { id?: string }).id === viewType),
  )
}

export function mergeArtifactViewIntoSchema(
  schema: unknown,
  viewType: ArtifactViewType,
): { schema: Record<string, unknown>; added: boolean } {
  const base =
    schema && typeof schema === 'object'
      ? { ...(schema as Record<string, unknown>) }
      : { version: 1, fields: [] }

  if (schemaHasArtifactView(base, viewType)) {
    return { schema: base, added: false }
  }

  const views = Array.isArray(base.views) ? [...base.views] : []
  views.push(buildArtifactViewDef(viewType))
  return { schema: { ...base, views }, added: true }
}
