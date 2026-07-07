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
  type AgentWorkflowRow,
  type SyncManifestEntry,
  type SyncResult,
} from './agent-sync.types'
import {
  createEmptySyncResult,
  type AgentSyncOrchestrationContext,
} from './agent-sync-orchestration.types'

@Injectable()
export class AgentSyncAgentService {
  async syncAgent(
    ctx: AgentSyncOrchestrationContext,
    agentKey: string,
    overrideUserId?: string,
    useExistingGatewayBatch = false,
  ): Promise<SyncResult> {
    const emptyResult = createEmptySyncResult()
    const effectiveUserId = overrideUserId || ctx.getUserId()
    if (!effectiveUserId) return emptyResult

    const systemKeys = await ctx.loadSystemAgentKeys()
    const isSystemAgent = systemKeys.has(agentKey)
    const skillDenySet = await ctx.loadSkillDenySet(effectiveUserId, null)

    const { data: dataRaw, error } =
      await ctx.materializationRepository.listPersonalAgentDefinitions(ctx.supabase, {
        userId: effectiveUserId,
        agentKey,
        isSystemAgent,
      })

    if (error) {
      ctx.logger.error(`Failed to fetch definitions for ${agentKey}: ${error.message}`)
      return emptyResult
    }

    const { data: registryRows, error: registryError } =
      await ctx.materializationRepository.listPersonalAgentRegistryRows(ctx.supabase, {
        userId: effectiveUserId,
        agentKey,
        isSystemAgent,
      })
    if (registryError) {
      ctx.logger.error(`Failed to fetch agent registry for ${agentKey}: ${registryError.message}`)
      return emptyResult
    }

    const registry = ((registryRows ?? []) as AgentRegistryRow[])[0]
    const agentArchetype =
      agentKey === 'vibey' && registry
        ? typeof registry.config?.archetype === 'string'
          ? registry.config.archetype
          : null
        : null
    const data = ((dataRaw ?? []) as AgentDefinitionRow[]).filter(
      (row) =>
        !row.archetype_filter ||
        row.archetype_filter.length === 0 ||
        (agentArchetype && row.archetype_filter.includes(agentArchetype)),
    )
    const runtimeData = expandRuntimeIdentityDefinitions(data)
    const sharedRuntime = ctx.isSharedRuntime()
    const agentDir = sharedRuntime
      ? path.join(ctx.agentsBaseDir, 'users', effectiveUserId, agentKey)
      : path.join(ctx.agentsBaseDir, agentKey)
    const gatewayAgentId = sharedRuntime ? `user-${effectiveUserId}-${agentKey}` : agentKey
    await ctx.cleanupStaleDefinitionFiles(agentDir, runtimeData)

    const manifest: SyncManifestEntry[] = []
    let synced = await this.writeDefinitionFiles(ctx, agentKey, agentDir, runtimeData, manifest)

    const runtimeSkillScope = await ctx.skillScope.resolveRuntimeSkillScope({
      agentKey,
      userId: effectiveUserId,
      orgId: null,
      archetype: agentArchetype,
    })
    const skillRows = runtimeSkillScope.skills.filter(
      (row) => !skillDenySet.has(`${row.agent_key}:${row.skill_key}`),
    )

    const agentSkillKeys = [...new Set(skillRows.map((skill) => skill.skill_key))]
    const libraryResources = await ctx.fetchLibraryResources(agentSkillKeys)
    const mergedResources = ctx.mergeWithLibraryFallback(
      runtimeSkillScope.resources as AgentSkillResourceRow[],
      libraryResources,
    )

    synced += await ctx.syncAgentSkills(
      sharedRuntime ? agentDir : agentKey,
      skillRows,
      mergedResources,
      sharedRuntime,
      manifest,
    )

    const { data: workflowRowsRaw, error: workflowsError } =
      await ctx.materializationRepository.listPersonalAgentWorkflows(ctx.supabase, {
        userId: effectiveUserId,
        agentKey,
      })
    if (workflowsError) {
      ctx.logger.error(`Failed to fetch workflows for ${agentKey}: ${workflowsError.message}`)
    }
    const workflowRows = ((workflowRowsRaw ?? []) as AgentWorkflowRow[]).filter(
      (row) =>
        !row.archetype_filter ||
        row.archetype_filter.length === 0 ||
        (agentArchetype && row.archetype_filter.includes(agentArchetype)),
    )
    synced += await ctx.syncAgentWorkflows(
      sharedRuntime ? agentDir : agentKey,
      workflowRows,
      sharedRuntime,
      manifest,
    )

    if (registry) {
      const { actions: allowedActions, domain } = await ctx.resolveAllowedActions(registry, {
        orgId: null,
        userId: effectiveUserId,
      })
      await ctx.writeScopedVibeyApiSkill(
        sharedRuntime ? agentDir : agentKey,
        allowedActions,
        sharedRuntime,
        domain,
        manifest,
      )
    }

    const sharedSkillCount = await ctx.syncSharedSkillsForAgent({
      userId: effectiveUserId,
      orgId: null,
      agentDir,
      agentKey,
      manifest,
    })
    synced += sharedSkillCount

    const isBrainScholar =
      registry?.config?.archetype === 'brain_scholar' ||
      registry?.config?.capability_profile === 'system_brain'
    if (isBrainScholar) {
      synced += await ctx.syncBrainLibrary(agentKey, effectiveUserId, manifest, agentDir)
    }

    if (agentKey !== 'templates') {
      if (!useExistingGatewayBatch) await ctx.gateway.beginBatch()
      try {
        await ctx.gateway.ensureAgent({
          agentKey: gatewayAgentId,
          name: agentKey,
          workspace: agentDir,
          definitions: runtimeData
            .filter((def) => !isUserProfileDefinitionFile(def.file_name))
            .map((def) => ({
              file_name: def.file_name,
              content: def.content,
            })),
          skills: ctx.resolveEnabledSkillKeys(skillRows),
        })
      } finally {
        if (!useExistingGatewayBatch) await ctx.gateway.commitBatch()
      }
    }

    const result = await ctx.verifyAndRetry(manifest, synced)
    ctx.setLastSyncResult(result)
    ctx.logger.log(
      `Synced ${result.synced} files for agent ${agentKey} — healthy=${result.healthy}`,
    )
    return result
  }

  private async writeDefinitionFiles(
    ctx: AgentSyncOrchestrationContext,
    agentKey: string,
    agentDir: string,
    runtimeData: AgentDefinitionRow[],
    manifest: SyncManifestEntry[],
  ): Promise<number> {
    let synced = 0
    for (const def of runtimeData) {
      if (isUserProfileDefinitionFile(def.file_name)) continue
      const filePath = path.join(agentDir, def.file_name)
      const composedContent = composeDefinitionContent(def.file_name, def.content)
      try {
        await fs.mkdir(path.dirname(filePath), { recursive: true })
        await fs.writeFile(filePath, composedContent, 'utf-8')
        manifest.push({
          category: 'definition',
          agentKey,
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
          agentKey,
          filePath,
          content: composedContent,
          status: 'failed',
          error: msg,
        })
      }
    }
    return synced
  }
}
