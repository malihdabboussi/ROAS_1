import { Injectable } from '@nestjs/common'
import { ArtifactBrainCognitionRepository } from '../repositories/artifact-brain-cognition.repository'
import {
  buildBrainReadCursorScope,
  buildBrainReadPage,
  resolveBrainReadPageRequest,
} from './artifact-brain-read-pagination'

type CognitionContext = {
  userId: string
  subjectId: string
  brainId: string
  includeLegacySubjectFallback: boolean
}

type CognitionContextResolver = (
  target: Record<string, any>,
  input: Record<string, unknown>,
  sessionKey?: string,
  requiredAccess?: 'view' | 'query' | 'train',
) => Promise<CognitionContext | { error: string }>

@Injectable()
export class ArtifactBrainBeliefActionsService {
  constructor(
    private readonly brainCognitionRepository: ArtifactBrainCognitionRepository = new ArtifactBrainCognitionRepository(),
  ) {}

  async getBeliefPatterns(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey: string | undefined,
    resolveCognitionContext: CognitionContextResolver,
  ) {
    const context = await resolveCognitionContext(target, input, sessionKey, 'query')
    if ('error' in context) return { success: false, error: context.error }
    const status = typeof input.status === 'string' ? input.status.trim() : null
    const includeDetails = input.include_details === true
    const pageRequest = resolveBrainReadPageRequest(input, {
      cursorScope: buildBrainReadCursorScope('get_brain_belief_patterns', {
        brainId: context.brainId,
        subjectId: context.subjectId,
        includeLegacySubjectFallback: context.includeLegacySubjectFallback,
        status,
        includeDetails,
      }),
    })
    if ('error' in pageRequest) return { success: false, error: pageRequest.error }
    const { data, error } = await this.brainCognitionRepository.listBeliefPatterns(
      target.serviceClient,
      {
        context,
        status,
        limit: pageRequest.fetchLimit,
        offset: pageRequest.offset,
        includeDetails,
      },
    )
    if (error) return { success: false, error: `Failed to read belief patterns: ${error.message}` }
    const { items: patterns, pagination } = buildBrainReadPage(pageRequest, data ?? [])
    return {
      success: true,
      count: patterns.length,
      pagination,
      result_policy: includeDetails
        ? {
            mode: 'detail',
            continuation_hint: 'Use pagination.next_cursor to read the next detail batch.',
          }
        : {
            mode: 'summary',
            omitted_fields: ['emotional_signature', 'supporting_memories', 'resolved_at'],
            detail_hint: 'Pass include_details=true for selected detail batches.',
            continuation_hint: 'Use pagination.next_cursor to read the next summary batch.',
          },
      patterns,
    }
  }

  async createBeliefPattern(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey: string | undefined,
    resolveCognitionContext: CognitionContextResolver,
  ) {
    const context = await resolveCognitionContext(target, input, sessionKey, 'train')
    if ('error' in context) return { success: false, error: context.error }
    const patternName = typeof input.pattern_name === 'string' ? input.pattern_name.trim() : ''
    const description = typeof input.description === 'string' ? input.description.trim() : ''
    if (!patternName) return { success: false, error: 'pattern_name is required' }
    if (!description) return { success: false, error: 'description is required' }

    const emotionalSignature =
      input.emotional_signature && typeof input.emotional_signature === 'object'
        ? input.emotional_signature
        : {}
    const supportingMemories = Array.isArray(input.supporting_memories)
      ? input.supporting_memories.filter((id): id is string => typeof id === 'string').slice(0, 50)
      : []
    const strength =
      typeof input.strength === 'number' ? Math.max(0.1, Math.min(1, input.strength)) : 0.3
    const status =
      typeof input.status === 'string' && ['emerging', 'active'].includes(input.status)
        ? input.status
        : strength >= 0.6
          ? 'active'
          : 'emerging'

    const { data, error } = await this.brainCognitionRepository.createBeliefPattern(
      target.serviceClient,
      {
        subject_id: context.subjectId,
        brain_id: context.brainId,
        pattern_name: patternName,
        description,
        emotional_signature: emotionalSignature,
        supporting_memories: supportingMemories,
        strength,
        status,
      },
    )

    if (error) return { success: false, error: `Failed to create belief pattern: ${error.message}` }
    return { success: true, pattern: data }
  }

