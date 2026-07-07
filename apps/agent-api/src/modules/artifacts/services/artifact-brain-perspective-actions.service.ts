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
export class ArtifactBrainPerspectiveActionsService {
  constructor(
    private readonly brainCognitionRepository: ArtifactBrainCognitionRepository = new ArtifactBrainCognitionRepository(),
  ) {}

  async getPerspectives(
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
      cursorScope: buildBrainReadCursorScope('get_brain_perspectives', {
        brainId: context.brainId,
        subjectId: context.subjectId,
        includeLegacySubjectFallback: context.includeLegacySubjectFallback,
        status,
        includeDetails,
      }),
    })
    if ('error' in pageRequest) return { success: false, error: pageRequest.error }
    const { data, error } = await this.brainCognitionRepository.listPerspectives(
      target.serviceClient,
      {
        context,
        status,
        limit: pageRequest.fetchLimit,
        offset: pageRequest.offset,
        includeDetails,
      },
    )
    if (error) return { success: false, error: `Failed to read perspectives: ${error.message}` }
    const { items: perspectives, pagination } = buildBrainReadPage(pageRequest, data ?? [])
    return {
      success: true,
      count: perspectives.length,
      pagination,
      result_policy: includeDetails
        ? {
            mode: 'detail',
            continuation_hint: 'Use pagination.next_cursor to read the next detail batch.',
          }
        : {
            mode: 'summary',
            omitted_fields: ['narrative_md', 'blind_spots'],
            detail_hint: 'Pass include_details=true for selected detail batches.',
            continuation_hint: 'Use pagination.next_cursor to read the next summary batch.',
          },
      perspectives,
    }
  }

  async createPerspective(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey: string | undefined,
    resolveCognitionContext: CognitionContextResolver,
  ) {
    const context = await resolveCognitionContext(target, input, sessionKey, 'train')
    if ('error' in context) return { success: false, error: context.error }
    const name = typeof input.name === 'string' ? input.name.trim() : ''
    const description = typeof input.description === 'string' ? input.description.trim() : ''
    if (!name) return { success: false, error: 'name is required' }
    if (!description) return { success: false, error: 'description is required' }

    const narrativeMd = typeof input.narrative_md === 'string' ? input.narrative_md : ''
    const beliefs = Array.isArray(input.beliefs)
      ? input.beliefs.filter((id): id is string => typeof id === 'string').slice(0, 20)
      : []
    const influenceAreas = Array.isArray(input.influence_areas)
      ? input.influence_areas.filter((a): a is string => typeof a === 'string')
      : []
    const blindSpots = typeof input.blind_spots === 'string' ? input.blind_spots.trim() : null
    const strength =
      typeof input.strength === 'number' ? Math.max(0.1, Math.min(1, input.strength)) : 0.3

    const { data, error } = await this.brainCognitionRepository.createPerspective(
      target.serviceClient,
      {
        subject_id: context.subjectId,
        brain_id: context.brainId,
        name,
        description,
        narrative_md: narrativeMd,
        beliefs,
        influence_areas: influenceAreas,
        blind_spots: blindSpots,
        strength,
        status: strength >= 0.6 ? 'active' : 'emerging',
      },
    )

    if (error) return { success: false, error: `Failed to create perspective: ${error.message}` }
    return { success: true, perspective: data }
  }

  async updatePerspective(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey: string | undefined,
    resolveCognitionContext: CognitionContextResolver,
  ) {
    const id = typeof input.id === 'string' ? input.id.trim() : ''
    if (!id) return { success: false, error: 'id is required' }

    const context = await resolveCognitionContext(target, input, sessionKey, 'train')
    if ('error' in context) return { success: false, error: context.error }
    const { data: existing } = await this.brainCognitionRepository.findPerspective(
      target.serviceClient,
      { context, id, columns: 'id' },
    )
    if (!existing) return { success: false, error: 'Perspective not found or not owned by user' }

    const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (typeof input.name === 'string') updatePayload.name = input.name.trim()
    if (typeof input.description === 'string') updatePayload.description = input.description.trim()
    if (typeof input.narrative_md === 'string') updatePayload.narrative_md = input.narrative_md
    if (typeof input.strength === 'number')
      updatePayload.strength = Math.max(0, Math.min(1, input.strength))
    if (typeof input.status === 'string') {
      const validStatuses = ['emerging', 'active', 'challenged', 'transformed']
      if (validStatuses.includes(input.status)) updatePayload.status = input.status
    }
    if (typeof input.blind_spots === 'string') updatePayload.blind_spots = input.blind_spots.trim()

    const { data, error } = await this.brainCognitionRepository.updatePerspective(
      target.serviceClient,
      { id, payload: updatePayload, select: true },
    )

    if (error) return { success: false, error: `Failed to update perspective: ${error.message}` }
    return { success: true, perspective: data }
  }

  async archivePerspective(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey: string | undefined,
    resolveCognitionContext: CognitionContextResolver,
  ) {
    const id = typeof input.id === 'string' ? input.id.trim() : ''
    if (!id) return { success: false, error: 'id is required' }

    const context = await resolveCognitionContext(target, input, sessionKey, 'train')
    if ('error' in context) return { success: false, error: context.error }
    const { data: existing } = await this.brainCognitionRepository.findPerspective(
      target.serviceClient,
      { context, id, columns: 'id' },
    )
    if (!existing) return { success: false, error: 'Perspective not found or not in this brain' }
    const { error } = await this.brainCognitionRepository.updatePerspective(target.serviceClient, {
      id,
      payload: { status: 'transformed', updated_at: new Date().toISOString() },
    })

    if (error) return { success: false, error: `Failed to archive perspective: ${error.message}` }
    return { success: true, archived: id }
  }

  async connectBeliefToPerspective(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey: string | undefined,
    resolveCognitionContext: CognitionContextResolver,
  ) {
    const perspectiveId =
      typeof input.perspective_id === 'string' ? input.perspective_id.trim() : ''
    const beliefId = typeof input.belief_id === 'string' ? input.belief_id.trim() : ''
    if (!perspectiveId || !beliefId)
      return { success: false, error: 'perspective_id and belief_id are required' }

    const context = await resolveCognitionContext(target, input, sessionKey, 'train')
    if ('error' in context) return { success: false, error: context.error }
    const { data: perspective } = await this.brainCognitionRepository.findPerspective(
      target.serviceClient,
      { context, id: perspectiveId, columns: 'id, beliefs' },
    )
    if (!perspective) return { success: false, error: 'Perspective not found' }
    const { data: belief } = await this.brainCognitionRepository.findBeliefPattern(
      target.serviceClient,
      { context, id: beliefId, columns: 'id' },
    )
    if (!belief) return { success: false, error: 'Belief pattern not found in this brain' }

    const current: string[] = perspective.beliefs ?? []
    if (current.includes(beliefId)) return { success: true, already_connected: true }

    const { error } = await this.brainCognitionRepository.updatePerspective(target.serviceClient, {
      id: perspectiveId,
      payload: { beliefs: [...current, beliefId], updated_at: new Date().toISOString() },
    })

    if (error) return { success: false, error: `Failed to connect: ${error.message}` }
    return { success: true, perspective_id: perspectiveId, belief_id: beliefId }
  }

  async disconnectBeliefFromPerspective(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey: string | undefined,
    resolveCognitionContext: CognitionContextResolver,
  ) {
    const perspectiveId =
      typeof input.perspective_id === 'string' ? input.perspective_id.trim() : ''
    const beliefId = typeof input.belief_id === 'string' ? input.belief_id.trim() : ''
    if (!perspectiveId || !beliefId)
      return { success: false, error: 'perspective_id and belief_id are required' }

    const context = await resolveCognitionContext(target, input, sessionKey, 'train')
    if ('error' in context) return { success: false, error: context.error }
    const { data: perspective } = await this.brainCognitionRepository.findPerspective(
      target.serviceClient,
      { context, id: perspectiveId, columns: 'id, beliefs' },
    )
    if (!perspective) return { success: false, error: 'Perspective not found' }

    const updated = (perspective.beliefs ?? []).filter((id: string) => id !== beliefId)
    const { error } = await this.brainCognitionRepository.updatePerspective(target.serviceClient, {
      id: perspectiveId,
      payload: { beliefs: updated, updated_at: new Date().toISOString() },
    })

    if (error) return { success: false, error: `Failed to disconnect: ${error.message}` }
    return { success: true, perspective_id: perspectiveId, removed_belief_id: beliefId }
  }
}
