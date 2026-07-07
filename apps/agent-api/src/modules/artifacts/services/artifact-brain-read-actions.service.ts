import { Injectable } from '@nestjs/common'
import { ArtifactBrainScholarRepository } from '../repositories/artifact-brain-scholar.repository'
import { ArtifactBrainAccessService } from './artifact-brain-access.service'

@Injectable()
export class ArtifactBrainReadActionsService {
  constructor(
    private readonly brainScholarRepository: ArtifactBrainScholarRepository = new ArtifactBrainScholarRepository(),
    private readonly brainAccessService: ArtifactBrainAccessService = new ArtifactBrainAccessService(),
  ) {}

  async getBrainStats(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const userId = target.resolveUserId(sessionKey)
    const sessionAgentKey = this.brainAccessService.resolveSessionAgentKey(target, sessionKey)
    const inferredScope = sessionAgentKey && sessionAgentKey !== 'vibey' ? 'agent' : 'user'
    const scopeRaw = String(input.scope ?? inferredScope)
      .trim()
      .toLowerCase()
    if (scopeRaw !== 'user' && scopeRaw !== 'agent') {
      return { success: false, error: 'scope must be user or agent' }
    }

    if (scopeRaw === 'user') {
      const brainId = await this.brainAccessService.resolveBrainId(target, userId)
      const [memResult, skResult] = await Promise.all([
        this.brainScholarRepository.countMemories(target.serviceClient, brainId),
        this.brainScholarRepository.listSkDomainsForStats(target.serviceClient, brainId),
      ])

      const totalMemories = memResult.count ?? 0
      const totalSkEntries = skResult.count ?? 0
      const topDomains = this.aggregateSkDomains(
        (skResult.data ?? []) as Array<{ domain: string | null }>,
      )

      return {
        success: true,
        scope: 'user',
        brain_id: brainId,
        totalMemories,
        totalSkEntries,
        topDomains,
      }
    }

    if (scopeRaw === 'agent') {
      const agentId = String(input.agent_id ?? input.agent_key ?? sessionAgentKey ?? '').trim()
      if (!agentId) {
        return { success: false, error: 'agent_id or agent_key is required when scope is agent' }
      }
      const orgId = target.resolveOrgId?.(sessionKey) ?? null
      const brainId = await this.brainAccessService.resolveAgentBrainId(
        target,
        userId,
        agentId,
        orgId,
      )
      if (!brainId) {
        return {
          success: true,
          scope: 'agent',
          agent_id: agentId,
          provisioned: false,
          brain_id: null,
          totalMemories: 0,
          totalSkEntries: 0,
          topDomains: [] as Array<{ domain: string; count: number }>,
        }
      }

      const [memResult, skResult] = await Promise.all([
        this.brainScholarRepository.countMemories(target.serviceClient, brainId),
        this.brainScholarRepository.listSkDomainsForStats(target.serviceClient, brainId),
      ])

      const totalMemories = memResult.count ?? 0
      const totalSkEntries = skResult.count ?? 0
      const topDomains = this.aggregateSkDomains(
        (skResult.data ?? []) as Array<{ domain: string | null }>,
      )

      return {
        success: true,
        scope: 'agent',
        agent_id: agentId,
        provisioned: true,
        brain_id: brainId,
        totalMemories,
        totalSkEntries,
        topDomains,
      }
    }
  }

  async listBrainScopes(
    target: Record<string, any>,
    _input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const userId = target.resolveUserId(sessionKey)

    const { data: brains, error: bErr } = await this.brainScholarRepository.listBrainScopes(
      target.serviceClient,
      userId,
    )
    if (bErr) return { success: false, error: `Failed to list brains: ${bErr.message}` }

    const defaultBrain = (brains ?? []).find((b: { is_default?: boolean }) => b.is_default === true)
    const agentBrains = (brains ?? [])
      .filter((b: { agent_id?: string | null }) => b.agent_id != null && String(b.agent_id).trim())
      .map((b: { id: string; name?: string | null; agent_id?: string | null }) => ({
        brain_id: b.id,
        name: b.name ?? null,
        agent_id: String(b.agent_id),
      }))

    return {
      success: true,
      default_brain_id: defaultBrain?.id ?? null,
      brains: (brains ?? []).map(
        (b: {
          id: string
          name?: string | null
          is_default?: boolean
          agent_id?: string | null
        }) => ({
          brain_id: b.id,
          name: b.name ?? null,
          is_default: b.is_default === true,
          agent_id: b.agent_id != null ? String(b.agent_id) : null,
        }),
      ),
      agent_brains: agentBrains,
    }
  }

