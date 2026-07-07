import { createHash } from 'crypto'
import { ArtifactDocumentFilesRepository } from '../repositories/artifact-document-files.repository'

type MissionDeliverableInput = {
  missionId: string
  userId: string
  campaignId: string | null
  orgId?: string | null
  agentKey: string
  type: 'doc' | 'text' | 'image' | 'video' | 'pdf' | 'file'
  title: string
  sourceAction: string
  content?: string | null
  contentJson?: Record<string, unknown> | null
  fileUrl?: string | null
  fileName?: string | null
  fileSize?: number | null
  mimeType?: string | null
  metadata?: Record<string, unknown>
  updateId?: string | null
  idempotencyKey?: string | null
  source?: string
}

type PersistedMissionDeliverable = {
  success: true
  id: string
  deliverable_id: string
  type: string
  title: string
  file_url: string | null
  file_name: string | null
  metadata: Record<string, unknown>
}

export class ArtifactDocumentMissionDeliverablesService {
  constructor(private readonly documentFilesRepository: ArtifactDocumentFilesRepository) {}

  async saveMissionDocument(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey: string,
    userId: string,
  ): Promise<{ persisted: PersistedMissionDeliverable; orgId: string | null }> {
    const { missionId, campaignId, orgId } = await this.resolveMissionContextCompat(
      target,
      sessionKey,
      userId,
    )
    const agentKey = target.parseAgentIdFromSessionKey(sessionKey) ?? 'unknown'
    const title = String(input.title).trim()
    const contentValue = input.content
    const contentText = this.stringifyDeliverableContent(contentValue)
    const existingDeliverableId =
      typeof input.deliverable_id === 'string' && input.deliverable_id.trim().length > 0
        ? input.deliverable_id.trim()
        : null
    const sessionInfo = this.parseMissionSessionInfo(sessionKey)
    const idempotencyKey =
      this.buildMissionDeliverableIdempotencyKey({
        missionId,
        subtaskId: sessionInfo.subtaskId,
        agentKey,
        sourceAction: 'save_document',
        title,
        logicalSlot: String((input.document_type as string) ?? 'doc'),
      }) ?? null

    const persisted = await this.persistMissionDeliverableCompat(target, {
      missionId,
      userId,
      campaignId,
      orgId,
      agentKey,
      type: 'doc',
      title: title || 'Mission Deliverable',
      sourceAction: 'save_document',
      content: contentText,
      contentJson:
        contentValue && typeof contentValue === 'object' && !Array.isArray(contentValue)
          ? (contentValue as Record<string, unknown>)
          : null,
      metadata: {
        document_type: (input.document_type as string) ?? 'upload',
      },
      updateId: existingDeliverableId,
      idempotencyKey,
    })
    await this.appendSubtaskExecutionReceipt(target, {
      sessionKey,
      missionId,
      userId,
      action: 'save_document',
      receipt: persisted as Record<string, unknown>,
    })
    return { persisted, orgId }
  }

  stringifyDeliverableContent(value: unknown): string {
    if (typeof value === 'string') return value
    if (value == null) return ''
    try {
      return JSON.stringify(value, null, 2)
    } catch {
      return String(value)
    }
  }

  private async resolveMissionContextCompat(
    target: Record<string, any>,
    sessionKey: string,
    userId: string,
  ): Promise<{ missionId: string; campaignId: string | null; orgId: string | null }> {
    if (typeof target.resolveMissionContext === 'function') {
      const result = await target.resolveMissionContext(sessionKey, userId)
      return { ...result, orgId: result.orgId ?? null }
    }
    return this.resolveMissionContext(target, sessionKey, userId)
  }

  private async resolveMissionContext(
    target: Record<string, any>,
    sessionKey: string,
    userId: string,
  ): Promise<{ missionId: string; campaignId: string | null; orgId: string | null }> {
    const missionId = await this.resolveMissionIdForSession(target, sessionKey, userId)
    if (!missionId) {
      throw new Error('mission_id required via mission session key')
    }
    const { data: mission, error } = await this.documentFilesRepository.findMission(
      target.serviceClient,
      missionId,
    )
    if (error) throw error
    if (!mission || String(mission.user_id ?? '') !== userId) {
      throw new Error('Mission not found for session')
    }
    return {
      missionId: String(mission.id),
      campaignId: (mission.campaign_id as string | null) ?? null,
      orgId: (mission.org_id as string | null) ?? null,
    }
  }

