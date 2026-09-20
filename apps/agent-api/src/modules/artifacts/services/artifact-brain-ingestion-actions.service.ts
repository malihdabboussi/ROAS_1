import { Injectable } from '@nestjs/common'
import { temporalInsertFields } from '@vibey/api-shared'
import { ArtifactBrainAccessService } from './artifact-brain-access.service'

const MEETING_PROVIDERS = new Set(['fathom', 'fireflies', 'read_ai'])

@Injectable()
export class ArtifactBrainIngestionActionsService {
  constructor(
    private readonly brainAccessService: ArtifactBrainAccessService = new ArtifactBrainAccessService(),
  ) {}

  async triggerCrystallization(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const brainCheck = this.brainAccessService.validateBrainTarget(
      sessionKey,
      ['user'],
      'crystallize_user_brain',
      'Crystallization is only for user brain.',
    )
    if (brainCheck) return brainCheck

    const text = String(input.text ?? input.input ?? '').trim()
    if (!text) return { success: false, error: 'text is required' }
    const userId = target.resolveUserId(sessionKey)
    if (!userId) return { success: false, error: 'Could not resolve user' }
    const orgId = target.resolveOrgId?.(sessionKey) ?? null
    const result = await target.crystallizationService.crystallize(
      target.serviceClient,
      text,
      userId,
      undefined,
      undefined,
      undefined,
      orgId,
      input,
    )
    return { success: true, ...result }
  }

  async ingestBrainLink(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const brainCheck = this.brainAccessService.validateBrainTarget(
      sessionKey,
      ['user'],
      'ingest_user_brain_link',
      'Use ingest_agent_brain_link for agent brain.',
    )
    if (brainCheck) return brainCheck

    const url = String(input.url ?? '').trim()
    if (!url) return { success: false, error: 'url is required' }
    const userId = target.resolveUserId(sessionKey)
    if (!userId) return { success: false, error: 'Could not resolve user' }
    const orgId = target.resolveOrgId?.(sessionKey) ?? null
    const extracted = await target.linkExtractionService.extract(url, {
      userId,
      orgId,
      feature: 'brain',
      action: 'link_image_ocr',
    })
    const overrideTitle =
      typeof input.title === 'string' && input.title.trim() ? input.title.trim() : ''
    const sourceTitle = overrideTitle || String(extracted.title ?? '').trim()
    if (!sourceTitle) {
      return {
        success: false,
        error:
          'title is required. Link extraction returned no title — pass `title` in data to set the memory source name.',
      }
    }
    const result = await target.documentIngestionService.ingest(target.serviceClient, {
      text: extracted.text,
      ownerId: userId,
      sourceType: extracted.sourceType,
      sourceTitle,
      orgId,
      ...temporalInsertFields(input),
    })
    return { success: true, ...result }
  }

  async ingestBrainText(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const brainCheck = this.brainAccessService.validateBrainTarget(
      sessionKey,
      ['user'],
      'ingest_user_brain_text',
      'Use ingest_agent_brain_text for agent brain.',
    )
    if (brainCheck) return brainCheck

    const content = String(input.text ?? input.content ?? '').trim()
    if (!content || content.length < 10) {
      return { success: false, error: 'text is required (min 10 chars)' }
    }
    const title = typeof input.title === 'string' && input.title.trim() ? input.title.trim() : ''
    if (!title) {
      return {
        success: false,
        error:
          "title is required. Provide a descriptive source name to group memories (e.g. 'Alex Hormozi Offer Frameworks').",
      }
    }
    const userId = target.resolveUserId(sessionKey)
    if (!userId) return { success: false, error: 'Could not resolve user' }
    const orgId = target.resolveOrgId?.(sessionKey) ?? null
    const result = await target.documentIngestionService.ingest(target.serviceClient, {
      text: content,
      ownerId: userId,
      sourceType: 'document',
      sourceTitle: title,
      orgId,
      ...temporalInsertFields(input),
    })
    return { success: true, ...result }
  }

