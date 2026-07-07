export function isAdminSkillBuilderSessionKey(sessionKey?: string): boolean {
  return Boolean(sessionKey?.includes('::admin-skill-builder'))
}

export function parseTargetAgentKeyFromSessionKey(sessionKey?: string): string | null {
  if (!sessionKey?.includes('::target:')) return null
  const after = sessionKey.split('::target:')[1]?.trim()
  if (!after) return null
  const segment = after.includes('::') ? after.split('::')[0] : after
  if (!segment || !/^[a-z0-9_]+$/i.test(segment)) return null
  return segment.toLowerCase().replace(/[^a-z0-9_]/g, '_')
}
