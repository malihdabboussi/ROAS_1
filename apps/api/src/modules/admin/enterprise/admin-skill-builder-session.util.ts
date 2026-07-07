export function buildAdminSkillBuilderSessionKey(input: {
  userId: string
  sessionId: string
  orgId?: string | null
  targetAgentKey: string
}): string {
  const gatewayAgentId = input.orgId ? `org-${input.orgId}-vibey` : 'vibey'
  let key = `agent:${gatewayAgentId}:${gatewayAgentId}-${input.userId}-${input.sessionId}`
  if (input.orgId) key += `::org:${input.orgId}`
  key += `::target:${input.targetAgentKey}::admin-skill-builder`
  return key
}

export function isAdminSkillBuilderSessionKey(sessionKey?: string): boolean {
  return Boolean(sessionKey?.includes('::admin-skill-builder'))
}
