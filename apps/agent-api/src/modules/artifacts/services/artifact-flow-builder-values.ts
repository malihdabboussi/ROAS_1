import type { FlowCapability } from '@vibey/api-shared/types/flow-capabilities'

export type JsonRecord = Record<string, unknown>

export function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

export function objectValue(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : {}
}

export function objectArrayValue(value: unknown): JsonRecord[] {
  return Array.isArray(value)
    ? value.filter(
        (entry): entry is JsonRecord =>
          !!entry && typeof entry === 'object' && !Array.isArray(entry),
      )
    : []
}

export function stringArrayValue(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
    : []
}

export function missingRequiredFields(capability: FlowCapability, payload: JsonRecord): string[] {
  return capability.requiredFields.filter((field) => isMissingPayloadValue(payload[field]))
}

function isMissingPayloadValue(value: unknown): boolean {
  if (value == null) return true
  if (typeof value !== 'string') return false
  const normalized = value.trim().toLowerCase()
  if (!normalized) return true
  return [
    'connected_account_id',
    'custom_field_id',
    'form_id',
    'channel_id',
    'tag_name',
    'agent_brain_id',
    'https://github.com/acme/repo',
  ].includes(normalized)
}

export function capabilityIdFor(kind: 'trigger' | 'action', payload: JsonRecord): string | null {
  const type = stringValue(payload.type)
  if (!type) return null
  if (kind === 'trigger' && type === 'external_app_event') {
    const slug = stringValue(payload.trigger_slug)
    return slug ? `trigger.external_app_event.${slug}` : null
  }
  return `${kind}.${type}`
}
