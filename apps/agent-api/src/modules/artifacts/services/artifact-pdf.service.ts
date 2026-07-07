import { createHash } from 'crypto'
import { Injectable } from '@nestjs/common'
import { buildStorageAssetRef, type StorageAssetRef } from '@vibey/api-shared'
import type { ArtifactActionHandler } from './artifact-action.registry'
import { ArtifactDocumentFilesRepository } from '../repositories/artifact-document-files.repository'
import { ArtifactPdfRenderService } from './artifact-pdf-render.service'
import { createSpaceDocItem, getActiveSpaceId } from './artifact-space-scope'
import { ensureSpaceView } from './ensure-space-view'

@Injectable()
export class ArtifactPdfService {
  private readonly renderer = new ArtifactPdfRenderService()

  constructor(
    private readonly documentFilesRepository: ArtifactDocumentFilesRepository = new ArtifactDocumentFilesRepository(),
  ) {}

  getHandlers(target: Record<string, any>): Record<string, ArtifactActionHandler> {
    return {
      create_pdf: (data, sessionKey) => this.createPdf(target, data, sessionKey),
    }
  }

  private async createPdf(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    if (!input.title || !input.content) {
      return { success: false, error: 'title and content are required' }
    }

    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const isMissionSession = target.isMissionSessionKey(sessionKey ?? '')
    const missionContext = isMissionSession
      ? await this.resolveMissionContextCompat(target, sessionKey ?? '', userId)
      : null
    const campaignId = missionContext
      ? missionContext.campaignId
      : await target.resolveCampaignId(supabase, input, userId, sessionKey)
    const rawConversationId = target.parseConversationId(sessionKey ?? '')
    if (!isMissionSession && !rawConversationId) {
      return { success: false, error: 'conversation_id required via valid session key' }
    }
    let conversationId: string | null = rawConversationId
    if (rawConversationId && !isMissionSession) {
      const { data: convExists } = await this.documentFilesRepository.findConversation(
        supabase,
        rawConversationId,
      )
      if (!convExists) conversationId = null
    }
    const title = String(input.title).trim()
    const rawContent = String(input.content)
    const contentFormat = this.renderer.detectHtmlContent(
      rawContent,
      this.renderer.normalizePdfContentFormat(input.content_format),
    )
    const imageUrls = this.renderer.normalizePdfImageUrls(input.image_urls)
    const layout = this.renderer.normalizePdfLayout(input.page_format)
    const padding = this.renderer.normalizePdfPadding(input.padding, layout)
    const theme = this.renderer.normalizePdfTheme(input.brand_theme)
    const pdfBytes = await this.generateStyledPdfBytesCompat(target, {
      title,
      content: rawContent,
      contentFormat,
      imageUrls,
      layout,
      padding,
      theme,
    })

    const fileName = this.renderer.normalizePdfFileName(input.file_name, title)
    const uploaded = await this.uploadPdfBytesCompat(target, pdfBytes, fileName, userId)
    if (!uploaded.success || !uploaded.url) {
      return { success: false, error: uploaded.error ?? 'Failed to upload PDF' }
    }
    const orgId =
      missionContext?.orgId ??
      (typeof target.resolveOrgId === 'function'
        ? ((target.resolveOrgId(sessionKey) as string | null) ?? null)
        : null)
    const assetRef =
      uploaded.asset_ref ??
      this.buildDocumentAssetRef({
        path: uploaded.path,
        url: uploaded.url,
        fileName,
        fileSize: pdfBytes.length,
        mimeType: 'application/pdf',
        userId,
        orgId,
      })

    if (missionContext) {
      const agentKey = target.parseAgentIdFromSessionKey(sessionKey ?? '') ?? 'unknown'
      const sessionInfo = this.parseMissionSessionInfo(sessionKey ?? '')
      const idempotencyKey =
        this.buildMissionDeliverableIdempotencyKey({
          missionId: missionContext.missionId,
          subtaskId: sessionInfo.subtaskId,
          agentKey,
          sourceAction: 'create_pdf',
          title,
          logicalSlot: String((input.document_type as string) ?? 'pdf'),
        }) ?? null
      const persisted = await this.persistMissionDeliverableCompat(target, {
        missionId: missionContext.missionId,
        userId,
        campaignId,
        orgId: missionContext.orgId,
        agentKey,
        type: 'pdf',
        title: title || 'Mission PDF',
        sourceAction: 'create_pdf',
        content: rawContent,
        contentJson: {
          source_format: contentFormat,
          asset_ref: assetRef,
        },
        fileUrl: uploaded.url,
        fileName,
        fileSize: pdfBytes.length,
        mimeType: 'application/pdf',
        metadata: {
          document_type: (input.document_type as string) ?? 'offer',
          source_format: contentFormat,
          asset_ref: assetRef,
        },
        updateId:
          typeof input.deliverable_id === 'string' && input.deliverable_id.trim().length > 0
            ? input.deliverable_id.trim()
            : null,
        idempotencyKey,
      })
      const persistedWithAssetRef =
        persisted && typeof persisted === 'object' && !('asset_ref' in persisted)
          ? { ...persisted, asset_ref: assetRef }
          : persisted
      await this.appendSubtaskExecutionReceipt(target, {
        sessionKey: sessionKey ?? '',
        missionId: missionContext.missionId,
        userId,
        action: 'create_pdf',
        receipt: persistedWithAssetRef as Record<string, unknown>,
      })
      return persistedWithAssetRef
    }

    const { data, error } = await this.documentFilesRepository.createConversationDocument(
      supabase,
      {
        conversation_id: conversationId,
        campaign_id: campaignId,
        title,
        content: {
          type: 'pdf',
          file_url: uploaded.url,
          file_name: fileName,
          asset_ref: assetRef,
          source_content: rawContent,
          source_format: contentFormat,
        },
        document_type: (input.document_type as string) ?? 'offer',
      },
    )
    if (error) throw error

    const spaceId = getActiveSpaceId(input)
    let spaceItemId: string | null = null
    if (spaceId) {
      const orgId =
        typeof target.resolveOrgId === 'function'
          ? ((target.resolveOrgId(sessionKey) as string | null) ?? null)
          : null
      const documentType = (input.document_type as string) ?? 'pdf'
      const spaceDoc = await createSpaceDocItem(supabase, {
        spaceId,
        userId,
        orgId,
        title,
        docBody: rawContent,
        documentType,
        sourceId: String(data.id),
        conversationDocumentId: String(data.id),
        fileUrl: uploaded.url,
        fileName,
        mimeType: 'application/pdf',
        fieldInput: input,
      })
      spaceItemId = spaceDoc.id
      await ensureSpaceView({
        supabase,
        spaceId,
        campaignId,
        viewType: 'docs',
        logger: target.logger,
      })
    }

    return {
      success: true,
      asset_ref: assetRef,
      file_url: uploaded.url,
      file_name: fileName,
      document: data,
      ui_blocks: [
        {
          type: 'document_card',
          id: `document-${data.id}`,
          title,
          documentId: data.id,
          spaceId: spaceId ?? undefined,
          spaceItemId: spaceItemId ?? undefined,
          snippet: rawContent.slice(0, 200),
        },
      ],
    }
  }