  async updateBeliefPattern(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey: string | undefined,
    resolveCognitionContext: CognitionContextResolver,
  ) {
    const id = typeof input.id === 'string' ? input.id.trim() : ''
    if (!id) return { success: false, error: 'id is required' }

    const context = await resolveCognitionContext(target, input, sessionKey, 'train')
    if ('error' in context) return { success: false, error: context.error }
    const { data: existing } = await this.brainCognitionRepository.findBeliefPattern(
      target.serviceClient,
      { context, id, columns: 'id' },
    )
    if (!existing) return { success: false, error: 'Belief pattern not found or not owned by user' }

    const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (typeof input.pattern_name === 'string')
      updatePayload.pattern_name = input.pattern_name.trim()
    if (typeof input.description === 'string') updatePayload.description = input.description.trim()
    if (typeof input.strength === 'number')
      updatePayload.strength = Math.max(0, Math.min(1, input.strength))
    if (typeof input.status === 'string') {
      const validStatuses = ['emerging', 'active', 'challenged', 'transforming', 'resolved']
      if (validStatuses.includes(input.status)) updatePayload.status = input.status
    }
    if (input.emotional_signature && typeof input.emotional_signature === 'object')
      updatePayload.emotional_signature = input.emotional_signature
    if (typeof input.strength === 'number' && input.strength > 0)
      updatePayload.last_reinforced_at = new Date().toISOString()

    const { data, error } = await this.brainCognitionRepository.updateBeliefPattern(
      target.serviceClient,
      { id, payload: updatePayload, select: true },
    )

    if (error) return { success: false, error: `Failed to update belief pattern: ${error.message}` }
    return { success: true, pattern: data }
  }

