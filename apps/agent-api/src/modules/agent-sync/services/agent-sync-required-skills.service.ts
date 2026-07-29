import * as path from 'path'
import { Injectable } from '@nestjs/common'
import type { AgentSyncOrchestrationContext } from './agent-sync-orchestration.types'
import type { AgentSkillResourceRow } from './agent-sync.types'

export interface SyncRequiredSkillsInput {
  userId: string
  orgId: string | null
  agentKey: string
  skillKeys: string[]
}

@Injectable()
export class AgentSyncRequiredSkillsService {
  async syncRequiredSkills(
    ctx: AgentSyncOrchestrationContext,
    input: SyncRequiredSkillsInput,
  ): Promise<number> {
    const skillKeys = [...new Set(input.skillKeys.filter(Boolean))]
    if (skillKeys.length === 0) return 0

    const runtimeSkillScope = await ctx.skillScope.resolveRuntimeSkillScope({
      agentKey: input.agentKey,
      userId: input.userId,
      orgId: input.orgId,
      skillKeys,
    })
    const skillDenySet = await ctx.loadSkillDenySet(
      input.orgId ? null : input.userId,
      input.orgId,
    )
    const skillRows = runtimeSkillScope.skills.filter(
      (row) => !skillDenySet.has(`${row.agent_key}:${row.skill_key}`),
    )
    const resolvedSkillKeys = [...new Set(skillRows.map((skill) => skill.skill_key))]
    const libraryResources = await ctx.fetchLibraryResources(resolvedSkillKeys)
    const resources = ctx.mergeWithLibraryFallback(
      runtimeSkillScope.resources as AgentSkillResourceRow[],
      libraryResources,
    )
    const sharedRuntime = ctx.isSharedRuntime()
    const agentDir = input.orgId
      ? path.join(ctx.agentsBaseDir, 'orgs', input.orgId, input.agentKey)
      : sharedRuntime
        ? path.join(ctx.agentsBaseDir, 'users', input.userId, input.agentKey)
        : input.agentKey

    return ctx.syncAgentSkills(
      agentDir,
      skillRows,
      resources,
      Boolean(input.orgId || sharedRuntime),
      undefined,
      { replaceExisting: false, writeIndex: false },
    )
  }
}
