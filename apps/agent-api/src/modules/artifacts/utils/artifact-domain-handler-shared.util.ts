export function callOrExtracted(
  target: Record<string, any>,
  methodName: string,
  extracted: () => Promise<unknown> | unknown,
  data: Record<string, unknown>,
  sessionKey?: string,
  onProgress?: (message: string) => void | Promise<void>,
): Promise<unknown> | unknown {
  if (
    Object.prototype.hasOwnProperty.call(target, methodName) &&
    typeof target[methodName] === 'function'
  ) {
    return target[methodName](data, sessionKey, onProgress)
  }
  return extracted()
}

export function buildDeleteConfirmBlock(input: {
  action: string
  entityType: string
  entityId: string
  entityName: string
}) {
  return {
    type: 'delete_confirm',
    id: `delete-${input.entityType}-${input.entityId}-${Date.now()}`,
    delete_action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId,
    entity_name: input.entityName,
    status: 'pending',
  }
}

export async function tryPersistMissionDeliverable(
  target: Record<string, any>,
  sessionKey: string | undefined,
  entity: {
    type: string
    entityId: string
    entityTable: string
    title: string
    sourceAction: string
  },
): Promise<void> {
  try {
    if (!sessionKey || !target.isMissionSessionKey(sessionKey)) return
    const userId = target.resolveUserId(sessionKey)
    const { missionId, campaignId, orgId } = await target.resolveMissionContext(sessionKey, userId)
    const agentKey = target.parseAgentIdFromSessionKey(sessionKey) ?? 'unknown'
    const subtaskId = parseMissionSubtaskId(sessionKey)
    await target.persistMissionDeliverable({
      missionId,
      userId,
      campaignId,
      orgId,
      agentKey,
      type: entity.type,
      title: entity.title,
      sourceAction: entity.sourceAction,
      content: null,
      metadata: {
        entity_id: entity.entityId,
        entity_table: entity.entityTable,
        ...(subtaskId ? { subtask_id: subtaskId } : {}),
      },
      idempotencyKey: `mission:${missionId}:${entity.entityTable}:${entity.entityId}`,
    })
  } catch (err) {
    console.error(
      `[mission_deliverable_failed] action=${entity.sourceAction} entity=${entity.entityTable}:${entity.entityId}`,
      err,
    )
  }
}

function parseMissionSubtaskId(sessionKey: string): string | null {
  const base = sessionKey.split('::', 1)[0] ?? ''
  const parts = base.split(':')
  const modeIndex = parts.findIndex((part, index) => index >= 2 && part === 'subtask')
  if (modeIndex < 0) return null
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const candidates = parts.slice(modeIndex + 1).filter((part) => uuidPattern.test(part))
  return candidates.at(-1) ?? null
}
