export const FLOWS_CONCEPT_SPACE_TITLE = 'Flow concepts'
export const FLOWS_CONCEPT_SPACE_SCHEMA_FLAG = 'vibey_flows_concept_space'

export function isFlowsConceptSpaceSchema(schema: unknown): boolean {
  if (!schema || typeof schema !== 'object') return false
  const customData = (schema as Record<string, unknown>).custom_data
  if (!customData || typeof customData !== 'object') return false
  return (customData as Record<string, unknown>)[FLOWS_CONCEPT_SPACE_SCHEMA_FLAG] === true
}

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