  async archiveBeliefPattern(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey: string | undefined,
    resolveCognitionContext: CognitionContextResolver,
  ) {
    const id = typeof input.id === 'string' ? input.id.trim() : ''
    if (!id) return { success: false, error: 'id is required' }

    const context = await resolveCognitionContext(target, input, sessionKey, 'train')
    if ('error' in context) return { success: false, error: context.error }
    const { data: existing } = await this.brainCognitionRepository.findBeliefPattern(
      target.serviceClient,
      { context, id, columns: 'id' },
    )
    if (!existing) return { success: false, error: 'Belief pattern not found or not in this brain' }
    const { error } = await this.brainCognitionRepository.updateBeliefPattern(
      target.serviceClient,
      {
        id,
        payload: {
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      },
    )

    if (error)
      return { success: false, error: `Failed to archive belief pattern: ${error.message}` }
    return { success: true, archived: id }
  }

  async mergeBeliefPatterns(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey: string | undefined,
    resolveCognitionContext: CognitionContextResolver,
  ) {
    const primaryId = typeof input.primary_id === 'string' ? input.primary_id.trim() : ''
    const secondaryId = typeof input.secondary_id === 'string' ? input.secondary_id.trim() : ''
    if (!primaryId || !secondaryId)
      return { success: false, error: 'primary_id and secondary_id are required' }

    const context = await resolveCognitionContext(target, input, sessionKey, 'train')
    if ('error' in context) return { success: false, error: context.error }

    const { data: primary } = await this.brainCognitionRepository.findBeliefPattern(
      target.serviceClient,
      { context, id: primaryId, columns: '*' },
    )
    const { data: secondary } = await this.brainCognitionRepository.findBeliefPattern(
      target.serviceClient,
      { context, id: secondaryId, columns: '*' },
    )
    if (!primary || !secondary) return { success: false, error: 'One or both patterns not found' }

    const mergedMemories = [
      ...new Set([
        ...(primary.supporting_memories ?? []),
        ...(secondary.supporting_memories ?? []),
      ]),
    ].slice(0, 50)
    const mergedStrength = Math.min(
      1,
      Math.max(primary.strength ?? 0, secondary.strength ?? 0) + 0.1,
    )

    const mergedDescription =
      typeof input.description === 'string'
        ? input.description.trim()
        : `${primary.description} ${secondary.description}`

    await this.brainCognitionRepository.updateBeliefPattern(target.serviceClient, {
      id: primaryId,
      payload: {
        supporting_memories: mergedMemories,
        strength: mergedStrength,
        description: mergedDescription,
        last_reinforced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    })

    await this.brainCognitionRepository.updateBeliefPattern(target.serviceClient, {
      id: secondaryId,
      payload: {
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    })

    return { success: true, merged_into: primaryId, archived: secondaryId }
  }

  async connectBeliefToMemory(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey: string | undefined,
    resolveCognitionContext: CognitionContextResolver,
  ) {
    const beliefId = typeof input.belief_id === 'string' ? input.belief_id.trim() : ''
    const memoryId = typeof input.memory_id === 'string' ? input.memory_id.trim() : ''
    if (!beliefId || !memoryId)
      return { success: false, error: 'belief_id and memory_id are required' }

    const context = await resolveCognitionContext(target, input, sessionKey, 'train')
    if ('error' in context) return { success: false, error: context.error }
    const { data: belief } = await this.brainCognitionRepository.findBeliefPattern(
      target.serviceClient,
      { context, id: beliefId, columns: 'id, supporting_memories' },
    )
    if (!belief) return { success: false, error: 'Belief pattern not found' }
    const { data: memory } = await this.brainCognitionRepository.findMemory(
      target.serviceClient,
      memoryId,
    )
    if (!memory || memory.brain_id !== context.brainId) {
      return { success: false, error: 'Memory does not belong to the requested brain target' }
    }

    const current: string[] = belief.supporting_memories ?? []
    if (current.includes(memoryId)) return { success: true, already_connected: true }

    const { error } = await this.brainCognitionRepository.updateBeliefPattern(
      target.serviceClient,
      {
        id: beliefId,
        payload: {
          supporting_memories: [...current, memoryId],
          last_reinforced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      },
    )

    if (error) return { success: false, error: `Failed to connect: ${error.message}` }
    return { success: true, belief_id: beliefId, memory_id: memoryId }
  }

  async disconnectBeliefFromMemory(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey: string | undefined,
    resolveCognitionContext: CognitionContextResolver,
  ) {
    const beliefId = typeof input.belief_id === 'string' ? input.belief_id.trim() : ''
    const memoryId = typeof input.memory_id === 'string' ? input.memory_id.trim() : ''
    if (!beliefId || !memoryId)
      return { success: false, error: 'belief_id and memory_id are required' }

    const context = await resolveCognitionContext(target, input, sessionKey, 'train')
    if ('error' in context) return { success: false, error: context.error }
    const { data: belief } = await this.brainCognitionRepository.findBeliefPattern(
      target.serviceClient,
      { context, id: beliefId, columns: 'id, supporting_memories' },
    )
    if (!belief) return { success: false, error: 'Belief pattern not found' }
    const { data: memory } = await this.brainCognitionRepository.findMemory(
      target.serviceClient,
      memoryId,
    )
    if (!memory || memory.brain_id !== context.brainId) {
      return { success: false, error: 'Memory does not belong to the requested brain target' }
    }

    const updated = (belief.supporting_memories ?? []).filter((id: string) => id !== memoryId)
    const { error } = await this.brainCognitionRepository.updateBeliefPattern(
      target.serviceClient,
      {
        id: beliefId,
        payload: { supporting_memories: updated, updated_at: new Date().toISOString() },
      },
    )

    if (error) return { success: false, error: `Failed to disconnect: ${error.message}` }
    return { success: true, belief_id: beliefId, removed_memory_id: memoryId }
  }
}
