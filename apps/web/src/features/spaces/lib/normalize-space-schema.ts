import { ensureAllMeetingsListColumns } from '@/lib/spaces/all-meetings-list-columns'
import {
  DEFAULT_SPACE_SCHEMA,
  type FieldDef,
  type SpaceSchema,
  type ViewDef,
} from '../types/space-schema'

export function normalizeSpaceSchema(value: unknown): SpaceSchema {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {
      ...DEFAULT_SPACE_SCHEMA,
      fields: [...DEFAULT_SPACE_SCHEMA.fields],
      views: [...DEFAULT_SPACE_SCHEMA.views],
    }
  }

  const raw = value as Record<string, unknown>
  const existingFields = Array.isArray(raw.fields) ? (raw.fields as FieldDef[]) : []
  const existingIds = new Set(existingFields.map((field) => field?.id).filter(Boolean))
  const missingFields = DEFAULT_SPACE_SCHEMA.fields.filter((field) => !existingIds.has(field.id))
  const existingViews = Array.isArray(raw.views) ? (raw.views as ViewDef[]) : []

  const normalized = {
    ...raw,
    version: 1,
    fields: [...existingFields, ...missingFields],
    views: existingViews.length > 0 ? existingViews : [...DEFAULT_SPACE_SCHEMA.views],
  } as SpaceSchema
  return ensureAllMeetingsListColumns(normalized) as SpaceSchema
}
