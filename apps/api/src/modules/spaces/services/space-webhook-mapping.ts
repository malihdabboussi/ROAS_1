import type { WebhookFieldMappingDto } from '../dto'

export type WebhookMappedFieldValue =
  | string
  | number
  | boolean
  | null
  | Record<string, unknown>
  | unknown[]

export function applyWebhookFieldMappings(
  payload: unknown,
  mappings: WebhookFieldMappingDto[],
): Record<string, WebhookMappedFieldValue> {
  const fields: Record<string, WebhookMappedFieldValue> = {}
  for (const mapping of mappings) {
    const value = resolveJsonPointer(payload, mapping.source_path)
    fields[mapping.key] = normalizeMappedValue(value)
  }
  return fields
}

export function inferWebhookValueType(value: unknown): WebhookFieldMappingDto['value_type'] {
  if (value === null || value === undefined) return 'null'
  if (Array.isArray(value)) return 'array'
  const valueType = typeof value
  if (valueType === 'string' || valueType === 'number' || valueType === 'boolean') {
    return valueType
  }
  if (valueType === 'object') return 'object'
  return 'unknown'
}

export function resolveJsonPointer(payload: unknown, pointer: string): unknown {
  if (!pointer.startsWith('/')) return null
  const segments = pointer
    .slice(1)
    .split('/')
    .map((segment) => segment.replace(/~1/g, '/').replace(/~0/g, '~'))

  let cursor: unknown = payload
  for (const segment of segments) {
    if (Array.isArray(cursor)) {
      if (!/^(0|[1-9]\d*)$/.test(segment)) return null
      const index = Number(segment)
      if (index < 0 || index >= cursor.length) return null
      cursor = cursor[index]
      continue
    }
    if (cursor && typeof cursor === 'object') {
      const record = cursor as Record<string, unknown>
      if (!Object.prototype.hasOwnProperty.call(record, segment)) return null
      cursor = record[segment]
      continue
    }
    return null
  }
  return cursor ?? null
}

function normalizeMappedValue(value: unknown): WebhookMappedFieldValue {
  if (value === undefined) return null
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    Array.isArray(value)
  ) {
    return value
  }
  if (typeof value === 'object') return value as Record<string, unknown>
  return String(value)
}
