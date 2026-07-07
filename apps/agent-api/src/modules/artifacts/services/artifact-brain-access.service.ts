import { Injectable } from '@nestjs/common'
import { ArtifactBrainScholarRepository } from '../repositories/artifact-brain-scholar.repository'

export type ResolvedReadableAgentBrain =
  | {
      brainId: string | null
      agentKey: string
      resolvedFrom: 'brain_id' | 'agent_input' | 'session'
    }
  | { error: string }

@Injectable()
export class ArtifactBrainAccessService {
  constructor(
    private readonly brainScholarRepository: ArtifactBrainScholarRepository = new ArtifactBrainScholarRepository(),
  ) {}

  async resolveAgentSkBrain(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const userId = target.resolveUserId(sessionKey)
    const resolved = await this.resolveReadableAgentBrainId(target, userId, input, sessionKey, {
      allowMissingBrain: true,
    })
    if ('error' in resolved) {
      return {
        success: false,
        error: resolved.error,
      }
    }
    return {
      success: true,
      agent_id: resolved.agentKey,
      resolved_from: resolved.resolvedFrom,
      brain_id: resolved.brainId,
      provisioned: resolved.brainId !== null,
    }
  }

  async resolveBrainId(target: Record<string, any>, userId: string): Promise<string> {
    const { data } = await this.brainScholarRepository.findDefaultUserBrain(
      target.serviceClient,
      userId,
    )
    if (data?.[0]?.id) return data[0].id

    const { data: created, error } = await this.brainScholarRepository.createDefaultUserBrain(
      target.serviceClient,
      userId,
    )

    if (error || !created) throw new Error('Could not resolve user brain')
    return created.id
  }

  async resolveAgentBrainId(
    target: Record<string, any>,
    userId: string,
    agentKey: string,
    orgId?: string | null,
  ): Promise<string | null> {
    const { data, error } = await this.brainScholarRepository.findAgentBrain(target.serviceClient, {
      userId,
      agentKey,
      orgId,
    })
    if (error) throw new Error(`Failed to resolve agent brain: ${error.message}`)
    return data?.id ? String(data.id) : null
  }

  resolveSessionAgentKey(target: Record<string, any>, sessionKey?: string): string | null {
    return typeof target.parseAgentIdFromSessionKey === 'function' && sessionKey
      ? (target.parseAgentIdFromSessionKey(sessionKey) ?? null)
      : null
  }

  canReadAnyAgentBrain(target: Record<string, any>, sessionKey?: string): boolean {
    const sessionAgentKey = this.resolveSessionAgentKey(target, sessionKey)
    const configuredAgentKey = target.config?.agentKey as string | undefined
    const agentKey = String(sessionAgentKey ?? configuredAgentKey ?? '').toLowerCase()
    return agentKey === 'atlas' || agentKey === 'brain_scholar'
  }

  async resolveReadableAgentBrainId(
    target: Record<string, any>,
    userId: string,
    input: Record<string, unknown>,
    sessionKey?: string,
    opts?: { allowMissingBrain?: boolean },
  ): Promise<ResolvedReadableAgentBrain> {
    const sessionAgentKey = this.resolveSessionAgentKey(target, sessionKey)
    if (!sessionAgentKey) {
      return { error: 'agent session is required to access an Agent Brain.' }
    }

    const orgId = target.resolveOrgId?.(sessionKey) ?? null
    const explicitBrainId = String(input.brain_id ?? input.brainId ?? '').trim()
    const explicitAgentKey = String(input.agent_key ?? input.agent_id ?? '').trim()
    const canReadAny = this.canReadAnyAgentBrain(target, sessionKey)

    if (!canReadAny && explicitAgentKey && explicitAgentKey !== sessionAgentKey) {
      return { error: 'Agent Brain access is limited to the calling agent.' }
    }

    if (explicitBrainId) {
      if (!canReadAny) {
        const ownBrainId = await this.resolveAgentBrainId(target, userId, sessionAgentKey, orgId)
        if (!ownBrainId) {
          return opts?.allowMissingBrain
            ? { brainId: null, agentKey: sessionAgentKey, resolvedFrom: 'session' }
            : { error: 'The calling agent does not have an Agent Brain provisioned.' }
        }
        if (explicitBrainId !== ownBrainId) {
          return { error: 'Agent Brain access is limited to the calling agent.' }
        }
      }
      return {
        brainId: explicitBrainId,
        agentKey: explicitAgentKey || sessionAgentKey,
        resolvedFrom: 'brain_id',
      }
    }

    const agentKey = explicitAgentKey || sessionAgentKey
    const brainId = await this.resolveAgentBrainId(target, userId, agentKey, orgId)
    if (!brainId && !opts?.allowMissingBrain) {
      return { error: 'brain_id could not be inferred from the calling agent session.' }
    }
    return {
      brainId,
      agentKey,
      resolvedFrom: explicitAgentKey ? 'agent_input' : 'session',
    }
  }

  async resolveReadableBrainId(
    target: Record<string, any>,
    userId: string,
    input: Record<string, unknown>,
    sessionKey?: string,
  ): Promise<{
    brainId: string
    resolvedFrom: 'input' | 'agent_session' | 'user_default'
    agentKey?: string
  }> {
    const explicitBrainId =
      typeof input.brain_id === 'string' && input.brain_id.trim().length > 0
        ? input.brain_id.trim()
        : ''
    if (explicitBrainId) return { brainId: explicitBrainId, resolvedFrom: 'input' }

    const orgId = target.resolveOrgId?.(sessionKey) ?? null
    const agentKey = this.resolveSessionAgentKey(target, sessionKey)
    if (agentKey && agentKey !== 'vibey') {
      const agentBrainId = await this.resolveAgentBrainId(target, userId, agentKey, orgId)
      if (agentBrainId) {
        return { brainId: agentBrainId, resolvedFrom: 'agent_session', agentKey }
      }
    }

    return { brainId: await this.resolveBrainId(target, userId), resolvedFrom: 'user_default' }
  }

  async resolveBrainIdFromSession(
    target: Record<string, any>,
    userId: string,
    input: Record<string, unknown>,
    sessionKey?: string,
  ): Promise<string | null> {
    const resolved = await this.resolveReadableAgentBrainId(target, userId, input, sessionKey)
    return 'error' in resolved ? null : resolved.brainId
  }

  validateBrainTarget(
    sessionKey: string | undefined,
    allowedBrains: string[],
    actionName: string,
    suggestion: string,
  ): { success: false; error: string } | null {
    if (!sessionKey?.includes('-brain-job-')) return null
    const brainMatch = sessionKey.match(/::brain:([^:]+)/)
    if (!brainMatch) return null
    const targetBrain = brainMatch[1]
    if (allowedBrains.includes(targetBrain)) return null
    return {
      success: false,
      error: `WRONG BRAIN: "${actionName}" targets the ${allowedBrains.join('/')} brain, but this job targets the "${targetBrain}" brain. ${suggestion}`,
    }
  }

  parseBrainIdFromBrainJobSession(sessionKey?: string): string | null {
    if (!sessionKey?.includes('-brain-job-')) return null
    const brainMatch = sessionKey.match(/::brain:[^:]+:([^:]+)/)
    return brainMatch?.[1]?.trim() || null
  }

  async assertCanAccessBrain(
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
    const { data, error } = await this.brainScholarRepository.canAccessBrain(userClient, {
      brainId,
      required,
    })
    if (error) {
      return { success: false, error: `Failed to verify brain permissions: ${error.message}` }
    }
    if (data !== true) return { success: false, error: 'Insufficient brain permissions' }
    return null
  }
}