  async ingestUserDocument(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const brainCheck = this.brainAccessService.validateBrainTarget(
      sessionKey,
      ['user'],
      'ingest_user_brain_document',
      'Use ingest_agent_brain_text for agent brain.',
    )
    if (brainCheck) return brainCheck

    const content = String(input.content ?? input.text ?? '').trim()
    if (!content) return { success: false, error: 'content is required' }
    const userId = target.resolveUserId(sessionKey)
    if (!userId) return { success: false, error: 'Could not resolve user' }
    const orgId = target.resolveOrgId?.(sessionKey) ?? null
    const result = await target.documentIngestionService.ingest(target.serviceClient, {
      text: content,
      ownerId: userId,
      sourceType: String(input.source_type ?? input.sourceType ?? 'document'),
      sourceId: (input.source_id ?? input.sourceId ?? undefined) as string | undefined,
      sourceTitle: (input.source_title ?? input.sourceTitle ?? undefined) as string | undefined,
      mediaType: (input.media_type ?? input.mediaType ?? 'text') as any,
      mediaUrl: (input.media_url ?? input.mediaUrl ?? undefined) as string | undefined,
      mediaMimeType: (input.media_mime_type ?? input.mediaMimeType ?? undefined) as
        | string
        | undefined,
      mediaBase64: (input.media_base64 ?? input.mediaBase64 ?? undefined) as string | undefined,
      mediaCaption: (input.media_caption ?? input.mediaCaption ?? undefined) as string | undefined,
      orgId,
      ...temporalInsertFields(input),
    })
    return { success: true, ...result }
  }

  async ingestSkText(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const brainCheck = this.brainAccessService.validateBrainTarget(
      sessionKey,
      ['agent'],
      'ingest_agent_brain_text',
      'Use save_user_memory for user brain.',
    )
    if (brainCheck) return brainCheck

    const userId = target.resolveUserId(sessionKey)
    if (!userId) return { success: false, error: 'Could not resolve user' }

    const explicitBrainId = String(input.brainId ?? input.brain_id ?? '').trim()
    const brainId =
      explicitBrainId ||
      (await this.brainAccessService.resolveBrainIdFromSession(target, userId, input, sessionKey))
    const text = String(input.text ?? input.content ?? '').trim()
    const sourceType = String(input.sourceType ?? input.source_type ?? '').trim()
    const title = String(input.title ?? input.sourceTitle ?? input.source_title ?? '').trim()
    if (!brainId) {
      return {
        success: false,
        error:
          'brain_id is required and could not be inferred from session (no agent_key/agent_id in session, or current agent has no SK brain provisioned). Pass brain_id explicitly, or pass agent_key.',
      }
    }
    if (!text) return { success: false, error: 'text is required' }
    if (!sourceType) return { success: false, error: 'sourceType is required' }
    if (!title) return { success: false, error: 'title is required' }
    const result = await target.skIngestionService.ingest(
      target.serviceClient,
      userId,
      {
        brainId,
        text,
        sourceType,
        title,
        domain: (input.domain as string) ?? undefined,
        mediaType: (input.mediaType ?? input.media_type ?? 'text') as any,
        mediaUrl: (input.mediaUrl ?? input.media_url ?? undefined) as string | undefined,
        mediaMimeType: (input.mediaMimeType ?? input.media_mime_type ?? undefined) as
          | string
          | undefined,
        mediaBase64: (input.mediaBase64 ?? input.media_base64 ?? undefined) as string | undefined,
        mediaCaption: (input.mediaCaption ?? input.media_caption ?? undefined) as
          | string
          | undefined,
        ...temporalInsertFields(input),
      },
      target.resolveOrgId?.(sessionKey) ?? null,
    )
    return {
      success: true,
      brain_id: brainId,
      resolved_from: explicitBrainId ? 'input' : 'session',
      ...result,
    }
  }

  async ingestSkLink(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const brainCheck = this.brainAccessService.validateBrainTarget(
      sessionKey,
      ['agent'],
      'ingest_agent_brain_link',
      'Use save_user_memory for user brain.',
    )
    if (brainCheck) return brainCheck

    const userId = target.resolveUserId(sessionKey)
    if (!userId) return { success: false, error: 'Could not resolve user' }

    const explicitBrainId = String(input.brainId ?? input.brain_id ?? '').trim()
    const brainId =
      explicitBrainId ||
      (await this.brainAccessService.resolveBrainIdFromSession(target, userId, input, sessionKey))
    const url = String(input.url ?? '').trim()
    if (!brainId) {
      return {
        success: false,
        error:
          'brain_id is required and could not be inferred from session (no agent_key/agent_id in session, or current agent has no SK brain provisioned). Pass brain_id explicitly, or pass agent_key.',
      }
    }
    if (!url) return { success: false, error: 'url is required' }
    const extracted = await target.linkExtractionService.extract(url, {
      userId,
      orgId: target.resolveOrgId?.(sessionKey) ?? null,
      feature: 'brain',
      action: 'link_image_ocr',
    })
    const result = await target.skIngestionService.ingest(
      target.serviceClient,
      userId,
      {
        brainId,
        text: extracted.text,
        sourceType: (input.sourceType ?? input.source_type ?? extracted.sourceType) as string,
        title: (input.title ?? extracted.title) as string,
        domain: (input.domain as string) ?? undefined,
        ...temporalInsertFields(input),
      },
      target.resolveOrgId?.(sessionKey) ?? null,
    )
    return {
      success: true,
      brain_id: brainId,
      resolved_from: explicitBrainId ? 'input' : 'session',
      ...result,
    }
  }

