import { Injectable } from '@nestjs/common'
import { ArtifactBrainNarrativeRepository } from '../repositories/artifact-brain-narrative.repository'

type NarrativeBrainResolver = (
  target: Record<string, any>,
  input: Record<string, unknown>,
  userId: string,
  sessionKey?: string,
  requiredAccess?: 'view' | 'query' | 'train',
) => Promise<{ brainId: string } | { error: string }>

@Injectable()
export class ArtifactBrainLintActionsService {
  constructor(
    private readonly brainNarrativeRepository: ArtifactBrainNarrativeRepository = new ArtifactBrainNarrativeRepository(),
  ) {}

  async getBrainLint(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey: string | undefined,
    resolveNarrativeBrainId: NarrativeBrainResolver,
  ) {
    const userId = target.resolveUserId(sessionKey)
    const resolved = await resolveNarrativeBrainId(target, input, userId, sessionKey, 'query')
    if ('error' in resolved) return { success: false, error: resolved.error }
    const brainId = resolved.brainId

    const checkType = typeof input.check_type === 'string' ? input.check_type.trim() : null
    const severity = typeof input.severity === 'string' ? input.severity.trim() : null
    const showResolved = input.resolved === true
    const limit = typeof input.limit === 'number' ? Math.min(input.limit, 50) : 20
    const { data, error } = await this.brainNarrativeRepository.listLintResults(
      target.serviceClient,
      { brainId, checkType, severity, showResolved, limit },
    )
    if (error) return { success: false, error: `Failed to read lint results: ${error.message}` }
    return { success: true, count: (data ?? []).length, results: data ?? [] }
  }

  async runBrainLint(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey: string | undefined,
    resolveNarrativeBrainId: NarrativeBrainResolver,
  ) {
    const userId = target.resolveUserId(sessionKey)
    const resolved = await resolveNarrativeBrainId(target, input, userId, sessionKey, 'train')
    if ('error' in resolved) return { success: false, error: resolved.error }
    const brainId = resolved.brainId

    const { data: brain } = await this.brainNarrativeRepository.findBrainForLint(
      target.serviceClient,
      brainId,
    )
    if (!brain?.owner_id) return { success: false, error: 'Brain not found' }
    if (brain.cortex_max !== true)
      return { success: false, error: 'Enable Cortex Max to use brain lint' }

    const { error: insertErr } = await this.brainNarrativeRepository.enqueueBrainLint(
      target.serviceClient,
      {
        brain_id: brainId,
        user_id: brain.owner_id,
        org_id: brain.org_id ?? null,
        event_type: 'brain_lint',
        dedupe_key: `brain-lint-${brainId}-${Date.now()}`,
        payload: {},
      },
    )

    if (insertErr) return { success: false, error: `Failed to enqueue lint: ${insertErr.message}` }
    return { success: true, message: 'Lint job enqueued' }
  }

  async resolveBrainLint(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey: string | undefined,
    resolveNarrativeBrainId: NarrativeBrainResolver,
  ) {
    const id = typeof input.id === 'string' ? input.id.trim() : ''
    if (!id) return { success: false, error: 'id is required' }
    const userId = target.resolveUserId(sessionKey)
    const resolved = await resolveNarrativeBrainId(target, input, userId, sessionKey, 'train')
    if ('error' in resolved) return { success: false, error: resolved.error }
    const { data: existing } = await this.brainNarrativeRepository.findLintResult(
      target.serviceClient,
      id,
    )
    if (!existing || existing.brain_id !== resolved.brainId) {
      return { success: false, error: 'Lint result does not belong to the requested brain target' }
    }

    const { error } = await this.brainNarrativeRepository.resolveLintResult(
      target.serviceClient,
      id,
    )

    if (error) return { success: false, error: `Failed to resolve lint result: ${error.message}` }
    return { success: true, resolved: id }
  }
}
