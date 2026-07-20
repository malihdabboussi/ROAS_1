export const COPYWRITER_MODEL_ID = 'anthropic/claude-opus-4.8'

export function resolveDefaultAgentModel(input: {
  agentKey: string
  role: string
  skillSeedKey?: string | null
}): string {
  const agentKey = input.agentKey.trim().toLowerCase()
  const role = input.role.trim().toLowerCase()
  const skillSeedKey = String(input.skillSeedKey || '')
    .trim()
    .toLowerCase()

  if (skillSeedKey === 'copywriter' || agentKey === 'copywriter' || role.includes('copywriter')) {
    return COPYWRITER_MODEL_ID
  }

  return 'auto'
}