  async transferBrainNode(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const operation = String(input.operation ?? '').trim()
    if (operation !== 'copy' && operation !== 'move') {
      return { success: false, error: 'operation must be copy or move' }
    }
    const node_type = String(input.node_type ?? '').trim() as
      | 'memory'
      | 'snapshot'
      | 'sk_entry'
      | 'sk_source'
      | 'experience'
    const validTypes = ['memory', 'snapshot', 'sk_entry', 'sk_source', 'experience']
    if (!validTypes.includes(node_type)) {
      return { success: false, error: `node_type must be one of: ${validTypes.join(', ')}` }
    }
    const node_id = String(input.node_id ?? '').trim()
    if (!node_id) return { success: false, error: 'node_id is required' }
    const source_scope = this.parseScope(input.source_scope ?? input.sourceScope)
    const target_scope = this.parseScope(input.target_scope ?? input.targetScope)
    if (!source_scope || !target_scope) {
      return {
        success: false,
        error:
          'source_scope and target_scope are required objects: { type: user|agent, agent_id? }',
      }
    }
    const connected = input.connected_node_ids ?? input.connectedNodeIds
    const connected_node_ids = Array.isArray(connected)
      ? connected.map((x) => String(x).trim()).filter(Boolean)
      : undefined

    const dto = {
      operation: operation as 'copy' | 'move',
      node_type,
      node_id,
      source_scope,
      target_scope,
      connected_node_ids,
      source_type: typeof input.source_type === 'string' ? input.source_type : undefined,
      source_id: input.source_id ?? input.sourceId ?? null,
      source_title: input.source_title ?? input.sourceTitle ?? null,
    }

    return this.callMainApiInternal(target, '/brain/nodes/transfer', dto, sessionKey)
  }

  async transferBrainBySource(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const operation = String(input.operation ?? '').trim()
    if (operation !== 'copy' && operation !== 'move') {
      return { success: false, error: 'operation must be copy or move' }
    }
    const source_title = String(input.source_title ?? input.sourceTitle ?? '').trim()
    if (!source_title) return { success: false, error: 'source_title is required' }
    const source_scope = this.parseScope(input.source_scope ?? input.sourceScope)
    const target_scope = this.parseScope(input.target_scope ?? input.targetScope)
    if (!source_scope || !target_scope) {
      return {
        success: false,
        error:
          'source_scope and target_scope are required objects: { type: user|agent, agent_id? }',
      }
    }
    const dto = {
      operation: operation as 'copy' | 'move',
      source_title,
      source_type:
        typeof input.source_type === 'string' && input.source_type.trim()
          ? input.source_type.trim()
          : undefined,
      source_id: input.source_id ?? input.sourceId ?? null,
      source_scope,
      target_scope,
    }
    return this.callMainApiInternal(target, '/brain/nodes/transfer-by-source', dto, sessionKey)
  }

  async assignMemorySource(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const new_source_title = String(input.new_source_title ?? input.newSourceTitle ?? '').trim()
    if (!new_source_title) return { success: false, error: 'new_source_title is required' }
    const rawIds = input.memory_ids ?? input.memoryIds
    const memory_ids = Array.isArray(rawIds)
      ? rawIds.map((x) => String(x).trim()).filter(Boolean)
      : undefined
    const match_source_title = String(
      input.match_source_title ?? input.matchSourceTitle ?? '',
    ).trim()
    const match_orphan_source_title =
      input.match_orphan_source_title === true || input.matchOrphanSourceTitle === true
    if (
      (!memory_ids || memory_ids.length === 0) &&
      !match_source_title &&
      !match_orphan_source_title
    ) {
      return {
        success: false,
        error:
          'Provide memory_ids, match_source_title, or match_orphan_source_title (user default brain only)',
      }
    }
    const dto: Record<string, unknown> = {
      new_source_title,
      new_source_id: input.new_source_id ?? input.newSourceId ?? null,
    }
    if (memory_ids?.length) dto.memory_ids = memory_ids
    if (match_source_title) dto.match_source_title = match_source_title
    if (match_orphan_source_title) dto.match_orphan_source_title = true
    return this.callMainApiInternal(target, '/brain/nodes/assign-source', dto, sessionKey)
  }