  async listRecentMemories(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const userId = target.resolveUserId(sessionKey)
    const brainId = await this.brainAccessService.resolveBrainId(target, userId)
    const rawLimit = Number(input.limit ?? 20)
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 20

    const { data, error } = await this.brainScholarRepository.listRecentMemories(
      target.serviceClient,
      { brainId, limit },
    )
    if (error) return { success: false, error: `Failed to list memories: ${error.message}` }

    const memories = (data ?? []).map((m: Record<string, unknown>) => ({
      ...m,
      node_type: 'memory',
    }))
    return { success: true, count: memories.length, memories }
  }

  async listBrainDomains(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const userId = target.resolveUserId(sessionKey)
    const resolved = await this.brainAccessService.resolveReadableAgentBrainId(
      target,
      userId,
      input,
      sessionKey,
    )
    if ('error' in resolved) {
      return {
        success: false,
        error: resolved.error,
      }
    }
    const { brainId } = resolved
    if (!brainId) return { success: false, error: 'Agent Brain is not provisioned.' }

    const { data: skRows, error: skError } = await this.brainScholarRepository.listBrainDomains(
      target.serviceClient,
      brainId,
    )
    if (skError) return { success: false, error: `Failed to list domains: ${skError.message}` }

    const domains = this.aggregateSkDomains((skRows ?? []) as Array<{ domain: string | null }>)
    return { success: true, brain_id: brainId, domains }
  }

  async getBrainGaps(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const userId = target.resolveUserId(sessionKey)
    const resolved = await this.brainAccessService.resolveReadableAgentBrainId(
      target,
      userId,
      input,
      sessionKey,
    )
    if ('error' in resolved) {
      return {
        success: false,
        error: resolved.error,
      }
    }
    const { brainId } = resolved
    if (!brainId) return { success: false, error: 'Agent Brain is not provisioned.' }

    const { data: gaps, error: gapsError } = await this.brainScholarRepository.listBrainGaps(
      target.serviceClient,
      brainId,
    )
    if (gapsError)
      return { success: false, error: `Failed to load brain gaps: ${gapsError.message}` }

    const { data: skRows } = await this.brainScholarRepository.listBrainDomains(
      target.serviceClient,
      brainId,
    )

    const thinDomains = this.aggregateSkDomains(
      (skRows ?? []) as Array<{ domain: string | null }>,
    )
      .filter(({ count }) => count < 5)
      .sort((a, b) => a.count - b.count)
      .map(({ domain, count: entryCount }) => ({
        domain,
        entryCount,
        suggestion: `Domain "${domain}" has only ${entryCount} entries. Consider adding more knowledge.`,
      }))

    return {
      success: true,
      brain_id: brainId,
      gaps: gaps ?? [],
      thinDomains,
    }
  }

  async listBrainImports(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const userId = target.resolveUserId(sessionKey)
    const resolved = await this.brainAccessService.resolveReadableAgentBrainId(
      target,
      userId,
      input,
      sessionKey,
    )
    if ('error' in resolved) {
      return {
        success: false,
        error: resolved.error,
      }
    }
    const { brainId } = resolved
    if (!brainId) return { success: false, error: 'Agent Brain is not provisioned.' }
    const source = String(input.source ?? 'all')
      .trim()
      .toLowerCase()
    const rawLimit = Number(input.limit ?? 20)
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 20

    const { data, error } = await this.brainScholarRepository.listBrainImports(
      target.serviceClient,
      { brainId, source, limit },
    )
    if (error) return { success: false, error: `Failed to list brain imports: ${error.message}` }

    return {
      success: true,
      brain_id: brainId,
      source,
      count: (data ?? []).length,
      imports: data ?? [],
    }
  }

  private aggregateSkDomains(rows: Array<{ domain: string | null }>) {
    const domainCounts = new Map<string, number>()
    for (const row of rows) {
      const domain = row.domain ?? 'general'
      domainCounts.set(domain, (domainCounts.get(domain) ?? 0) + 1)
    }
    return [...domainCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([domain, count]) => ({ domain, count }))
  }
}
