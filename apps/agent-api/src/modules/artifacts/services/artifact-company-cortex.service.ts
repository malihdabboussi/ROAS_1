import { temporalInsertFields } from '@vibey/api-shared'
import { ArtifactCompanyCortexRepository } from '../repositories/artifact-company-cortex.repository'

type CompanyObjectType =
  | 'belief'
  | 'perspective'
  | 'tension'
  | 'standard'
  | 'move'
  | 'anti_pattern'
  | 'protocol'
  | 'decision'
  | 'retrieval_rule'

const OBJECT_TYPES = new Set<CompanyObjectType>([
  'belief',
  'perspective',
  'tension',
  'standard',
  'move',
  'anti_pattern',
  'protocol',
  'decision',
  'retrieval_rule',
])

type CompanySignalType =
  | 'belief'
  | 'standard'
  | 'move'
  | 'anti_pattern'
  | 'protocol'
  | 'decision'
  | 'tension_candidate'
  | 'retrieval_rule'

const SIGNAL_TYPES = new Set<CompanySignalType>([
  'belief',
  'standard',
  'move',
  'anti_pattern',
  'protocol',
  'decision',
  'tension_candidate',
  'retrieval_rule',
])

type CompanyRelationType =
  | 'supports'
  | 'contradicts'
  | 'contains'
  | 'enforces'
  | 'derived_from'
  | 'refines'

const RELATION_TYPES = new Set<CompanyRelationType>([
  'supports',
  'contradicts',
  'contains',
  'enforces',
  'derived_from',
  'refines',
])

function vectorLiteral(embedding: number[] | null | undefined): string | null {
  return Array.isArray(embedding) && embedding.length > 0 ? `[${embedding.join(',')}]` : null
}

export class ArtifactCompanyCortexService {
  constructor(private readonly repository = new ArtifactCompanyCortexRepository()) {}

  getHandlers(target: Record<string, any>) {
    return {
      get_company_brain_objects: (data: Record<string, unknown>, sessionKey?: string) =>
        this.getCompanyCortexObjects(target, data, sessionKey),
      get_company_brain_object_edges: (data: Record<string, unknown>, sessionKey?: string) =>
        this.getCompanyCortexObjectEdges(target, data, sessionKey),
      search_company_brain: (data: Record<string, unknown>, sessionKey?: string) =>
        this.searchCompanyCortex(target, data, sessionKey),
      propose_company_brain_signal: (data: Record<string, unknown>, sessionKey?: string) =>
        this.proposeCompanyCortexSignal(target, data, sessionKey),
      create_company_brain_object: (data: Record<string, unknown>, sessionKey?: string) =>
        this.createCompanyCortexObject(target, data, sessionKey),
      update_company_brain_object: (data: Record<string, unknown>, sessionKey?: string) =>
        this.updateCompanyCortexObject(target, data, sessionKey),
      archive_company_brain_object: (data: Record<string, unknown>, sessionKey?: string) =>
        this.archiveCompanyCortexObject(target, data, sessionKey),
      create_company_brain_edge: (data: Record<string, unknown>, sessionKey?: string) =>
        this.createCompanyCortexEdge(target, data, sessionKey),
      delete_company_brain_edge: (data: Record<string, unknown>, sessionKey?: string) =>
        this.deleteCompanyCortexEdge(target, data, sessionKey),
    }
  }