  async deleteBrainNode(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const node_type = String(input.node_type ?? '').trim() as
      | 'memory'
      | 'snapshot'
      | 'sk_entry'
      | 'sk_source'
      | 'connection'
    const validDel = ['memory', 'snapshot', 'sk_entry', 'sk_source', 'connection']
    if (!validDel.includes(node_type)) {
      return { success: false, error: `node_type must be one of: ${validDel.join(', ')}` }
    }
    const node_id = String(input.node_id ?? '').trim()
    if (!node_id) return { success: false, error: 'node_id is required' }
    return this.callMainApiInternal(
      target,
      '/brain/nodes/delete',
      {
        node_type,
        node_id,
        brain_type: input.brain_type,
        brain_id: input.brain_id ?? input.brainId ?? null,
        agent_id: input.agent_id ?? input.agentId ?? null,
      },
      sessionKey,
    )
  }

  /**
   * Import one meeting from any connected note taker (Fathom, Fireflies, Read AI)
   * into a brain. The API fetches through the provider adapter and queues the
   * shared `meeting_transcript_import` job with the transcript inside.
   */
  async ingestMeetingTranscript(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const provider = String(input.provider ?? '')
      .trim()
      .toLowerCase()
    if (!MEETING_PROVIDERS.has(provider)) {
      return {
        success: false,
        error: `provider is required and must be one of: ${[...MEETING_PROVIDERS].join(', ')}`,
      }
    }
    const externalId = String(
      input.external_id ??
        input.externalId ??
        input.meeting_id ??
        input.recording_id ??
        input.transcript_id ??
        input.session_id ??
        '',
    ).trim()
    if (!externalId) return { success: false, error: 'external_id is required' }

    return this.callMainApiInternal(
      target,
      '/brain/import-jobs/meeting-transcript',
      {
        provider,
        external_id: externalId,
        brainId: input.brainId ?? input.brain_id,
        targetBrain: input.targetBrain ?? input.target_brain,
        contactId: input.contactId ?? input.contact_id,
        campaignId: input.campaignId ?? input.campaign_id,
        domain: input.domain,
        org_id: target.resolveOrgId?.(sessionKey) ?? null,
      },
      sessionKey,
    )
  }

  private async callMainApiInternal(
    target: Record<string, any>,
    path: string,
    body: Record<string, unknown>,
    sessionKey?: string,
  ): Promise<Record<string, unknown>> {
    const userId = target.resolveUserId(sessionKey)
    if (!userId) return { success: false, error: 'Could not resolve user' }
    const mainApiUrl =
      (target.config.get('MAIN_API_URL') as string | undefined) || 'http://localhost:3001'
    const internalToken =
      (target.config.get('INTERNAL_API_TOKEN') as string | undefined) ||
      process.env.INTERNAL_API_TOKEN ||
      ''
    if (!internalToken.trim()) {
      return { success: false, error: 'INTERNAL_API_TOKEN is required for brain internal API' }
    }
    const res = await fetch(
      `${mainApiUrl.replace(/\/$/, '')}/api/internal${path.startsWith('/') ? path : `/${path}`}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${internalToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: userId, ...body }),
      },
    )
    const raw = await res.text()
    if (!res.ok) {
      return {
        success: false,
        error: `Brain internal API failed (${res.status}): ${raw.slice(0, 400)}`,
      }
    }
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : { success: true }
  }

  private parseScope(raw: unknown): { type: string; agent_id?: string } | null {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
    const o = raw as Record<string, unknown>
    const type = String(o.type ?? '').trim()
    if (type !== 'user' && type !== 'agent') return null
    const agent_id =
      typeof o.agent_id === 'string' && o.agent_id.trim() ? o.agent_id.trim() : undefined
    return { type, agent_id }
  }
}