  private async resolveMissionIdForSession(
    target: Record<string, any>,
    sessionKey: string,
    userId: string,
  ): Promise<string | null> {
    if (!sessionKey) return null
    let base = sessionKey
    const dblIdx = base.indexOf('::')
    if (dblIdx !== -1) base = base.substring(0, dblIdx)
    const parts = base.split(':')
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const modeIdx = parts.findIndex(
      (p, i) => i >= 2 && (p === 'mission' || p === 'subtask' || p === 'state' || p === 'eval'),
    )
    const mode = modeIdx !== -1 ? parts[modeIdx] : parts[2]

    if (mode === 'mission') {
      const idIdx = modeIdx !== -1 ? modeIdx + 3 : 5
      const missionId = parts[idIdx] ?? ''
      return uuidPattern.test(missionId) ? missionId : null
    }

    if (mode === 'subtask') {
      const idIdx = modeIdx !== -1 ? modeIdx + 3 : 5
      const subtaskId = parts[idIdx] ?? ''
      if (!uuidPattern.test(subtaskId)) return null
      const { data, error } = await this.documentFilesRepository.findSubtaskMission(
        target.serviceClient,
        subtaskId,
      )
      if (error) throw error
      if (!data || String(data.user_id ?? '') !== userId) return null
      const missionId = String(data.mission_id ?? '')
      return uuidPattern.test(missionId) ? missionId : null
    }

    const fallbackId = target.parseConversationId(sessionKey) ?? ''
    return uuidPattern.test(fallbackId) ? fallbackId : null
  }

  private async persistMissionDeliverableCompat(
    target: Record<string, any>,
    input: MissionDeliverableInput,
  ): Promise<PersistedMissionDeliverable> {
    if (
      Object.prototype.hasOwnProperty.call(target, 'persistMissionDeliverable') &&
      typeof target.persistMissionDeliverable === 'function'
    ) {
      return target.persistMissionDeliverable(input)
    }
    return this.persistMissionDeliverable(target, input)
  }

  private async persistMissionDeliverable(
    target: Record<string, any>,
    input: MissionDeliverableInput,
  ): Promise<PersistedMissionDeliverable> {
    const normalizedMetadata: Record<string, unknown> = {
      ...(input.metadata ?? {}),
      source: 'agent_tool',
      source_action: input.sourceAction,
      agent_key: input.agentKey,
    }
    const payload: Record<string, unknown> = {
      mission_id: input.missionId,
      user_id: input.userId,
      campaign_id: input.campaignId,
      agent_key: input.agentKey,
      type: input.type,
      title: input.title,
      content: input.content ?? null,
      content_json: input.contentJson ?? null,
      file_url: input.fileUrl ?? null,
      file_name: input.fileName ?? null,
      file_size: input.fileSize ?? null,
      mime_type: input.mimeType ?? null,
      source_action: input.sourceAction,
      generation_status:
        typeof normalizedMetadata.media_generation_status === 'string'
          ? normalizedMetadata.media_generation_status
          : null,
      generation_job_id:
        typeof normalizedMetadata.media_job_id === 'string'
          ? normalizedMetadata.media_job_id
          : null,
      idempotency_key: input.idempotencyKey ?? null,
      source: input.source ?? 'mission',
      metadata: normalizedMetadata,
      org_id: input.orgId ?? null,
    }

    const { data, error } = await this.documentFilesRepository.saveMissionDeliverable(
      target.serviceClient,
      {
        payload,
        updateId: input.updateId,
        idempotencyKey: input.idempotencyKey,
        missionId: input.missionId,
        userId: input.userId,
      },
    )
    if (error) throw error

    const deliverableId = String(data.id)
    target.logger.log(
      `[mission_deliverable] source_action=${input.sourceAction} mission=${input.missionId} deliverable=${deliverableId} type=${data.type}`,
    )

    return {
      success: true,
      id: deliverableId,
      deliverable_id: deliverableId,
      type: String(data.type),
      title: String(data.title),
      file_url: (data.file_url as string | null) ?? null,
      file_name: (data.file_name as string | null) ?? null,
      metadata: (data.metadata as Record<string, unknown>) ?? {},
    }
  }

