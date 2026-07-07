import * as fs from 'fs/promises'
import * as path from 'path'
import { Injectable } from '@nestjs/common'
import {
  composeDefinitionContent,
  expandRuntimeIdentityDefinitions,
  isUserProfileDefinitionFile,
  type AgentDefinitionRow,
  type AgentRegistryRow,
  type AgentSkillResourceRow,
  type AgentSkillRow,
  type AgentWorkflowRow,
  type SyncManifestEntry,
  type SyncResult,
} from './agent-sync.types'
import {
  createEmptySyncResult,
  type AgentSyncOrchestrationContext,
} from './agent-sync-orchestration.types'

@Injectable()
export class AgentSyncAllService {
  async syncAll(
    ctx: AgentSyncOrchestrationContext,
    overrideUserId?: string,
  ): Promise<SyncResult> {
    const emptyResult = createEmptySyncResult()
    const effectiveUserId = overrideUserId || ctx.getUserId()
    if (!effectiveUserId) {
      ctx.logger.warn('USER_ID not set — cannot sync')
      return emptyResult
    }

    const [
      defResult,
      skillResult,
      resourceResult,
      workflowResult,
      registryResult,
      systemKeys,
      skillDenySet,
    ] = await Promise.all([
      ctx.materializationRepository.listPersonalDefinitionsForAll(ctx.supabase, effectiveUserId),
      ctx.materializationRepository.listPersonalSkillsForAll(ctx.supabase, effectiveUserId),
      ctx.materializationRepository.listPersonalSkillResourcesForAll(ctx.supabase, effectiveUserId),
      ctx.materializationRepository.listPersonalWorkflowsForAll(ctx.supabase, effectiveUserId),
      ctx.materializationRepository.listPersonalRegistryRowsForAll(ctx.supabase, effectiveUserId),
      ctx.loadSystemAgentKeys(),
      ctx.loadSkillDenySet(effectiveUserId, null),
    ])

    const { data: definitionsRaw, error } = defResult
    if (error) {
      ctx.logger.error(`Failed to fetch agent definitions: ${error.message}`)
      return emptyResult
    }
    if (!definitionsRaw || definitionsRaw.length === 0) {
      ctx.logger.warn('No agent definitions found in DB — agents will have no identity files')
    }

    const { data: skillsRaw, error: skillsError } = skillResult
    if (skillsError) {
      ctx.logger.error(`Failed to fetch agent skills: ${skillsError.message}`)
      return emptyResult
    }

    const { data: skillResources, error: resourcesError } = resourceResult
    if (resourcesError) {
      ctx.logger.error(`Failed to fetch agent skill resources: ${resourcesError.message}`)
      return emptyResult
    }

    const { data: workflowsRaw, error: workflowsError } = workflowResult
    if (workflowsError) {
      ctx.logger.error(`Failed to fetch agent workflows: ${workflowsError.message}`)
    }

    const { data: registryRows, error: registryError } = registryResult
    if (registryError) {
      ctx.logger.error(`Failed to fetch agents registry: ${registryError.message}`)
      return emptyResult
    }

    const vibeyRegistry = ((registryRows ?? []) as AgentRegistryRow[]).find(
      (row) => row.agent_key === 'vibey',
    )
    const userArchetype =
      typeof vibeyRegistry?.config?.archetype === 'string'
        ? vibeyRegistry.config.archetype
        : null
    const definitions = ctx.filterSystemAgentRows(
      ((definitionsRaw ?? []) as AgentDefinitionRow[]).filter(
        (row) =>
          !row.archetype_filter ||
          row.archetype_filter.length === 0 ||
          (userArchetype && row.archetype_filter.includes(userArchetype)),
      ),
      systemKeys,
    )
    const runtimeDefinitions = expandRuntimeIdentityDefinitions(definitions)
    const skills = ((skillsRaw ?? []) as AgentSkillRow[])
      .filter(
        (row) =>
          !row.archetype_filter ||
          row.archetype_filter.length === 0 ||
          (userArchetype && row.archetype_filter.includes(userArchetype)),
      )
      .filter((row) => !skillDenySet.has(`${row.agent_key}:${row.skill_key}`))
    const workflows = ((workflowsRaw ?? []) as AgentWorkflowRow[]).filter(
      (row) =>
        !row.archetype_filter ||
        row.archetype_filter.length === 0 ||
        (userArchetype && row.archetype_filter.includes(userArchetype)),
    )

    const allSkillKeys = [...new Set(skills.map((skill) => skill.skill_key))]
    const libraryResources = await ctx.fetchLibraryResources(allSkillKeys)
    const manifest: SyncManifestEntry[] = []
    let synced = await this.writeDefinitionFiles(ctx, runtimeDefinitions, manifest)

    const skillsByAgent = this.groupByAgent(skills)
    const resourcesByAgent = this.groupByAgent(
      (skillResources ?? []) as AgentSkillResourceRow[],
    )
    const globalSkills = skillsByAgent.get('*') ?? []
    const globalResources = resourcesByAgent.get('*') ?? []
    skillsByAgent.delete('*')
    resourcesByAgent.delete('*')

    for (const [agentKey, rows] of skillsByAgent.entries()) {
      const merged = ctx.deduplicatePersonalSkills([...rows, ...globalSkills], effectiveUserId)
      const agentResources = ctx.deduplicatePersonalResources(
        [...(resourcesByAgent.get(agentKey) ?? []), ...globalResources],
        effectiveUserId,
      )
      const resourceRows = ctx.mergeWithLibraryFallback(agentResources, libraryResources)
      synced += await ctx.syncAgentSkills(agentKey, merged, resourceRows, false, manifest)
    }

    const workflowsByAgent = this.groupByAgent(workflows)
    for (const [agentKey, rows] of workflowsByAgent.entries()) {
      synced += await ctx.syncAgentWorkflows(agentKey, rows, false, manifest)
    }

    const registryByAgent = new Map<string, AgentRegistryRow>()
    for (const row of (registryRows ?? []) as AgentRegistryRow[]) {
      registryByAgent.set(row.agent_key, row)
    }

    const uniqueAgentKeys = this.collectAgentKeys(
      runtimeDefinitions,
      skillsByAgent,
      workflowsByAgent,
      registryByAgent,
    )
    let orgResult = { synced: 0, failed: [] as SyncResult['failed'] }
    await ctx.gateway.beginBatch()
    try {
      synced += await this.ensureAgents({
        ctx,
        effectiveUserId,
        globalResources,
        globalSkills,
        libraryResources,
        manifest,
        registryByAgent,
        runtimeDefinitions,
        skillsByAgent,
        uniqueAgentKeys,
      })

      orgResult = await ctx.syncAllOrgAgents(effectiveUserId).catch((err) => {
        ctx.logger.warn(`Org agents sync failed: ${(err as Error).message}`)
        return { synced: 0, failed: [] as SyncResult['failed'] }
      })
      synced += orgResult.synced

      await ctx.syncOrgSharedSkills(effectiveUserId, uniqueAgentKeys, manifest).catch((err) => {
        ctx.logger.warn(`Org shared skills sync failed: ${(err as Error).message}`)
      })
    } finally {
      await ctx.gateway.commitBatch()
    }

    const result = await ctx.verifyAndRetry(manifest, synced)
    if (orgResult.failed.length > 0) {
      result.failed.push(...orgResult.failed)
      result.healthy = result.failed.length === 0
    }
    ctx.setLastSyncResult(result)
    ctx.logger.log(
      `Synced ${result.synced} files (definitions + skills) from DB — healthy=${result.healthy}`,
    )
    return result
  }