  private async generateStyledPdfBytesCompat(
    target: Record<string, any>,
    input: {
      title: string
      content: string
      contentFormat: 'markdown' | 'text' | 'html'
      imageUrls: string[]
      layout: 'A4' | '16:9'
      padding: number
      theme: { primary: string; accent: string; text: string; muted: string; background: string }
    },
  ): Promise<Uint8Array> {
    if (
      Object.prototype.hasOwnProperty.call(target, 'generateStyledPdfBytes') &&
      typeof target.generateStyledPdfBytes === 'function'
    ) {
      return target.generateStyledPdfBytes(input)
    }
    return this.renderer.generateStyledPdfBytes(input)
  }

  private async uploadPdfBytesCompat(
    target: Record<string, any>,
    pdfBytes: Uint8Array,
    fileName: string,
    userId: string,
  ): Promise<{
    success: boolean
    url?: string
    path?: string
    asset_ref?: StorageAssetRef
    error?: string
  }> {
    if (
      Object.prototype.hasOwnProperty.call(target, 'uploadPdfBytes') &&
      typeof target.uploadPdfBytes === 'function'
    ) {
      return target.uploadPdfBytes(pdfBytes, fileName, userId)
    }
    return this.uploadPdfBytes(target, pdfBytes, fileName, userId)
  }