  private parseMissionSessionInfo(sessionKey: string): {
    missionId: string | null
    subtaskId: string | null
  } {
    if (!sessionKey) return { missionId: null, subtaskId: null }
    let base = sessionKey
    const dblIdx = base.indexOf('::')
    if (dblIdx !== -1) base = base.substring(0, dblIdx)
    const parts = base.split(':')
    const modeIdx = parts.findIndex(
      (p, i) => i >= 2 && (p === 'mission' || p === 'subtask' || p === 'state' || p === 'eval'),
    )
    const mode = modeIdx !== -1 ? parts[modeIdx] : parts[2]
    const id = parts[modeIdx !== -1 ? modeIdx + 3 : 5] ?? ''
    if (mode === 'mission') return { missionId: id || null, subtaskId: null }
    if (mode === 'subtask') return { missionId: null, subtaskId: id || null }
    return { missionId: null, subtaskId: null }
  }

  private buildMissionDeliverableIdempotencyKey(input: {
    missionId: string
    subtaskId: string | null
    agentKey: string
    sourceAction: 'save_document' | 'create_pdf'
    title: string
    logicalSlot: string
  }): string | null {
    if (!input.missionId) return null
    const titleFingerprint = createHash('sha1')
      .update(input.title.trim().toLowerCase())
      .digest('hex')
      .slice(0, 12)
    const slot =
      input.logicalSlot
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, '-') || 'default'
    const subtaskPart = input.subtaskId || 'none'
    return [
      'mission',
      input.missionId,
      'subtask',
      subtaskPart,
      'agent',
      input.agentKey,
      'action',
      input.sourceAction,
      'slot',
      slot,
      'title',
      titleFingerprint,
    ].join(':')
  }

  private async appendSubtaskExecutionReceipt(
    target: Record<string, any>,
    input: {
      sessionKey: string
      missionId: string
      userId: string
      action: 'save_document' | 'create_pdf'
      receipt: Record<string, unknown>
    },
  ): Promise<void> {
    if (!input.sessionKey || !input.sessionKey.includes(':subtask:')) return
    const sessionInfo = this.parseMissionSessionInfo(input.sessionKey)
    const subtaskId = sessionInfo.subtaskId
    if (!subtaskId) return

    const nowIso = new Date().toISOString()
    const { data: subtask, error: readError } =
      await this.documentFilesRepository.findSubtaskExecutionState(target.serviceClient, {
        subtaskId,
        missionId: input.missionId,
        userId: input.userId,
      })
    if (readError || !subtask) return

    const existingState =
      subtask.execution_state && typeof subtask.execution_state === 'object'
        ? (subtask.execution_state as Record<string, unknown>)
        : {}
    const existingCompleted = Array.isArray(existingState.completed_actions)
      ? (existingState.completed_actions as Array<Record<string, unknown>>)
      : []
    const deliverableId =
      typeof input.receipt.deliverable_id === 'string'
        ? input.receipt.deliverable_id
        : typeof input.receipt.id === 'string'
          ? input.receipt.id
          : null
    const alreadyExists =
      !!deliverableId &&
      existingCompleted.some((row) => {
        const rowAction = typeof row.action === 'string' ? row.action : ''
        const rowDeliverableId = typeof row.deliverable_id === 'string' ? row.deliverable_id : ''
        return rowAction === input.action && rowDeliverableId === deliverableId
      })
    if (alreadyExists) return

    const nextCompleted = [
      ...existingCompleted,
      {
        action: input.action,
        deliverable_id: deliverableId,
        type: input.receipt.type ?? null,
        title: input.receipt.title ?? null,
        file_url: input.receipt.file_url ?? null,
        file_name: input.receipt.file_name ?? null,
        created_at: nowIso,
      },
    ]
    const nextState: Record<string, unknown> = {
      ...existingState,
      completed_actions: nextCompleted,
      last_checkpoint_at: nowIso,
    }
    await this.documentFilesRepository.updateSubtaskExecutionState(target.serviceClient, {
      subtaskId,
      missionId: input.missionId,
      userId: input.userId,
      executionState: nextState,
      updatedAt: nowIso,
    })
  }
}
