import { Injectable, Logger } from '@nestjs/common'
import type { ChatScope, ChatScopeKind } from '@vibey/api-shared'

const CHAT_SCOPE_KINDS = [
  'personal',
  'campaign',
  'shared_space',
  'channel',
  'mission',
  'unknown',
] as const

function normalizeChatScopeKind(value: unknown): ChatScopeKind {
  return CHAT_SCOPE_KINDS.includes(value as ChatScopeKind) ? (value as ChatScopeKind) : 'unknown'
}

function normalizeScopeId(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

/**
 * RequestContextService
 *
 * In-memory store for the active conversation context on this machine.
 * Solves the "campaign_id gap": chat.service knows the campaignId but
 * can't pass it through the OpenClaw gateway to the tool plugin.
 *
 * Flow:
 *   1. chat.service sets context BEFORE calling OpenClaw
 *   2. Tool plugin calls back to artifacts endpoint on localhost
 *   3. artifacts.service reads context from here (same process)
 *   4. chat.service clears context AFTER streaming ends
 *
 * Each fly machine = one user, so userId from env is the key.
 * Entries auto-expire after 5 minutes as a safety net.
 */

export interface ChannelMemberContext {
  id?: string
  platform_id: string
  display_name: string
  username?: string
  notes?: Array<{ content: string; saved_at: string }>
}

export interface RequestUploadAttachment {
  filename: string
  fileUrl: string
  mimeType?: string
  type?: 'text' | 'image' | 'video' | 'audio' | 'file'
  mediaAssetId?: string
  sizeBytes?: number
}

export interface AgentCheckpointSnapshot {
  definitions: Array<{ file_name: string; content: string }>
  skills: Array<{
    skill_key: string
    name: string
    description: string
    markdown_content: string
    is_enabled: boolean
  }>
}

export interface AgentCheckpointMutation {
  agentKey: string
  summaries: string[]
  preSnapshot: AgentCheckpointSnapshot | null
}

export type ActiveArtifactSource =
  | 'ui_selected'
  | 'user_attached'
  | 'created_in_conversation'
  | 'recent_history'

export interface ActiveArtifact {
  type: string
  id: string
  label?: string
  campaign_id?: string | null
  parent?: { type: string; id: string } | null
  source: ActiveArtifactSource
  updated_at: number
}

export interface ActiveWorkingSet {
  byType: Record<string, ActiveArtifact[]>
  lastTouched: ActiveArtifact | null
}

export type ActiveFlowBuildMode = 'create' | 'update'

export interface ActiveFlowBuild {
  sessionId: string
  spaceId: string
  mode: ActiveFlowBuildMode
  targetAutomationId?: string | null
  updated_at: number
}

interface RequestContext {
  userId: string
  conversationId: string
  campaignId: string | null
  spaceId: string | null
  scopeKind: ChatScopeKind
  orgId: string | null
  accessToken: string
  refreshToken: string | null
  modelId: string | null
  channel: 'telegram' | 'slack' | 'studio'
  channelMember: ChannelMemberContext | null
  agentMessageId: string | null
  agentCheckpointMutations: Map<string, AgentCheckpointMutation>
  uploadedAttachments: RequestUploadAttachment[]
  activeWorkingSet: ActiveWorkingSet
  activeFlowBuild: ActiveFlowBuild | null
  createdAt: number
}

// Tool calls can happen several minutes after chat starts; keep context alive
// long enough for agentic runs while still expiring eventually if not cleared.
const TTL_MS = 30 * 60 * 1000

function emptyActiveWorkingSet(): ActiveWorkingSet {
  return { byType: {}, lastTouched: null }
}

function cloneActiveArtifact(artifact: ActiveArtifact): ActiveArtifact {
  return {
    type: artifact.type,
    id: artifact.id,
    ...(artifact.label !== undefined ? { label: artifact.label } : {}),
    ...(artifact.campaign_id !== undefined ? { campaign_id: artifact.campaign_id } : {}),
    parent: artifact.parent ? { type: artifact.parent.type, id: artifact.parent.id } : null,
    source: artifact.source,
    updated_at: artifact.updated_at,
  }
}

function cloneActiveWorkingSet(workingSet: ActiveWorkingSet): ActiveWorkingSet {
  const byType: Record<string, ActiveArtifact[]> = {}
  for (const [type, artifacts] of Object.entries(workingSet.byType)) {
    byType[type] = artifacts.map(cloneActiveArtifact)
  }
  return {
    byType,
    lastTouched: workingSet.lastTouched ? cloneActiveArtifact(workingSet.lastTouched) : null,
  }
}

function normalizeActiveArtifact(input: ActiveArtifact): ActiveArtifact | null {
  const type = normalizeScopeId(input.type)
  const id = normalizeScopeId(input.id)
  if (!type || !id) return null
  return {
    type,
    id,
    ...(typeof input.label === 'string' && input.label.trim().length > 0
      ? { label: input.label.trim() }
      : {}),
    campaign_id: normalizeScopeId(input.campaign_id),
    parent:
      input.parent && normalizeScopeId(input.parent.type) && normalizeScopeId(input.parent.id)
        ? {
            type: normalizeScopeId(input.parent.type)!,
            id: normalizeScopeId(input.parent.id)!,
          }
        : null,
    source: input.source,
    updated_at: Number.isFinite(input.updated_at) ? input.updated_at : Date.now(),
  }
}

function cloneUploadedAttachment(attachment: RequestUploadAttachment): RequestUploadAttachment {
  return {
    filename: attachment.filename,
    fileUrl: attachment.fileUrl,
    ...(attachment.mimeType !== undefined ? { mimeType: attachment.mimeType } : {}),
    ...(attachment.type !== undefined ? { type: attachment.type } : {}),
    ...(attachment.mediaAssetId !== undefined ? { mediaAssetId: attachment.mediaAssetId } : {}),
    ...(attachment.sizeBytes !== undefined ? { sizeBytes: attachment.sizeBytes } : {}),
  }
}

function normalizeUploadedAttachments(
  attachments: RequestUploadAttachment[] | null | undefined,
): RequestUploadAttachment[] {
  if (!Array.isArray(attachments)) return []
  return attachments
    .map((attachment) => {
      const filename = normalizeScopeId(attachment.filename)
      const fileUrl = normalizeScopeId(attachment.fileUrl)
      if (!filename || !fileUrl) return null
      return {
        filename,
        fileUrl,
        ...(typeof attachment.mimeType === 'string' && attachment.mimeType.trim()
          ? { mimeType: attachment.mimeType.trim() }
          : {}),
        ...(attachment.type ? { type: attachment.type } : {}),
        ...(typeof attachment.mediaAssetId === 'string' && attachment.mediaAssetId.trim()
          ? { mediaAssetId: attachment.mediaAssetId.trim() }
          : {}),
        ...(typeof attachment.sizeBytes === 'number' && Number.isFinite(attachment.sizeBytes)
          ? { sizeBytes: attachment.sizeBytes }
          : {}),
      } satisfies RequestUploadAttachment
    })
    .filter((attachment): attachment is RequestUploadAttachment => attachment !== null)
}

function cloneActiveFlowBuild(build: ActiveFlowBuild): ActiveFlowBuild {
  return {
    sessionId: build.sessionId,
    spaceId: build.spaceId,
    mode: build.mode,
    targetAutomationId: build.targetAutomationId ?? null,
    updated_at: build.updated_at,
  }
}

function normalizeActiveFlowBuild(input: {
  sessionId?: string | null
  spaceId?: string | null
  mode?: string | null
  targetAutomationId?: string | null
  updated_at?: number
}): ActiveFlowBuild | null {
  const sessionId = normalizeScopeId(input.sessionId)
  const spaceId = normalizeScopeId(input.spaceId)
  if (!sessionId || !spaceId) return null
  return {
    sessionId,
    spaceId,
    mode: input.mode === 'update' ? 'update' : 'create',
    targetAutomationId: normalizeScopeId(input.targetAutomationId),
    updated_at: Number.isFinite(input.updated_at) ? input.updated_at! : Date.now(),
  }
}

@Injectable()
export class RequestContextService {
  private readonly logger = new Logger(RequestContextService.name)
  /**
   * Context must be per-conversation (not just per-user), otherwise concurrent
   * conversations for the same user will overwrite each other.
   */
  private readonly contextsByConversationId = new Map<string, RequestContext>()

  set(
    conversationId: string,
    userId: string,
    campaignId: string | null,
    accessToken: string,
    refreshToken: string | null,
    modelId?: string | null,
    orgId?: string | null,
    channel?: 'telegram' | 'slack' | 'studio',
    channelMember?: ChannelMemberContext | null,
    spaceId?: string | null,
    scopeKind?: ChatScopeKind,
    agentMessageId?: string | null,
    uploadedAttachments?: RequestUploadAttachment[] | null,
  ): void {
    const existing = this.contextsByConversationId.get(conversationId)
    const normalizedSpaceId =
      spaceId === undefined ? (existing?.spaceId ?? null) : normalizeScopeId(spaceId)
    const normalizedScopeKind = normalizeChatScopeKind(scopeKind ?? existing?.scopeKind)
    const activeFlowBuild =
      existing?.activeFlowBuild &&
      (!normalizedSpaceId || existing.activeFlowBuild.spaceId === normalizedSpaceId)
        ? cloneActiveFlowBuild(existing.activeFlowBuild)
        : null
    const normalizedUploadedAttachments =
      uploadedAttachments === undefined
        ? (existing?.uploadedAttachments.map(cloneUploadedAttachment) ?? [])
        : normalizeUploadedAttachments(uploadedAttachments)
    this.contextsByConversationId.set(conversationId, {
      userId,
      conversationId,
      campaignId,
      spaceId: normalizedSpaceId,
      scopeKind: normalizedScopeKind,
      orgId: orgId ?? null,
      accessToken,
      refreshToken,
      modelId: modelId ?? null,
      channel: channel ?? 'studio',
      channelMember: channelMember ?? null,
      agentMessageId:
        agentMessageId === undefined
          ? (existing?.agentMessageId ?? null)
          : normalizeScopeId(agentMessageId),
      agentCheckpointMutations:
        existing?.agentCheckpointMutations ?? new Map<string, AgentCheckpointMutation>(),
      uploadedAttachments: normalizedUploadedAttachments,
      activeWorkingSet: existing?.activeWorkingSet
        ? cloneActiveWorkingSet(existing.activeWorkingSet)
        : emptyActiveWorkingSet(),
      activeFlowBuild,
      createdAt: Date.now(),
    })
    this.logger.debug(
      `[Context] Set: userId=${userId} conversationId=${conversationId} campaignId=${campaignId ?? 'null'} spaceId=${normalizedSpaceId ?? 'null'} scopeKind=${normalizedScopeKind} orgId=${orgId ?? 'null'} channel=${channel ?? 'studio'}`,
    )
  }

  get(conversationId: string): RequestContext | null {
    const ctx = this.contextsByConversationId.get(conversationId)
    if (!ctx) return null
    if (Date.now() - ctx.createdAt > TTL_MS) {
      this.contextsByConversationId.delete(conversationId)
      return null
    }
    // Sliding TTL: as long as the conversation keeps making tool calls,
    // keep the context alive until chat.service clears it in finally.
    ctx.createdAt = Date.now()
    return ctx
  }

  getScope(conversationId: string): ChatScope | null {
    const ctx = this.get(conversationId)
    if (!ctx) return null
    return {
      space_id: ctx.spaceId,
      campaign_id: ctx.campaignId,
      scope_kind: ctx.scopeKind,
      org_id: ctx.orgId,
    }
  }

  getAgentMessageId(conversationId: string): string | null {
    return this.get(conversationId)?.agentMessageId ?? null
  }

  getUploadedAttachments(conversationId: string): RequestUploadAttachment[] {
    return (this.get(conversationId)?.uploadedAttachments ?? []).map(cloneUploadedAttachment)
  }

  clear(conversationId: string): void {
    this.contextsByConversationId.delete(conversationId)
  }

  setActiveArtifact(conversationId: string, artifact: ActiveArtifact): void {
    const ctx = this.get(conversationId)
    if (!ctx) return
    const normalized = normalizeActiveArtifact(artifact)
    if (!normalized) return
    const existingByType = ctx.activeWorkingSet.byType[normalized.type] ?? []
    const nextByType = [
      normalized,
      ...existingByType.filter((item) => item.id !== normalized.id),
    ].sort((a, b) => b.updated_at - a.updated_at)
    ctx.activeWorkingSet.byType = {
      ...ctx.activeWorkingSet.byType,
      [normalized.type]: nextByType,
    }
    ctx.activeWorkingSet.lastTouched = normalized
  }

  getActiveByType(conversationId: string, type: string): ActiveArtifact[] {
    const ctx = this.get(conversationId)
    const normalizedType = normalizeScopeId(type)
    if (!ctx || !normalizedType) return []
    return (ctx.activeWorkingSet.byType[normalizedType] ?? []).map(cloneActiveArtifact)
  }

  getLastTouched(conversationId: string): ActiveArtifact | null {
    const lastTouched = this.get(conversationId)?.activeWorkingSet.lastTouched ?? null
    return lastTouched ? cloneActiveArtifact(lastTouched) : null
  }

  getActiveWorkingSet(conversationId: string): ActiveWorkingSet {
    const ctx = this.get(conversationId)
    return ctx ? cloneActiveWorkingSet(ctx.activeWorkingSet) : emptyActiveWorkingSet()
  }

  replaceActiveWorkingSet(conversationId: string, workingSet: ActiveWorkingSet): void {
    const ctx = this.get(conversationId)
    if (!ctx) return
    const next = emptyActiveWorkingSet()
    for (const artifacts of Object.values(workingSet.byType)) {
      for (const artifact of artifacts) {
        const normalized = normalizeActiveArtifact(artifact)
        if (!normalized) continue
        const existing = next.byType[normalized.type] ?? []
        next.byType[normalized.type] = [
          normalized,
          ...existing.filter((item) => item.id !== normalized.id),
        ].sort((a, b) => b.updated_at - a.updated_at)
      }
    }
    if (workingSet.lastTouched) {
      next.lastTouched = normalizeActiveArtifact(workingSet.lastTouched)
    }
    ctx.activeWorkingSet = next
  }

  clearActive(conversationId: string): void {
    const ctx = this.get(conversationId)
    if (!ctx) return
    ctx.activeWorkingSet = emptyActiveWorkingSet()
  }

  setActiveFlowBuild(
    conversationId: string,
    input: {
      sessionId?: string | null
      spaceId?: string | null
      mode?: ActiveFlowBuildMode | null
      targetAutomationId?: string | null
      updated_at?: number
    },
  ): void {
    const ctx = this.get(conversationId)
    if (!ctx) return
    const normalized = normalizeActiveFlowBuild(input)
    if (!normalized) return
    ctx.activeFlowBuild = normalized
  }

  getActiveFlowBuild(conversationId: string): ActiveFlowBuild | null {
    const active = this.get(conversationId)?.activeFlowBuild ?? null
    return active ? cloneActiveFlowBuild(active) : null
  }

  clearActiveFlowBuild(conversationId: string): void {
    const ctx = this.get(conversationId)
    if (!ctx) return
    ctx.activeFlowBuild = null
  }

  recordAgentCheckpointMutation(
    conversationId: string,
    agentKey: string,
    summary: string,
    preSnapshot: AgentCheckpointSnapshot | null,
  ): void {
    const ctx = this.get(conversationId)
    if (!ctx) return
    const normalizedAgentKey = agentKey
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
    if (!normalizedAgentKey) return
    const cleanSummary = summary.trim() || 'Updated agent identity'
    const existing = ctx.agentCheckpointMutations.get(normalizedAgentKey)
    if (existing) {
      existing.summaries.push(cleanSummary)
      if (!existing.preSnapshot && preSnapshot) existing.preSnapshot = preSnapshot
      return
    }
    ctx.agentCheckpointMutations.set(normalizedAgentKey, {
      agentKey: normalizedAgentKey,
      summaries: [cleanSummary],
      preSnapshot,
    })
  }

  drainAgentCheckpointMutations(conversationId: string): AgentCheckpointMutation[] {
    const ctx = this.get(conversationId)
    if (!ctx || ctx.agentCheckpointMutations.size === 0) return []
    const mutations = Array.from(ctx.agentCheckpointMutations.values()).map((mutation) => ({
      agentKey: mutation.agentKey,
      summaries: [...mutation.summaries],
      preSnapshot: mutation.preSnapshot,
    }))
    ctx.agentCheckpointMutations.clear()
    return mutations
  }
}
