import { BadRequestException } from '@nestjs/common'

export function unwrapComposioPayload(value: unknown): unknown {
  let current: unknown = value
  for (let i = 0; i < 6; i += 1) {
    const record = asRecord(current)
    if (!record) break
    if (typeof record.error === 'string' && record.error.length > 0) {
      throw new BadRequestException(record.error)
    }
    if (record.successful === false) {
      throw new BadRequestException(
        typeof record.error === 'string' ? record.error : 'Composio tool execution failed',
      )
    }
    if ('data' in record && record.data !== undefined && record.data !== null) {
      current = record.data
      continue
    }
    break
  }
  return current
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

export function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

export function findNestedString(
  root: unknown,
  keys: string[],
  depth = 0,
): string | null {
  const direct = asRecord(root)
  if (direct) {
    for (const key of keys) {
      const hit = asString(direct[key])
      if (hit) return hit
    }
  }
  if (depth >= 5) return null
  if (!direct) return null
  for (const value of Object.values(direct)) {
    const nested = findNestedString(value, keys, depth + 1)
    if (nested) return nested
  }
  return null
}
