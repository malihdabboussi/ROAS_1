import * as fs from 'fs/promises'
import * as path from 'path'
import { Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { AgentSyncMaterializationRepository } from '../repositories/agent-sync-materialization.repository'
import { toSkillDirName } from './agent-runtime-skill-paths'
import type { SyncManifestEntry, SyncResult } from './agent-sync.types'

type SyncOrgAgent = (
  orgId: string,
  agentKey: string,
  useExistingGatewayBatch: boolean,
) => Promise<SyncResult>

function pLimit(concurrency: number): <T>(fn: () => Promise<T>) => Promise<T> {
  let active = 0
  const queue: Array<() => void> = []
  const next = () => {
    if (queue.length > 0 && active < concurrency) {
      active++
      queue.shift()!()
    }
  }
  return <T>(fn: () => Promise<T>): Promise<T> =>
    new Promise<T>((resolve, reject) => {
      const run = () =>
        fn()
          .then(resolve, reject)
          .finally(() => {
            active--
            next()
          })
      queue.push(run)
      next()
    })
}

function buildOrgSharedSkillMarkdown(skill: Record<string, unknown>): string {
  return `---\nname: org-${skill.skill_name}\ndescription: Organization shared skill from team owner\n---\n\n${skill.skill_content}\n`
}

@Injectable()
export class AgentSyncOrgSharedSkillsService {
  constructor(
    private readonly materializationRepository: AgentSyncMaterializationRepository = new AgentSyncMaterializationRepository(),
  ) {}

  async syncAllOrgAgents(input: {
    supabase: SupabaseClient
    syncOrgAgent: SyncOrgAgent
    userId: string
  }): Promise<{ synced: number; failed: SyncResult['failed'] }> {
    const { data: memberships } = await this.materializationRepository.listActiveOrgMemberships(
      input.supabase,
      input.userId,
    )
    if (!memberships?.length) return { synced: 0, failed: [] }

    const orgIds = [...new Set(memberships.map((m) => String(m.org_id)))]
    const orgRegistryResults = await Promise.all(
      orgIds.map(async (orgId) => ({
        orgId,
        agents:
          (
            await this.materializationRepository.listOrgAgentKeys(
              input.supabase,
              orgId,
            )
          ).data ?? [],
      })),
    )

    const tasks: Array<{ orgId: string; agentKey: string }> = []
    for (const { orgId, agents } of orgRegistryResults) {
      for (const agent of agents) {
        tasks.push({ orgId, agentKey: String(agent.agent_key) })
      }
    }
    if (tasks.length === 0) return { synced: 0, failed: [] }

    const limit = pLimit(5)
    const results = await Promise.allSettled(
      tasks.map((task) => limit(() => input.syncOrgAgent(task.orgId, task.agentKey, true))),
    )

    let totalSynced = 0
    const allFailed: SyncResult['failed'] = []
    for (const result of results) {
      if (result.status === 'fulfilled') {
        totalSynced += result.value.synced
        allFailed.push(...result.value.failed)
      }
    }
    return { synced: totalSynced, failed: allFailed }
  }

  async syncOrgSharedSkills(input: {
    agentKeys: Set<string>
    agentsBaseDir: string
    logger: Logger
    manifest?: SyncManifestEntry[]
    supabase: SupabaseClient
    userId: string
  }): Promise<void> {
    const { data: memberships } = await this.materializationRepository.listActiveOrgMemberships(
      input.supabase,
      input.userId,
    )
    if (!memberships || memberships.length === 0) return

    const orgIds = [...new Set(memberships.map((m) => String(m.org_id)))]
    const { data: skills } = await this.materializationRepository.listOrgSharedSkillsByOrgIds(
      input.supabase,
      orgIds,
    )
    if (!skills || skills.length === 0) return

    for (const agentKey of input.agentKeys) {
      for (const skill of skills) {
        const dirName = toSkillDirName(`org-${skill.skill_name}`)
        const skillDir = path.join(input.agentsBaseDir, agentKey, 'skills', dirName)
        const skillPath = path.join(skillDir, 'SKILL.md')
        const md = buildOrgSharedSkillMarkdown(skill)
        try {
          await fs.mkdir(skillDir, { recursive: true })
          await fs.writeFile(skillPath, md, 'utf-8')
          input.manifest?.push({
            category: 'org-skill',
            agentKey,
            filePath: skillPath,
            content: md,
            status: 'ok',
          })
        } catch (err) {
          const msg = (err as Error).message
          input.logger.warn(`Failed to write org skill ${skill.skill_name}: ${msg}`)
          input.manifest?.push({
            category: 'org-skill',
            agentKey,
            filePath: skillPath,
            content: md,
            status: 'failed',
            error: msg,
          })
        }
      }
    }
    input.logger.log(
      `Synced ${skills.length} org shared skill(s) to ${input.agentKeys.size} agent(s)`,
    )
  }

  async syncSharedSkillsForAgent(input: {
    agentDir: string
    agentKey: string
    logger: Logger
    manifest?: SyncManifestEntry[]
    orgId: string | null
    supabase: SupabaseClient
    userId: string | null
  }): Promise<number> {
    let ownerIds: string[] = []
    if (input.orgId) {
      const org = await this.materializationRepository.findOrganizationOwner(
        input.supabase,
        input.orgId,
      )
      if (org?.owner_id) ownerIds = [String(org.owner_id)]
    } else if (input.userId) {
      const { data: memberships } = await this.materializationRepository.listActiveOrgMemberships(
        input.supabase,
        input.userId,
      )
      const orgIds = [...new Set((memberships ?? []).map((m) => String(m.org_id)))]
      if (orgIds.length > 0) {
        const { data: orgs } = await this.materializationRepository.listOrganizationOwnersByIds(
          input.supabase,
          orgIds,
        )
        ownerIds = [...new Set((orgs ?? []).map((org) => String(org.owner_id)).filter(Boolean))]
      }
    }
    if (ownerIds.length === 0) return 0

    const { data: skills } = await this.materializationRepository.listOrgSharedSkillsByOwnerIds(
      input.supabase,
      ownerIds,
    )
    if (!skills || skills.length === 0) return 0

    let synced = 0
    for (const skill of skills) {
      const dirName = toSkillDirName(`org-${skill.skill_name}`)
      const skillDir = path.join(input.agentDir, 'skills', dirName)
      const skillPath = path.join(skillDir, 'SKILL.md')
      const md = buildOrgSharedSkillMarkdown(skill)
      try {
        await fs.mkdir(skillDir, { recursive: true })
        await fs.writeFile(skillPath, md, 'utf-8')
        synced++
        input.manifest?.push({
          category: 'org-skill',
          agentKey: input.agentKey,
          filePath: skillPath,
          content: md,
          status: 'ok',
        })
      } catch (err) {
        const msg = (err as Error).message
        input.logger.warn(`Failed to write org skill ${skill.skill_name}: ${msg}`)
        input.manifest?.push({
          category: 'org-skill',
          agentKey: input.agentKey,
          filePath: skillPath,
          content: md,
          status: 'failed',
          error: msg,
        })
      }
    }

    input.logger.log(`Synced ${synced}/${skills.length} org shared skill(s) to ${input.agentKey}`)
    return synced
  }
}