  private async resolveMissionContextCompat(
    target: Record<string, any>,
    sessionKey: string,
    userId: string,
  ): Promise<{ missionId: string; campaignId: string | null; orgId: string | null }> {
    if (
      Object.prototype.hasOwnProperty.call(target, 'resolveMissionContext') &&
      typeof target.resolveMissionContext === 'function'
    ) {
      const result = await target.resolveMissionContext(sessionKey, userId)
      return { ...result, orgId: result.orgId ?? null }
    }
    const missionId = await this.resolveMissionIdForSession(target, sessionKey, userId)
    if (!missionId) {
      throw new Error('mission_id required via mission session key')
    }
    const { data: mission, error } = await this.documentFilesRepository.findMission(
      target.serviceClient,
      missionId,
    )
    if (error) throw error
    if (!mission || String(mission.user_id ?? '') !== userId)
      throw new Error('Mission not found for session')
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
    const base = sessionKey.includes('::campaign:')
      ? sessionKey.split('::campaign:')[0]
      : sessionKey
    const parts = base.split(':')
    const mode = parts[2]
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

    if (mode === 'mission') {
      const missionId = parts[5] ?? ''
      return uuidPattern.test(missionId) ? missionId : null
    }
    if (mode === 'subtask') {
      const subtaskId = parts[5] ?? ''
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
    input: {
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
    },
  ) {
    if (
      Object.prototype.hasOwnProperty.call(target, 'persistMissionDeliverable') &&
      typeof target.persistMissionDeliverable === 'function'
    ) {
      return target.persistMissionDeliverable(input)
    }
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
    }
    payload.org_id = input.orgId ?? null
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
      asset_ref: normalizedMetadata.asset_ref ?? null,
    }
  }

  private parseMissionSessionInfo(sessionKey: string): {
    missionId: string | null
    subtaskId: string | null
  } {
    if (!sessionKey) return { missionId: null, subtaskId: null }
    const base = sessionKey.includes('::campaign:')
      ? sessionKey.split('::campaign:')[0]
      : sessionKey
    const parts = base.split(':')
    const mode = parts[2]
    const id = parts[5] ?? ''
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

  private async uploadPdfBytes(
    target: Record<string, any>,
    pdfBytes: Uint8Array,
    fileName: string,
    userId: string,
  ): Promise<{ success: boolean; url?: string; path?: string; error?: string }> {
    return this.documentFilesRepository.uploadFileBytes(target.serviceClient, {
      bytes: pdfBytes,
      fileName,
      userId,
      mimeType: 'application/pdf',
    })
  }

  private buildDocumentAssetRef(input: {
    path?: string
    url: string
    fileName: string
    fileSize: number
    mimeType: string
    userId: string
    orgId: string | null
  }): StorageAssetRef {
    return buildStorageAssetRef({
      bucket_name: 'media',
      file_path: input.path ?? `${input.userId}/documents/${input.fileName}`,
      url: input.url,
      mime_type: input.mimeType,
      name: input.fileName,
      original_filename: input.fileName,
      file_size: input.fileSize,
      user_id: input.userId,
      org_id: input.orgId,
      source: 'generated',
      source_surface: 'agent_generated_document',
    })
  }
}
