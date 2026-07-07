import {
  DEFAULT_FLOW_AUTOMATION_FIELDS,
  isSpaceFieldVisibleInUi,
  type SpaceFieldDef,
  type SpaceSchemaSummary,
} from '@/lib/spaces/spaces-api'

export function flowAutomationFieldsForSpace(
  schema?: SpaceSchemaSummary | null,
): SpaceFieldDef[] {
  if (!schema) return []
  const schemaFields = schema.fields ?? []
  const existingIds = new Set(schemaFields.map((field) => field.id))
  const missingFields = DEFAULT_FLOW_AUTOMATION_FIELDS.filter((field) => !existingIds.has(field.id))
  const mergedFields =
    missingFields.length === 0 ? schemaFields : [...schemaFields, ...missingFields]
  return mergedFields.filter(isSpaceFieldVisibleInUi)
}
