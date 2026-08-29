export type BrainSearchFamily = 'user' | 'agent' | 'customer' | 'company'

export function parseBrainFamilies(value: unknown): BrainSearchFamily[] {
  if (!Array.isArray(value)) return []
  const allowed = new Set(['user', 'agent', 'customer', 'company'])
  return value
    .map((item) => String(item).trim())
    .filter((item): item is BrainSearchFamily => allowed.has(item))
}

export function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => String(item).trim()).filter(Boolean)
}

export function temporalSearchInput(input: Record<string, unknown>): Record<string, unknown> {
  const timeMode = typeof input.time_mode === 'string' ? input.time_mode.trim() : ''
  const asOf = typeof input.as_of === 'string' ? input.as_of.trim() : ''
  const occurredFrom = typeof input.occurred_from === 'string' ? input.occurred_from.trim() : ''
  const occurredTo = typeof input.occurred_to === 'string' ? input.occurred_to.trim() : ''
  return {
    ...(timeMode ? { time_mode: timeMode } : {}),
    ...(asOf ? { as_of: asOf } : {}),
    ...(occurredFrom ? { occurred_from: occurredFrom } : {}),
    ...(occurredTo ? { occurred_to: occurredTo } : {}),
    ...(typeof input.include_historical === 'boolean'
      ? { include_historical: input.include_historical }
      : {}),
  }
}

export function familyForBrainScope(scope: string): BrainSearchFamily | null {
  if (scope === 'user' || scope === 'agent' || scope === 'customer' || scope === 'company') {
    return scope
  }
  return null
}
