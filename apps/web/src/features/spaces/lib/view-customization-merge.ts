import type { Space } from '../types'
import {
  DEFAULT_TASK_VISIBLE_FIELD_IDS,
  REPORTING_VIEW_TYPES,
  type SpaceSchema,
  type ViewDef,
} from '../types/space-schema'

/** Legacy key; automations live on `/api/spaces/:id/automations`. Strip before PATCH or local merges. */
export function omitSchemaAutomations<T extends Record<string, unknown>>(schema: T): T {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) return schema
  if (!('automations' in schema)) return schema
  const { automations: _removed, ...rest } = schema
  return rest as T
}

/**
 * Stored spaces may still have `type: 'gallery'` tabs; coerce to list so UI and types stay aligned.
 */
export function normalizeSpaceSchemaLegacyViews(schema: SpaceSchema): SpaceSchema {
  const views = schema.views ?? []
  let mutated = false
  const next = views.map((v) => {
    if ((v as { type: string }).type !== 'gallery') return v
    mutated = true
    return { ...v, type: 'list' } as ViewDef
  })
  if (!mutated) return schema
  return { ...schema, views: next }
}

export function normalizeSpaceLegacyViews(space: Space): Space {
  const cleaned = omitSchemaAutomations(
    space.schema as unknown as Record<string, unknown>,
  ) as unknown as SpaceSchema
  return { ...space, schema: normalizeSpaceSchemaLegacyViews(cleaned) }
}

export function fallbackView(schema: SpaceSchema): ViewDef {
  return (
    schema.views[0] ?? {
      id: 'list',
      type: 'list',
      name: 'List',
      visible_fields: [...DEFAULT_TASK_VISIBLE_FIELD_IDS],
    }
  )
}

/**
 * Nested `ViewDef` keys merged depth-wise (override + session draft + schema).
 * Keep in sync with `mergeViewWithOverride` / `applySessionDraft` in use-spaces-store.
 */
export const VIEW_CUSTOMIZE_NESTED_KEYS = [
  'missions_config',
  'ig_research_config',
  'tiktok_research_config',
  'all_social_research_config',
  'ads_research_config',
  'all_artifacts_config',
  'docs_config',
  'reporting_config',
  'contacts_config',
  'channels_config',
  'channel_config',
  'calendar_config',
  'funnels_config',
  'forms_config',
  'offers_config',
  'ads_config',
  'ad_campaigns_config',
  'sequences_config',
  'emails_config',
  'presentations_config',
  'avatars_config',
  'social_posts_config',
  'websites_config',
] as const

/** Accumulate toolbar customize patches into a session draft without clobbering nested *_config. */
export function mergeSessionDraftPartial(
  prev: Partial<ViewDef>,
  patch: Partial<ViewDef>,
): Partial<ViewDef> {
  const merged = { ...prev } as Record<string, unknown>
  for (const [key, val] of Object.entries(patch)) {
    if (val === undefined) continue
    if (
      VIEW_CUSTOMIZE_NESTED_KEYS.includes(key as (typeof VIEW_CUSTOMIZE_NESTED_KEYS)[number]) &&
      typeof val === 'object' &&
      val !== null &&
      !Array.isArray(val)
    ) {
      const prevVal = merged[key]
      merged[key] = {
        ...(typeof prevVal === 'object' && prevVal !== null && !Array.isArray(prevVal)
          ? (prevVal as Record<string, unknown>)
          : {}),
        ...(val as Record<string, unknown>),
      }
    } else {
      merged[key] = val
    }
  }
  return merged as Partial<ViewDef>
}

export function mergeViewCustomizationLayers(
  orgView: ViewDef,
  opts: {
    isTeamSpace: boolean
    overrideLayer: Partial<ViewDef> | undefined
    draftLayer: Partial<ViewDef> | undefined
  },
): ViewDef {
  const { isTeamSpace, overrideLayer, draftLayer } = opts
  const layers: Partial<ViewDef>[] = []
  if (isTeamSpace && overrideLayer) layers.push(overrideLayer)
  if (draftLayer) layers.push(draftLayer)
  if (layers.length === 0) return orgView
  const merged = { ...orgView } as Record<string, unknown>
  for (const layer of layers) {
    for (const [key, val] of Object.entries(layer)) {
      if (val === undefined) continue
      if (
        VIEW_CUSTOMIZE_NESTED_KEYS.includes(key as (typeof VIEW_CUSTOMIZE_NESTED_KEYS)[number]) &&
        typeof val === 'object' &&
        val !== null &&
        !Array.isArray(val)
      ) {
        const base =
          typeof merged[key] === 'object' && merged[key] !== null && !Array.isArray(merged[key])
            ? (merged[key] as Record<string, unknown>)
            : {}
        merged[key] = { ...base, ...(val as Record<string, unknown>) }
      } else {
        merged[key] = val
      }
    }
  }
  return merged as unknown as ViewDef
}

export function isEditorGatedViewType(type: ViewDef['type']): boolean {
  return type === 'contacts' || REPORTING_VIEW_TYPES.has(type)
}