  private async resolveCompanyBrain(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
    requiredAccess: 'view' | 'query' | 'train' = 'query',
  ): Promise<{ brainId: string; orgId: string } | { error: string }> {
    const userId = target.resolveUserId?.(sessionKey)
    if (!userId) return { error: 'Could not resolve user' }
    const orgId = target.resolveOrgId?.(sessionKey) ?? null
    if (!orgId) return { error: 'org context is required for company cortex actions' }

    const explicitBrainId =
      typeof input.brain_id === 'string' && input.brain_id.trim().length > 0
        ? input.brain_id.trim()
        : ''
    let brainId = explicitBrainId
    if (!brainId) {
      const { data: brainRow, error } = await this.repository.findCompanyBrainByOrg(
        target.serviceClient,
        orgId,
      )
      if (error) return { error: `Failed to resolve company brain: ${error.message}` }
      if (!brainRow?.id) return { error: 'Company brain not found for this org' }
      brainId = String(brainRow.id)
    }

    const { data: brain, error: brainError } = await this.repository.findBrain(
      target.serviceClient,
      brainId,
    )
    if (brainError) return { error: `Failed to load brain: ${brainError.message}` }
    if (!brain || brain.scope !== 'company')
      return { error: 'brain_id must reference a company brain' }
    if (brain.org_id !== orgId) return { error: 'brain_id is not in the current org' }
    const access = await this.assertCanAccessBrain(
      target,
      userId,
      brainId,
      requiredAccess,
      sessionKey,
    )
    if (access) return { error: access.error }
    return { brainId, orgId }
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

  private async getCompanyCortexObjects(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const resolved = await this.resolveCompanyBrain(target, input, sessionKey, 'query')
    if ('error' in resolved) return { success: false, error: resolved.error }

    const objectType = typeof input.object_type === 'string' ? input.object_type.trim() : ''
    const status = typeof input.status === 'string' ? input.status.trim() : ''
    const limit = typeof input.limit === 'number' ? Math.min(input.limit, 50) : 20
    const { data, error } = await this.repository.listObjects(target.serviceClient, {
      brainId: resolved.brainId,
      orgId: resolved.orgId,
      objectType,
      status,
      limit,
    })
    if (error)
      return { success: false, error: `Failed to read company cortex objects: ${error.message}` }
    return { success: true, count: (data ?? []).length, objects: data ?? [] }
  }

  private async getCompanyCortexObjectEdges(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const resolved = await this.resolveCompanyBrain(target, input, sessionKey, 'query')
    if ('error' in resolved) return { success: false, error: resolved.error }

    const sourceObjectId =
      typeof input.source_object_id === 'string' ? input.source_object_id.trim() : ''
    const targetObjectId =
      typeof input.target_object_id === 'string' ? input.target_object_id.trim() : ''
    const { data, error } = await this.repository.listEdges(target.serviceClient, {
      brainId: resolved.brainId,
      orgId: resolved.orgId,
      sourceObjectId,
      targetObjectId,
    })
    if (error)
      return { success: false, error: `Failed to read company cortex edges: ${error.message}` }
    return { success: true, count: (data ?? []).length, edges: data ?? [] }
  }

  private async searchCompanyCortex(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const query = String(input.query ?? '').trim()
    if (query.length < 2) return { success: false, error: 'query is required (min 2 chars)' }
    const resolved = await this.resolveCompanyBrain(target, input, sessionKey, 'query')
    if ('error' in resolved) return { success: false, error: resolved.error }

    const limit = typeof input.limit === 'number' ? Math.min(input.limit, 20) : 10
    if (target.brainRetrievalService && typeof target.getUserClient === 'function') {
      const userId = target.resolveUserId?.(sessionKey)
      const userClient = await target.getUserClient(userId, sessionKey as string)
      return target.brainRetrievalService.search({
        supabase: target.serviceClient,
        userClient,
        family: 'company',
        brainId: resolved.brainId,
        query,
        userId,
        orgId: resolved.orgId,
        requiredAccess: 'query',
        limit,
        ...this.temporalSearchInput(input),
      })
    }
    const queryEmbedding =
      typeof target.embeddingService?.getEmbedding === 'function'
        ? await target.embeddingService.getEmbedding(query, {
            billing: {
              userId: target.resolveUserId?.(sessionKey),
              orgId: resolved.orgId,
            },
          })
        : null
    const queryVector = vectorLiteral(queryEmbedding)
    if (queryVector) {
      const { data: semanticData, error: semanticError } =
        await this.repository.searchObjectsByEmbedding(target.serviceClient, {
          brainId: resolved.brainId,
          orgId: resolved.orgId,
          queryVector,
          limit,
        })
      if (!semanticError && Array.isArray(semanticData) && semanticData.length > 0) {
        return { success: true, count: semanticData.length, results: semanticData }
      }
    }

    const pattern = `%${query.replace(/%/g, '')}%`
    const { data, error } = await this.repository.searchObjectsByText(target.serviceClient, {
      brainId: resolved.brainId,
      orgId: resolved.orgId,
      pattern,
      limit,
    })

    if (error) return { success: false, error: `Failed to search company cortex: ${error.message}` }
    return { success: true, count: (data ?? []).length, results: data ?? [] }
  }

  private async createCompanyCortexObject(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const resolved = await this.resolveCompanyBrain(target, input, sessionKey, 'train')
    if ('error' in resolved) return { success: false, error: resolved.error }

    const objectType = String(input.object_type ?? '')
    const title = String(input.title ?? '').trim()
    const truth = String(input.truth ?? '').trim()
    if (!OBJECT_TYPES.has(objectType as CompanyObjectType)) {
      return { success: false, error: 'object_type is invalid' }
    }
    if (!title) return { success: false, error: 'title is required' }
    if (!truth) return { success: false, error: 'truth is required' }

    const confidence =
      typeof input.confidence === 'number' ? Math.max(0, Math.min(1, input.confidence)) : 0.5
    const status =
      typeof input.status === 'string' && input.status.trim().length > 0
        ? input.status.trim()
        : 'active'
    const sourceSignalIds = Array.isArray(input.source_signal_ids)
      ? input.source_signal_ids.filter((id): id is string => typeof id === 'string')
      : []
    if (sourceSignalIds.length === 0) {
      return { success: false, error: 'source_signal_ids are required for company object creation' }
    }
    const evidenceRefs = Array.isArray(input.evidence_refs)
      ? (input.evidence_refs.filter((ref) => ref && typeof ref === 'object') as Array<
          Record<string, unknown>
        >)
      : []
    if (evidenceRefs.length === 0) {
      return { success: false, error: 'evidence_refs are required for company object creation' }
    }
    const retrievalRule =
      input.retrieval_rule && typeof input.retrieval_rule === 'object'
        ? (input.retrieval_rule as Record<string, unknown>)
        : {}
    if (!this.hasCompleteRetrievalRule(retrievalRule)) {
      return {
        success: false,
        error: 'retrieval_rule.trigger and retrieval_rule.context_form are required',
      }
    }
    const objectEmbedding =
      typeof target.embeddingService?.getEmbedding === 'function'
        ? await target.embeddingService.getEmbedding(`${title}\n${truth}`, {
            billing: {
              userId: target.resolveUserId?.(sessionKey),
              orgId: resolved.orgId,
            },
          })
        : null

    const { data, error } = await this.repository.createObject(target.serviceClient, {
      org_id: resolved.orgId,
      brain_id: resolved.brainId,
      object_type: objectType,
      title,
      truth,
      status,
      confidence,
      source_signal_ids: sourceSignalIds,
      evidence_refs: evidenceRefs,
      ...temporalInsertFields(input),
      ...(vectorLiteral(objectEmbedding) ? { embedding: vectorLiteral(objectEmbedding) } : {}),
      retrieval_rule: retrievalRule,
      confidence_basis:
        input.confidence_basis && typeof input.confidence_basis === 'object'
          ? input.confidence_basis
          : {},
      metadata: { temporal: temporalInsertFields(input) },
    })

    if (error)
      return { success: false, error: `Failed to create company cortex object: ${error.message}` }
    return { success: true, object: data, company_object_id: data?.id }
  }

  private async proposeCompanyCortexSignal(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const resolved = await this.resolveCompanyBrain(target, input, sessionKey, 'train')
    if ('error' in resolved) return { success: false, error: resolved.error }

    const signalType = this.companySignalTypeForInput(input)
    if (!signalType) return { success: false, error: 'signal_type is invalid' }
    const truth = String(input.truth ?? input.content ?? '').trim()
    if (!truth) return { success: false, error: 'truth is required' }
    const evidenceRefs = this.evidenceRefsFromInput(input)
    if (evidenceRefs.length === 0) {
      return { success: false, error: 'evidence_refs or source metadata are required' }
    }

    const confidence =
      typeof input.confidence === 'number' ? Math.max(0, Math.min(1, input.confidence)) : 0.5
    const source = String(input.source ?? input.source_type ?? 'mcp').trim() || 'mcp'
    const confidenceBasis =
      input.confidence_basis && typeof input.confidence_basis === 'object'
        ? (input.confidence_basis as Record<string, unknown>)
        : {
            proposal: {
              source,
              evidence_ref_count: evidenceRefs.length,
              proposed_by: 'agent_action',
            },
          }

    const { data, error } = await this.repository.createSignal(target.serviceClient, {
      org_id: resolved.orgId,
      brain_id: resolved.brainId,
      signal_type: signalType,
      truth,
      scope: input.scope && typeof input.scope === 'object' ? input.scope : {},
      evidence_refs: evidenceRefs,
      confidence,
      confidence_basis: confidenceBasis,
      reason: typeof input.reason === 'string' ? input.reason.trim() : null,
      context_form: typeof input.context_form === 'string' ? input.context_form.trim() : null,
      status: 'proposed',
      source,
      ...temporalInsertFields(input),
    })

    if (error)
      return { success: false, error: `Failed to propose company cortex signal: ${error.message}` }
    return { success: true, signal: data, company_signal_id: data?.id }
  }

  private async updateCompanyCortexObject(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const id = typeof input.id === 'string' ? input.id.trim() : ''
    if (!id) return { success: false, error: 'id is required' }
    const resolved = await this.resolveCompanyBrain(target, input, sessionKey, 'train')
    if ('error' in resolved) return { success: false, error: resolved.error }

    const patch: Record<string, unknown> = {}
    if (typeof input.title === 'string' && input.title.trim()) patch.title = input.title.trim()
    if (typeof input.truth === 'string' && input.truth.trim()) patch.truth = input.truth.trim()
    if (typeof input.status === 'string' && input.status.trim()) patch.status = input.status.trim()
    if (typeof input.confidence === 'number') {
      patch.confidence = Math.max(0, Math.min(1, input.confidence))
    }
    if (typeof patch.title === 'string' || typeof patch.truth === 'string') {
      const embeddingText = [patch.title, patch.truth]
        .filter((part) => typeof part === 'string')
        .join('\n')
      const nextEmbedding =
        typeof target.embeddingService?.getEmbedding === 'function'
          ? await target.embeddingService.getEmbedding(embeddingText, {
              billing: {
                userId: target.resolveUserId?.(sessionKey),
                orgId: resolved.orgId,
              },
            })
          : null
      const nextVector = vectorLiteral(nextEmbedding)
      if (nextVector) patch.embedding = nextVector
    }
    if (input.retrieval_rule && typeof input.retrieval_rule === 'object') {
      patch.retrieval_rule = input.retrieval_rule
    }
    if (Object.keys(patch).length === 0) {
      return { success: false, error: 'No updatable fields provided' }
    }

    const { data, error } = await this.repository.updateObject(target.serviceClient, {
      id,
      brainId: resolved.brainId,
      orgId: resolved.orgId,
      patch,
    })

    if (error)
      return { success: false, error: `Failed to update company cortex object: ${error.message}` }
    return { success: true, object: data }
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

  private companySignalTypeForInput(input: Record<string, unknown>): CompanySignalType | null {
    const explicit = String(input.signal_type ?? '')
      .trim()
      .toLowerCase()
    if (SIGNAL_TYPES.has(explicit as CompanySignalType)) return explicit as CompanySignalType
    const objectType = String(input.object_type ?? '')
      .trim()
      .toLowerCase()
    if (objectType === 'tension') return 'tension_candidate'
    if (SIGNAL_TYPES.has(objectType as CompanySignalType)) return objectType as CompanySignalType
    const intent = String(input.intent ?? '')
      .trim()
      .toLowerCase()
    if (intent === 'standard' || intent === 'protocol' || intent === 'decision') return intent
    return 'belief'
  }

  private evidenceRefsFromInput(input: Record<string, unknown>): Array<Record<string, unknown>> {
    if (Array.isArray(input.evidence_refs)) {
      return input.evidence_refs.filter((ref) => ref && typeof ref === 'object') as Array<
        Record<string, unknown>
      >
    }
    const sourceType = String(input.source_type ?? input.source ?? '').trim()
    const sourceId = String(input.source_id ?? input.source_url ?? '').trim()
    const sourceTitle = String(input.source_title ?? input.title ?? '').trim()
    if (!sourceType && !sourceId && !sourceTitle) return []
    return [
      {
        type: sourceType || 'mcp',
        source_type: sourceType || 'mcp',
        ...(sourceId ? { source_id: sourceId } : {}),
        ...(sourceTitle ? { source_title: sourceTitle } : {}),
      },
    ]
  }

  private hasCompleteRetrievalRule(rule: Record<string, unknown>): boolean {
    const trigger = typeof rule.trigger === 'string' ? rule.trigger.trim() : ''
    const contextForm = typeof rule.context_form === 'string' ? rule.context_form.trim() : ''
    return trigger.length > 0 && contextForm.length > 0
  }

  private async archiveCompanyCortexObject(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const id = typeof input.id === 'string' ? input.id.trim() : ''
    if (!id) return { success: false, error: 'id is required' }
    const resolved = await this.resolveCompanyBrain(target, input, sessionKey, 'train')
    if ('error' in resolved) return { success: false, error: resolved.error }

    const { data, error } = await this.repository.archiveObject(target.serviceClient, {
      id,
      brainId: resolved.brainId,
      orgId: resolved.orgId,
    })

    if (error)
      return { success: false, error: `Failed to archive company cortex object: ${error.message}` }
    return { success: true, object: data }
  }

  private async createCompanyCortexEdge(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const resolved = await this.resolveCompanyBrain(target, input, sessionKey, 'train')
    if ('error' in resolved) return { success: false, error: resolved.error }

    const sourceObjectId = String(input.source_object_id ?? '').trim()
    const targetObjectId = String(input.target_object_id ?? '').trim()
    const relationType = String(input.relation_type ?? '') as CompanyRelationType
    if (!sourceObjectId || !targetObjectId) {
      return { success: false, error: 'source_object_id and target_object_id are required' }
    }
    if (!RELATION_TYPES.has(relationType)) {
      return { success: false, error: 'relation_type is invalid' }
    }
    if (sourceObjectId === targetObjectId) {
      return { success: false, error: 'source_object_id and target_object_id must differ' }
    }

    const confidence =
      typeof input.confidence === 'number' ? Math.max(0, Math.min(1, input.confidence)) : 0.5

    const { data, error } = await this.repository.createEdge(target.serviceClient, {
      org_id: resolved.orgId,
      brain_id: resolved.brainId,
      source_object_id: sourceObjectId,
      target_object_id: targetObjectId,
      relation_type: relationType,
      confidence,
      metadata: {},
    })

    if (error)
      return { success: false, error: `Failed to create company cortex edge: ${error.message}` }
    return { success: true, edge: data }
  }

  private async deleteCompanyCortexEdge(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const id = typeof input.id === 'string' ? input.id.trim() : ''
    if (!id) return { success: false, error: 'id is required' }
    const resolved = await this.resolveCompanyBrain(target, input, sessionKey, 'train')
    if ('error' in resolved) return { success: false, error: resolved.error }

    const { error } = await this.repository.deleteEdge(target.serviceClient, {
      id,
      brainId: resolved.brainId,
      orgId: resolved.orgId,
    })

    if (error)
      return { success: false, error: `Failed to delete company cortex edge: ${error.message}` }
    return { success: true, deleted: true }
  }
}
