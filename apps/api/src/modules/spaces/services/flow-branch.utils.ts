export type FlowBranchOperator = 'equals' | 'not_equals' | 'contains' | 'is_empty' | 'is_not_empty'

export function readFlowBranchFieldValue(
  item: Record<string, unknown>,
  fieldId: string,
): string {
  const normalizedFieldId = fieldId.trim()
  if (!normalizedFieldId) return ''

  const customData =
    item.custom_data && typeof item.custom_data === 'object'
      ? (item.custom_data as Record<string, unknown>)
      : {}

  const raw = item[normalizedFieldId] ?? customData[normalizedFieldId]
  if (raw == null) return ''
  if (typeof raw === 'object') return JSON.stringify(raw)
  return String(raw).trim()
}

export function evaluateFlowBranchCondition(
  actualRaw: string,
  operator: FlowBranchOperator,
  expectedRaw: string,
): boolean {
  const actual = actualRaw.trim()
  const expected = expectedRaw.trim()

  switch (operator) {
    case 'is_empty':
      return actual.length === 0
    case 'is_not_empty':
      return actual.length > 0
    case 'not_equals':
      return actual.toLowerCase() !== expected.toLowerCase()
    case 'contains':
      return actual.toLowerCase().includes(expected.toLowerCase())
    case 'equals':
    default:
      return actual.toLowerCase() === expected.toLowerCase()
  }
}

export function resolveFlowBranchJumpIndex(input: {
  matched: boolean
  thenStepIndex: number
  elseStepIndex?: number | null
}): number | null {
  if (input.matched) return input.thenStepIndex
  if (typeof input.elseStepIndex === 'number' && Number.isInteger(input.elseStepIndex)) {
    return input.elseStepIndex
  }
  return null
}
