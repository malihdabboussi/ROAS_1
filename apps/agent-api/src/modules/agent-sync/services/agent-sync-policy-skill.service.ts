import * as fs from 'fs/promises'
import * as path from 'path'
import { Injectable, Logger } from '@nestjs/common'
import { ACTIONS, filterPromptModeActiveActions } from '@vibey/agent-policy'
import { AgentPolicyService } from '../../agent-policy/services/agent-policy.service'
import {
  resolveCapabilityPolicy,
  resolvePolicyActionAllowlist,
  type ArtifactAgentRecord,
} from '../../artifacts/services/artifact-capability.policy'
import {
  AgentRegistryRow,
  AgentSkillRow,
  SKILL_KEY_VIBEY_API,
  SyncManifestEntry,
} from './agent-sync.types'
import { generateScopedVibeyApiSkill, type SkillGeneratorDomain } from './vibey-api-skill-generator'

@Injectable()
export class AgentSyncPolicySkillService {
  async resolveAllowedActions(input: {
    agentPolicyService: AgentPolicyService
    row: AgentRegistryRow
    scope: { orgId: string | null; userId: string | null }
  }): Promise<{
    actions: Set<string>
    domain: SkillGeneratorDomain
  }> {
    const agentRecord: ArtifactAgentRecord = {
      agent_key: input.row.agent_key,
      role: input.row.role ?? null,
      level: input.row.level ?? null,
      config: input.row.config ?? null,
    }
    const policy = resolveCapabilityPolicy(agentRecord)
    if (!policy) return { actions: new Set<string>(), domain: 'management' }
    if (policy.profile === 'system_flows') {
      return { actions: resolvePolicyActionAllowlist(policy), domain: 'flows' }
    }
    if (!input.scope.orgId && !input.scope.userId) {
      throw new Error(
        `resolveAllowedActions requires a user or org scope for agent ${input.row.agent_key}`,
      )
    }
    const decisions = await Promise.all(
      ACTIONS.map(async (action) => ({
        action,
        decision: await input.agentPolicyService.canExecuteAction(
          input.row.agent_key,
          action,
          input.scope,
        ),
      })),
    )
    const actions = new Set(
      decisions.filter(({ decision }) => decision.allowed).map(({ action }) => action),
    )
    const domain: SkillGeneratorDomain =
      policy.profile === 'system_brain'
        ? 'brain'
        : ((policy.domain as SkillGeneratorDomain) ?? 'management')
    return { actions, domain }
  }

  resolveEnabledSkillKeys(rows: AgentSkillRow[]): string[] {
    const keys = new Set<string>()
    for (const row of rows) {
      const skillKey = row.skill_key?.trim()
      if (skillKey) {
        keys.add(skillKey)
      }
    }
    keys.add(SKILL_KEY_VIBEY_API)
    return Array.from(keys).sort((a, b) => a.localeCompare(b))
  }

  async writeScopedVibeyApiSkill(input: {
    agentKeyOrDir: string
    agentsBaseDir: string
    allowedActions: Set<string>
    domain?: SkillGeneratorDomain
    logger: Logger
    manifest?: SyncManifestEntry[]
    useKeyAsDir?: boolean
  }): Promise<void> {
    const useKeyAsDir = input.useKeyAsDir ?? false
    const agentDir = useKeyAsDir
      ? input.agentKeyOrDir
      : path.join(input.agentsBaseDir, input.agentKeyOrDir)
    const resolvedAgentKey = useKeyAsDir ? path.basename(input.agentKeyOrDir) : input.agentKeyOrDir
    const skillDir = path.join(agentDir, 'skills', SKILL_KEY_VIBEY_API)
    const skillPath = path.join(skillDir, 'SKILL.md')
    const actionsPath = path.join(skillDir, 'ALLOWED_ACTIONS.json')
    const activeAllowedActions = new Set(filterPromptModeActiveActions(input.allowedActions))
    const { skillMd, referenceFiles } = generateScopedVibeyApiSkill(
      activeAllowedActions,
      input.domain ?? 'management',
    )
    const actionsJson = JSON.stringify({
      agent_key: resolvedAgentKey,
      allowed_actions: [...activeAllowedActions].sort(),
    })
    try {
      await fs.mkdir(skillDir, { recursive: true })
      await fs.writeFile(skillPath, skillMd, 'utf-8')
      input.manifest?.push({
        category: 'vibey-api',
        agentKey: resolvedAgentKey,
        filePath: skillPath,
        content: skillMd,
        status: 'ok',
      })
      await fs.writeFile(actionsPath, actionsJson, 'utf-8')
      input.manifest?.push({
        category: 'vibey-api',
        agentKey: resolvedAgentKey,
        filePath: actionsPath,
        content: actionsJson,
        status: 'ok',
      })
      for (const [relPath, fileContent] of Object.entries(referenceFiles)) {
        const filePath = path.join(skillDir, relPath)
        await fs.mkdir(path.dirname(filePath), { recursive: true })
        await fs.writeFile(filePath, fileContent, 'utf-8')
        input.manifest?.push({
          category: 'vibey-api',
          agentKey: resolvedAgentKey,
          filePath,
          content: fileContent,
          status: 'ok',
        })
      }
    } catch (err) {
      const msg = (err as Error).message
      input.logger.error(`Failed to write ${skillPath}: ${msg}`)
      input.manifest?.push({
        category: 'vibey-api',
        agentKey: resolvedAgentKey,
        filePath: skillPath,
        content: skillMd,
        status: 'failed',
        error: msg,
      })
    }
  }
}
