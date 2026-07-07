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
import type { AgentSyncOrchestrationContext } from './agent-sync-orchestration.types'

@Injectable()
export class AgentSyncOrgAgentService {
  async syncOrgAgent(
    ctx: AgentSyncOrchestrationContext,
    orgId: string,
    agentKey: string,
    useExistingGatewayBatch = false,
  ): Promise<SyncResult> {
    const systemKeys = await ctx.loadSystemAgentKeys()
    const isSystemAgent = systemKeys.has(agentKey)
    const skillDenySet = await ctx.loadSkillDenySet(null, orgId)

    const [defResult, skillResult, resourceResult, workflowResult, registryResult] =
      await Promise.all([
        ctx.materializationRepository.listOrgAgentDefinitions(ctx.supabase, {
          orgId,
          agentKey,
          isSystemAgent,
        }),
        ctx.materializationRepository.listOrgAgentSkills(ctx.supabase, { orgId, agentKey }),
        ctx.materializationRepository.listOrgAgentSkillResources(ctx.supabase, {
          orgId,
          agentKey,
        }),
        ctx.materializationRepository.listOrgAgentWorkflows(ctx.supabase, { orgId, agentKey }),
        ctx.materializationRepository.listOrgAgentRegistryRows(ctx.supabase, { orgId, agentKey }),
      ])

    const { data: defs } = defResult
    const { data: skills } = skillResult
    const { data: resources } = resourceResult
    const { data: workflows } = workflowResult
    const { data: registryRows } = registryResult
    const runtimeDefs = expandRuntimeIdentityDefinitions((defs ?? []) as AgentDefinitionRow[])

    const orgBase = path.join(ctx.agentsBaseDir, 'orgs', orgId)
    const agentDir = path.join(orgBase, agentKey)
    const openClawId = `org-${orgId}-${agentKey}`
    await ctx.cleanupStaleDefinitionFiles(agentDir, runtimeDefs)

    const manifest: SyncManifestEntry[] = []
    let synced = await this.writeDefinitionFiles(ctx, agentKey, agentDir, runtimeDefs, manifest)

    const mergedSkills = ctx
      .deduplicateSkills((skills ?? []) as AgentSkillRow[], orgId)
      .filter((row) => !skillDenySet.has(`${row.agent_key}:${row.skill_key}`))
    const dedupedResources = ctx.deduplicateResources(
      (resources ?? []) as AgentSkillResourceRow[],
      orgId,
    )
    const orgSkillKeys = [...new Set(mergedSkills.map((skill) => skill.skill_key))]
    const orgLibraryResources = await ctx.fetchLibraryResources(orgSkillKeys)
    const mergedResources = ctx.mergeWithLibraryFallback(dedupedResources, orgLibraryResources)
    const mergedWorkflows = ctx.deduplicateWorkflows(
      (workflows ?? []) as AgentWorkflowRow[],
      orgId,
    )
    synced += await ctx.syncAgentSkills(
      path.join(orgBase, agentKey),
      mergedSkills,
      mergedResources,
      true,
      manifest,
    )
    synced += await ctx.syncAgentWorkflows(
      path.join(orgBase, agentKey),
      mergedWorkflows,
      true,
      manifest,
    )

    const registry = ((registryRows ?? []) as AgentRegistryRow[])[0]
    if (registry) {
      const { actions: allowedActions, domain } = await ctx.resolveAllowedActions(registry, {
        orgId,
        userId: null,
      })
      await ctx.writeScopedVibeyApiSkill(
        path.join(orgBase, agentKey),
        allowedActions,
        true,
        domain,
        manifest,
      )
    }

    const sharedSkillCount = await ctx.syncSharedSkillsForAgent({
      userId: null,
      orgId,
      agentDir,
      agentKey,
      manifest,
    })
    synced += sharedSkillCount

    if (!useExistingGatewayBatch) await ctx.gateway.beginBatch()
    try {
      await ctx.gateway.ensureAgent({
        agentKey: openClawId,
        name: agentKey,
        workspace: agentDir,
        definitions: runtimeDefs
          .filter((def) => !isUserProfileDefinitionFile(def.file_name))
          .map((def) => ({ file_name: def.file_name, content: def.content })),
        skills: ctx.resolveEnabledSkillKeys(mergedSkills),
      })
    } finally {
      if (!useExistingGatewayBatch) await ctx.gateway.commitBatch()
    }

    const result = await ctx.verifyAndRetry(manifest, synced)
    ctx.logger.log(
      `Synced ${result.synced} org agent files for org-${orgId}-${agentKey} (${mergedSkills.length} skills) — healthy=${result.healthy}`,
    )
    return result
  }

  private async writeDefinitionFiles(
    ctx: AgentSyncOrchestrationContext,
    agentKey: string,
    agentDir: string,
    runtimeDefs: AgentDefinitionRow[],
    manifest: SyncManifestEntry[],
  ): Promise<number> {
    let synced = 0
    for (const def of runtimeDefs) {
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