  private async writeDefinitionFiles(
    ctx: AgentSyncOrchestrationContext,
    runtimeDefinitions: AgentDefinitionRow[],
    manifest: SyncManifestEntry[],
  ): Promise<number> {
    let synced = 0
    for (const def of runtimeDefinitions) {
      if (isUserProfileDefinitionFile(def.file_name)) continue
      const filePath = path.join(ctx.agentsBaseDir, def.agent_key, def.file_name)
      const composedContent = composeDefinitionContent(def.file_name, def.content)
      try {
        await fs.mkdir(path.dirname(filePath), { recursive: true })
        await fs.writeFile(filePath, composedContent, 'utf-8')
        manifest.push({
          category: 'definition',
          agentKey: def.agent_key,
          filePath,
          content: composedContent,
          status: 'ok',
        })
        synced++
      } catch (err) {
        const msg = (err as Error).message
        ctx.logger.error(`Failed to write ${filePath}: ${msg}`)
        manifest.push({
          category: 'definition',
          agentKey: def.agent_key,
          filePath,
          content: composedContent,
          status: 'failed',
          error: msg,
        })
      }
    }
    return synced
  }

  private groupByAgent<T extends { agent_key: string }>(rows: T[]): Map<string, T[]> {
    const byAgent = new Map<string, T[]>()
    for (const row of rows) {
      const current = byAgent.get(row.agent_key) ?? []
      current.push(row)
      byAgent.set(row.agent_key, current)
    }
    return byAgent
  }

