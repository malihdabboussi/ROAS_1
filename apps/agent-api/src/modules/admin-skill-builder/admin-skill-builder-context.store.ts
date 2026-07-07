export type AdminSkillBuilderRuntimeContext = {
  adminUserId: string
  actingUserId: string
  orgId: string | null
  targetAgentKey: string
}

const store = new Map<string, AdminSkillBuilderRuntimeContext>()

export function setAdminSkillBuilderContext(
  sessionId: string,
  ctx: AdminSkillBuilderRuntimeContext,
): void {
  store.set(sessionId, ctx)
}

export function getAdminSkillBuilderContext(
  sessionId: string | null | undefined,
): AdminSkillBuilderRuntimeContext | null {
  if (!sessionId) return null
  return store.get(sessionId) ?? null
}

export function clearAdminSkillBuilderContext(sessionId: string): void {
  store.delete(sessionId)
}
