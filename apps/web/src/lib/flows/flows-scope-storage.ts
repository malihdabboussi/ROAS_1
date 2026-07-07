export const FLOWS_CREATE_ANYTHING_STORAGE_KEY = 'vibey.flows.createAnythingMode'

export function readStoredFlowsCreateAnythingMode(): boolean {
  if (typeof window === 'undefined') return true
  try {
    const raw = window.localStorage.getItem(FLOWS_CREATE_ANYTHING_STORAGE_KEY)
    if (raw === null) return true
    return raw === 'true'
  } catch {
    return true
  }
}

export function persistFlowsCreateAnythingMode(enabled: boolean) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(FLOWS_CREATE_ANYTHING_STORAGE_KEY, enabled ? 'true' : 'false')
  } catch {
    /* ignore */
  }
}

export const FLOWS_CONCEPT_SPACE_TITLE = 'Flow concepts'
export const FLOWS_CONCEPT_SPACE_SCHEMA_FLAG = 'vibey_flows_concept_space'

export function buildFlowsConceptSpaceSchema(): Record<string, unknown> {
  return {
    icon: 'workflow',
    icon_color: 'purple',
    custom_data: {
      [FLOWS_CONCEPT_SPACE_SCHEMA_FLAG]: true,
    },
    views: [
      {
        id: 'tasks',
        type: 'list',
        name: 'Tasks',
      },
    ],
  }
}

export function isFlowsConceptSpace(schema: unknown): boolean {
  if (!schema || typeof schema !== 'object') return false
  const customData = (schema as Record<string, unknown>).custom_data
  if (!customData || typeof customData !== 'object') return false
  return (customData as Record<string, unknown>)[FLOWS_CONCEPT_SPACE_SCHEMA_FLAG] === true
}

export function matchesFlowsConceptSpace(space: {
  title?: string | null
  schema?: unknown
}): boolean {
  return isFlowsConceptSpace(space.schema) || space.title === FLOWS_CONCEPT_SPACE_TITLE
}
