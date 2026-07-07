export const TEAM2_SYSTEM_AGENT_KEYS = new Set([
  'vibey',
  'hr',
  'brain_scholar',
  'atlas',
  'loop',
  'viktor',
])

export function isTeam2SystemAgent(agentKey: string): boolean {
  return TEAM2_SYSTEM_AGENT_KEYS.has(agentKey)
}
