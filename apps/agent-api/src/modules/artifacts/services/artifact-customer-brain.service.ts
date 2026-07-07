import { createHash } from 'node:crypto'
import { temporalInsertFields, type BrainTemporalPayload } from '@vibey/api-shared'
import { ArtifactCustomerBrainRepository } from '../repositories/artifact-customer-brain.repository'
import { parseConversationIdFromSessionKey } from './artifact-action.registry'

type CustomerBrainTarget =
  | { brainId: string; userId: string; orgId: string | null }
  | { error: string }

type CustomerIdentityResolution =
  | {
      customerEntityId: string | null
      customerSourceIdentityId: string | null
      resolutionStatus: 'linked_contact' | 'linked_entity' | 'unlinked_source' | 'unresolved'
    }
  | { error: string }

const CUSTOMER_MEMORY_TYPES = new Set([
  'decision',
  'insight',
  'preference',
  'fact',
  'story',
  'framework',
  'event',
])

const CUSTOMER_SOURCE_ANCHOR_FIELDS = [
  'customer_source_identity_id',
  'customerSourceIdentityId',
  'source_identity',
  'sourceIdentity',
  'source_id',
  'sourceId',
  'source_url',
  'sourceUrl',
  'url',
  'conversation_id',
  'conversationId',
  'visitor_id',
  'visitorId',
  'telegram_chat_id',
  'telegramChatId',
  'meeting_id',
  'meetingId',
] as const

type CustomerSourceAnchor = { field: string; value: string }

function vectorLiteral(embedding: number[] | null | undefined): string | null {
  return Array.isArray(embedding) && embedding.length > 0 ? `[${embedding.join(',')}]` : null
}

function recordValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export class ArtifactCustomerBrainService {
  constructor(private readonly repository = new ArtifactCustomerBrainRepository()) {}

  getHandlers(target: Record<string, any>) {
    return {
      save_customer_memory: (data: Record<string, unknown>, sessionKey?: string) =>
        this.saveCustomerMemory(target, data, sessionKey),
      search_customer_brain: (data: Record<string, unknown>, sessionKey?: string) =>
        this.searchCustomerBrain(target, data, sessionKey),
      ingest_customer_brain_text: (data: Record<string, unknown>, sessionKey?: string) =>
        this.ingestCustomerBrainText(target, data, sessionKey),
      ingest_customer_brain_link: (data: Record<string, unknown>, sessionKey?: string) =>
        this.ingestCustomerBrainLink(target, data, sessionKey),
      list_customer_brain_memories: (data: Record<string, unknown>, sessionKey?: string) =>
        this.listCustomerBrainMemories(target, data, sessionKey),
      list_customer_avatars: (data: Record<string, unknown>, sessionKey?: string) =>
        this.listCustomerAvatars(target, data, sessionKey),
    }
  }

  private async resolveCustomerBrain(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
    requiredAccess: 'view' | 'query' | 'train' = 'query',
  ): Promise<CustomerBrainTarget> {
    const userId = target.resolveUserId?.(sessionKey)
    if (!userId) return { error: 'Could not resolve user' }
    const orgId = target.resolveOrgId?.(sessionKey) ?? null
    const explicitBrainId = typeof input.brain_id === 'string' ? input.brain_id.trim() : ''

    const { data: brain, error } = await this.repository.findCustomerBrain(target.serviceClient, {
      brainId: explicitBrainId || undefined,
      userId,
      orgId,
    })
    if (error) return { error: `Failed to resolve customer brain: ${error.message}` }
    if (!brain?.id) return { error: 'Customer Brain not found for this scope' }
    if (brain.scope !== 'customer') return { error: 'brain_id must reference a Customer Brain' }
    if (explicitBrainId) {
      const access = await this.assertCanAccessBrain(
        target,
        userId,
        String(brain.id),
        requiredAccess,
        sessionKey,
      )
      if (access) return { error: access.error }
    } else if (orgId) {
      if (brain.org_id !== orgId) return { error: 'Customer Brain is not in the current org' }
    } else if (brain.owner_id !== userId || brain.org_id !== null) {
      return { error: 'Customer Brain is not in the current personal scope' }
    }
    return { brainId: String(brain.id), userId, orgId }
  }

  private async assertCanAccessBrain(
    target: Record<string, any>,
    userId: string,
    brainId: string,
    required: 'view' | 'query' | 'train',
    sessionKey?: string,
  ): Promise<{ success: false; error: string } | null> {
    const userClient =
      typeof target.getUserClient === 'function'
        ? await target.getUserClient(userId, sessionKey as string)
        : null
    if (!userClient) return { success: false, error: 'Could not verify brain permissions' }
    const { data, error } = await this.repository.canAccessBrain(userClient, {
      brainId,
      required,
    })
    if (error) {
      return { success: false, error: `Failed to verify brain permissions: ${error.message}` }
    }
    if (data !== true) return { success: false, error: 'Insufficient brain permissions' }
    return null
  }

  private async validateContact(
    target: Record<string, any>,
    contactId: string,
    userId: string,
    orgId: string | null,
  ): Promise<string | null> {
    const { data: contact, error } = await this.repository.findContact(target.serviceClient, {
      contactId,
      userId,
      orgId,
    })
    if (error) return `Failed to validate contact: ${error.message}`
    if (!contact?.id) return 'contact_id does not belong to this workspace'
    if (!orgId && contact.user_id !== userId) return 'contact_id does not belong to this workspace'
    return null
  }

  private async insertCustomerMemory(
    target: Record<string, any>,
    input: {
      brainId: string
      userId: string
      orgId: string | null
      content: string
      memoryType: string
      contactId: string | null
      sourceAnchor: CustomerSourceAnchor | null
      identity: Exclude<CustomerIdentityResolution, { error: string }>
      sourceType: string
      sourceTitle: string | null
      sourceId?: string | null
      significance?: number
      tags?: string[]
      speaker?: string | null
      metadata?: Record<string, unknown> | null
    } & BrainTemporalPayload,
  ) {
    const contentHash = createHash('sha256').update(input.content).digest('hex')
    const embedding =
      typeof target.embeddingService?.getEmbedding === 'function'
        ? await target.embeddingService.getEmbedding(input.content, {
            billing: { userId: input.userId, orgId: input.orgId },
          })
        : null
    const { data, error } = await this.repository.createMemory(target.serviceClient, {
      brain_id: input.brainId,
      contact_id: input.contactId ?? null,
      content: input.content,
      content_hash: contentHash,
      memory_type: input.memoryType,
      source_type: input.sourceType,
      source_id: input.sourceId ?? input.sourceAnchor?.value ?? null,
      source_title: input.sourceTitle,
      customer_entity_id: input.identity.customerEntityId,
      customer_source_identity_id: input.identity.customerSourceIdentityId,
      customer_resolution_status: input.identity.resolutionStatus,
      ...temporalInsertFields(input),
      speaker: input.speaker?.trim() || 'customer',
      confidence: 1,
      significance:
        typeof input.significance === 'number' ? Math.max(0, Math.min(1, input.significance)) : 0.5,
      tags: [...new Set([...(input.tags ?? []), 'customer_brain'])],
      agent_id: 'atlas',
      metadata: {
        ...(input.metadata ?? {}),
        user_id: input.userId,
        temporal: temporalInsertFields(input),
        identity_resolution: {
          status: input.identity.resolutionStatus,
          contact_id: input.contactId,
          customer_entity_id: input.identity.customerEntityId,
          customer_source_identity_id: input.identity.customerSourceIdentityId,
          source_anchor_field: input.sourceAnchor?.field ?? null,
          source_anchor_value: input.sourceAnchor?.value ?? null,
        },
      },
      ...(vectorLiteral(embedding) ? { embedding: vectorLiteral(embedding) } : {}),
    })

    if (error) return { success: false, error: `Failed to save customer memory: ${error.message}` }
    const memory = data as { id: string }
    return {
      success: true,
      memory_id: memory.id,
      brain_id: input.brainId,
      contact_id: input.contactId ?? null,
      customer_entity_id: input.identity.customerEntityId,
      customer_source_identity_id: input.identity.customerSourceIdentityId,
      customer_resolution_status: input.identity.resolutionStatus,
    }
  }

  private async resolveCustomerIdentity(
    target: Record<string, any>,
    input: {
      brainId: string
      userId: string
      orgId: string | null
      contactId: string | null
      sourceAnchor: CustomerSourceAnchor | null
      sourceType: string
      sourceId: string | null
      sourceTitle: string | null
      metadata: Record<string, unknown> | null
    },
  ): Promise<CustomerIdentityResolution> {
    const entityKey = input.contactId
      ? `contact:${input.contactId}`
      : input.sourceId
        ? `source:${input.sourceType}:${input.sourceId}`
        : null
    if (!entityKey) {
      return {
        customerEntityId: null,
        customerSourceIdentityId: null,
        resolutionStatus: 'unresolved',
      }
    }

    const { data: entity, error: entityError } = await this.repository.upsertCustomerEntity(
      target.serviceClient,
      {
        brain_id: input.brainId,
        owner_id: input.userId,
        org_id: input.orgId,
        entity_key: entityKey,
        entity_type: input.contactId ? 'contact' : 'source_identity',
        display_name:
          input.sourceTitle ??
          (input.contactId ? `Contact ${input.contactId.slice(0, 8)}` : input.sourceId),
        primary_contact_id: input.contactId,
        confidence: input.contactId ? 1 : 0.65,
        metadata: {
          ...(input.metadata ?? {}),
          source_anchor_field: input.sourceAnchor?.field ?? null,
          source_anchor_value: input.sourceAnchor?.value ?? null,
        },
        last_seen_at: new Date().toISOString(),
      },
    )
    if (entityError) {
      return { error: `Failed to resolve customer entity: ${entityError.message}` }
    }
    const customerEntityId = typeof entity?.id === 'string' ? entity.id : null

    if (!input.sourceId) {
      return {
        customerEntityId,
        customerSourceIdentityId: null,
        resolutionStatus: input.contactId ? 'linked_contact' : 'linked_entity',
      }
    }

    const { data: sourceIdentity, error: sourceError } =
      await this.repository.upsertCustomerSourceIdentity(target.serviceClient, {
        brain_id: input.brainId,
        customer_entity_id: customerEntityId,
        contact_id: input.contactId,
        source_type: input.sourceType,
        source_id: input.sourceId,
        identity_kind: input.sourceAnchor?.field ?? 'source_id',
        source_label: input.sourceTitle,
        confidence: input.contactId ? 0.9 : 0.65,
        metadata: {
          ...(input.metadata ?? {}),
          source_anchor_field: input.sourceAnchor?.field ?? null,
          source_anchor_value: input.sourceAnchor?.value ?? null,
        },
        last_seen_at: new Date().toISOString(),
      })
    if (sourceError) {
      return { error: `Failed to resolve customer source identity: ${sourceError.message}` }
    }

    return {
      customerEntityId,
      customerSourceIdentityId: typeof sourceIdentity?.id === 'string' ? sourceIdentity.id : null,
      resolutionStatus: input.contactId ? 'linked_contact' : 'unlinked_source',
    }
  }

  private customerSourceAnchor(
    input: Record<string, unknown>,
    sessionKey?: string,
  ): CustomerSourceAnchor | null {
    for (const field of CUSTOMER_SOURCE_ANCHOR_FIELDS) {
      const value = stringValue(input[field])
      if (value) return { field, value }
    }

    const metadata = recordValue(input.metadata)
    if (metadata) {
      for (const field of CUSTOMER_SOURCE_ANCHOR_FIELDS) {
        const value = stringValue(metadata[field])
        if (value) return { field: `metadata.${field}`, value }
      }
    }

    const conversationId = parseConversationIdFromSessionKey(sessionKey)
    return conversationId ? { field: 'session_conversation_id', value: conversationId } : null
  }

  private sourceTypeForAnchor(anchor: CustomerSourceAnchor | null): string {
    const field = anchor?.field.toLowerCase() ?? ''
    if (field.includes('url')) return 'url'
    if (field.includes('conversation')) return 'conversation'
    if (field.includes('meeting')) return 'meeting'
    if (field.includes('telegram')) return 'telegram'
    if (field.includes('visitor')) return 'visitor'
    return 'source_identity'
  }

  private async saveCustomerMemory(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const resolved = await this.resolveCustomerBrain(target, input, sessionKey, 'train')
    if ('error' in resolved) return { success: false, error: resolved.error }
    const content = String(input.content ?? '').trim()
    if (content.length < 10) return { success: false, error: 'content is required (min 10 chars)' }
    const memoryType = String(input.memory_type ?? '').trim()
    if (!CUSTOMER_MEMORY_TYPES.has(memoryType)) {
      return {
        success: false,
        error: `memory_type must be one of: ${[...CUSTOMER_MEMORY_TYPES].join(', ')}`,
      }
    }
    const contactId = stringValue(input.contact_id ?? input.contactId) || null
    const sourceAnchor = this.customerSourceAnchor(input, sessionKey)
    if (!contactId && !sourceAnchor) {
      return {
        success: false,
        error:
          'contact_id or durable source identity is required for Customer Brain memory',
      }
    }
    if (contactId) {
      const contactError = await this.validateContact(
        target,
        contactId,
        resolved.userId,
        resolved.orgId,
      )
      if (contactError) return { success: false, error: contactError }
    }

    const sourceType =
      stringValue(input.source_type ?? input.sourceType) ||
      (contactId ? 'manual' : this.sourceTypeForAnchor(sourceAnchor))
    const sourceId =
      stringValue(input.source_id ?? input.sourceId ?? input.source_url ?? input.sourceUrl) ||
      sourceAnchor?.value ||
      null
    const sourceTitle = stringValue(input.source_title ?? input.sourceTitle ?? input.title) || null
    const metadata =
      input.metadata && typeof input.metadata === 'object' && !Array.isArray(input.metadata)
        ? (input.metadata as Record<string, unknown>)
        : null
    const identity = await this.resolveCustomerIdentity(target, {
      brainId: resolved.brainId,
      userId: resolved.userId,
      orgId: resolved.orgId,
      contactId,
      sourceAnchor,
      sourceType,
      sourceId,
      sourceTitle,
      metadata,
    })
    if ('error' in identity) return { success: false, error: identity.error }

    return this.insertCustomerMemory(target, {
      brainId: resolved.brainId,
      userId: resolved.userId,
      orgId: resolved.orgId,
      content,
      memoryType,
      contactId,
      sourceAnchor,
      identity,
      sourceType,
      sourceId,
      sourceTitle,
      significance: typeof input.significance === 'number' ? input.significance : undefined,
      tags: Array.isArray(input.tags)
        ? input.tags.filter((tag): tag is string => typeof tag === 'string')
        : [],
      speaker: typeof input.speaker === 'string' ? input.speaker : null,
      ...temporalInsertFields(input),
      metadata,
    })
  }

  private async searchCustomerBrain(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const resolved = await this.resolveCustomerBrain(target, input, sessionKey, 'query')
    if ('error' in resolved) return { success: false, error: resolved.error }
    const query = String(input.query ?? '').trim()
    if (query.length < 3) return { success: false, error: 'query is required (min 3 chars)' }
    const limit = typeof input.limit === 'number' ? Math.min(Math.max(input.limit, 1), 50) : 10
    if (target.brainRetrievalService && typeof target.getUserClient === 'function') {
      const userClient = await target.getUserClient(resolved.userId, sessionKey as string)
      return target.brainRetrievalService.search({
        supabase: target.serviceClient,
        userClient,
        family: 'customer',
        brainId: resolved.brainId,
        query,
        userId: resolved.userId,
        orgId: resolved.orgId,
        requiredAccess: 'query',
        limit,
        ...this.temporalSearchInput(input),
      })
    }
    const pattern = `%${query.replace(/%/g, '')}%`
    const { data, error } = await this.repository.searchMemories(target.serviceClient, {
      brainId: resolved.brainId,
      pattern,
      limit,
    })
    if (error) return { success: false, error: `Failed to search customer brain: ${error.message}` }
    return {
      success: true,
      brain_id: resolved.brainId,
      query,
      count: (data ?? []).length,
      results: data ?? [],
    }
  }

  private async ingestCustomerBrainText(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    return this.saveCustomerMemory(
      target,
      {
        ...input,
        content: input.text ?? input.content,
        memory_type: input.memory_type ?? 'fact',
        source_type: input.source_type ?? input.sourceType ?? 'document',
        source_title: input.source_title ?? input.sourceTitle ?? input.title,
      },
      sessionKey,
    )
  }

  private async ingestCustomerBrainLink(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const url = String(input.url ?? '').trim()
    if (!url) return { success: false, error: 'url is required' }
    try {
      new URL(url)
    } catch {
      return { success: false, error: 'url is not a valid URL' }
    }
    const title = typeof input.title === 'string' && input.title.trim() ? input.title.trim() : url
    return this.saveCustomerMemory(
      target,
      {
        ...input,
        content: `${title} - ${url}`,
        memory_type: input.memory_type ?? 'fact',
        source_type: 'url',
        source_id: input.source_id ?? input.sourceId ?? url,
        source_title: title,
      },
      sessionKey,
    )
  }

  private temporalSearchInput(input: Record<string, unknown>): Record<string, unknown> {
    const timeMode = typeof input.time_mode === 'string' ? input.time_mode.trim() : ''
    const asOf = typeof input.as_of === 'string' ? input.as_of.trim() : ''
    const occurredFrom = typeof input.occurred_from === 'string' ? input.occurred_from.trim() : ''
    const occurredTo = typeof input.occurred_to === 'string' ? input.occurred_to.trim() : ''
    return {
      ...(timeMode ? { time_mode: timeMode } : {}),
      ...(asOf ? { as_of: asOf } : {}),
      ...(occurredFrom ? { occurred_from: occurredFrom } : {}),
      ...(occurredTo ? { occurred_to: occurredTo } : {}),
      ...(typeof input.include_historical === 'boolean'
        ? { include_historical: input.include_historical }
        : {}),
    }
  }

  private async listCustomerBrainMemories(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const resolved = await this.resolveCustomerBrain(target, input, sessionKey, 'query')
    if ('error' in resolved) return { success: false, error: resolved.error }
    const limit = typeof input.limit === 'number' ? Math.min(Math.max(input.limit, 1), 100) : 20
    const { data, error } = await this.repository.listMemories(target.serviceClient, {
      brainId: resolved.brainId,
      limit,
    })
    if (error)
      return { success: false, error: `Failed to list customer memories: ${error.message}` }
    return {
      success: true,
      brain_id: resolved.brainId,
      count: (data ?? []).length,
      memories: data ?? [],
    }
  }

  private async listCustomerAvatars(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const resolved = await this.resolveCustomerBrain(target, input, sessionKey, 'query')
    if ('error' in resolved) return { success: false, error: resolved.error }
    const { data, error } = await this.repository.listAvatars(
      target.serviceClient,
      resolved.brainId,
    )
    if (error) return { success: false, error: `Failed to list customer avatars: ${error.message}` }
    return {
      success: true,
      brain_id: resolved.brainId,
      count: (data ?? []).length,
      avatars: data ?? [],
    }
  }
}