  private collectAgentKeys(
    runtimeDefinitions: AgentDefinitionRow[],
    skillsByAgent: Map<string, AgentSkillRow[]>,
    workflowsByAgent: Map<string, AgentWorkflowRow[]>,
    registryByAgent: Map<string, AgentRegistryRow>,
  ): Set<string> {
    const uniqueAgentKeys = new Set<string>()
    for (const row of runtimeDefinitions) uniqueAgentKeys.add(row.agent_key)
    for (const key of skillsByAgent.keys()) uniqueAgentKeys.add(key)
    for (const key of workflowsByAgent.keys()) uniqueAgentKeys.add(key)
    for (const key of registryByAgent.keys()) uniqueAgentKeys.add(key)
    uniqueAgentKeys.delete('*')
    return uniqueAgentKeys
  }

  private async ensureAgents(input: {
    ctx: AgentSyncOrchestrationContext
    effectiveUserId: string
    globalResources: AgentSkillResourceRow[]
    globalSkills: AgentSkillRow[]
    libraryResources: AgentSkillResourceRow[]
    manifest: SyncManifestEntry[]
    registryByAgent: Map<string, AgentRegistryRow>
    runtimeDefinitions: AgentDefinitionRow[]
    skillsByAgent: Map<string, AgentSkillRow[]>
    uniqueAgentKeys: Set<string>
  }): Promise<number> {
    let synced = 0
    for (const agentKey of input.uniqueAgentKeys) {
      if (!input.skillsByAgent.has(agentKey) && input.globalSkills.length > 0) {
        const merged = input.ctx.deduplicatePersonalSkills(
          [...input.globalSkills],
          input.effectiveUserId,
        )
        const globalResourceRows = input.ctx.deduplicatePersonalResources(
          [...input.globalResources],
          input.effectiveUserId,
        )
        const resourceRows = input.ctx.mergeWithLibraryFallback(
          globalResourceRows,
          input.libraryResources,
        )
        synced += await input.ctx.syncAgentSkills(agentKey, merged, resourceRows, false, input.manifest)
        input.skillsByAgent.set(agentKey, merged)
      }

      const workspace = path.join(input.ctx.agentsBaseDir, agentKey)
      const enabledSkillKeys = input.ctx.resolveEnabledSkillKeys(
        input.skillsByAgent.get(agentKey) ?? [],
      )
      const agentDefinitions = input.runtimeDefinitions
        .filter((def) => def.agent_key === agentKey)
        .filter((def) => !isUserProfileDefinitionFile(def.file_name))
        .map((def) => ({ file_name: def.file_name, content: def.content }))

      const registry = input.registryByAgent.get(agentKey)
      if (registry) {
        const { actions: allowedActions, domain } = await input.ctx.resolveAllowedActions(registry, {
          orgId: null,
          userId: input.effectiveUserId,
        })
        await input.ctx.writeScopedVibeyApiSkill(
          agentKey,
          allowedActions,
          false,
          domain,
          input.manifest,
        )
      }

      if (agentKey === 'templates') continue

      const isBrainScholar =
        registry?.config?.archetype === 'brain_scholar' ||
        registry?.config?.capability_profile === 'system_brain'
      if (isBrainScholar) {
        synced += await input.ctx.syncBrainLibrary(agentKey, input.effectiveUserId, input.manifest)
      }

      await input.ctx.gateway.ensureAgent({
        agentKey,
        name: agentKey,
        workspace,
        definitions: agentDefinitions,
        skills: enabledSkillKeys,
      })
    }
    return synced
  }
}
