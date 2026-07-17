import { ForbiddenException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  isSkillWriteLocked,
  isSystemAgentKey,
} from '../lib/system-agent-keys'
import { ACCOUNT_SKILL_AGENT_KEY } from '../lib/skill-catalog.constants'
import { MissionsRepository } from '../repositories/missions.repository'
import { MissionAgentGatewayService } from './gateways/mission-agent-gateway.service'

type SkillAssetFile = { buffer: Buffer; mimetype: string; originalname: string }
type AgentSkillListRow = Record<string, unknown> & {
  resources?: Array<Record<string, unknown>>
}

const OFFICIAL_SKILL_VIEWER_ROLES = new Set(['admin', 'superadmin'])

function isOfficialSkillRow(row: AgentSkillListRow): boolean {
  if (typeof row.source === 'string') return row.source !== 'user'
  if (row.is_system === true) return true
  return row.user_id == null && row.org_id == null
}

function stripOfficialSkillBodies<T extends AgentSkillListRow>(rows: T[]): T[] {
  return rows.map((row) => {
    if (!isOfficialSkillRow(row)) return row
    const { markdown_content: _markdownContent, resources, ...rest } = row
    const strippedResources = Array.isArray(resources)
      ? resources.map((resource) => {
          const { content: _content, ...resourceRest } = resource
          return resourceRest
        })
      : resources
    return { ...rest, resources: strippedResources } as T
  })
}

@Injectable()
export class AgentSkillManagementService {
  constructor(
    private readonly missionsRepository: MissionsRepository,
    private readonly missionAgentGatewayService: MissionAgentGatewayService,
  ) {}

  async listAgentSkills(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    orgId?: string | null,
  ) {
    const skills = await this.missionsRepository.listAgentSkills(supabase, userId, agentKey, orgId)
    if (await this.canViewOfficialSkillBodies(supabase, userId)) return skills
    return stripOfficialSkillBodies(skills as AgentSkillListRow[])
  }

  async listAgentSkillsForAgents(
    supabase: SupabaseClient,
    userId: string,
    agentKeys: string[],
    orgId?: string | null,
    opts?: { summary?: boolean },
  ) {
    const skills = await this.missionsRepository.listAgentSkillsForAgents(
      supabase,
      userId,
      agentKeys,
      orgId,
      opts,
    )
    if (await this.canViewOfficialSkillBodies(supabase, userId)) return skills
    return stripOfficialSkillBodies(skills as AgentSkillListRow[])
  }

  async createAgentSkill(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    payload: {
      skill_key: string
      name: string
      description: string
      markdown_content: string
      is_enabled?: boolean
    },
    orgId?: string | null,
  ) {
    // User-created skills are account/org catalog owned (`*`), not agent-owned.
    // Agents still materialize them via existing agent_key OR '*' sync.
    const catalogKey = ACCOUNT_SKILL_AGENT_KEY
    const permissionKey =
      agentKey !== ACCOUNT_SKILL_AGENT_KEY && !isSkillWriteLocked(agentKey) ? agentKey : 'vibey'
    await this.assertCanManageAgent(supabase, userId, permissionKey, orgId)
    const created = await this.missionsRepository.createAgentSkill(supabase, {
      user_id: userId,
      org_id: orgId,
      agent_key: catalogKey,
      skill_key: payload.skill_key,
      name: payload.name,
      description: payload.description,
      markdown_content: payload.markdown_content,
      is_enabled: payload.is_enabled,
    })
    const syncKey =
      agentKey !== ACCOUNT_SKILL_AGENT_KEY && !isSkillWriteLocked(agentKey) ? agentKey : 'vibey'
    await this.missionAgentGatewayService
      .triggerAgentSkillsSync(userId, syncKey, orgId)
      .catch(() => undefined)
    return created
  }

  async updateAgentSkill(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    skillId: string,
    updates: Partial<{
      skill_key: string
      name: string
      description: string
      markdown_content: string
      is_enabled: boolean
    }>,
    orgId?: string | null,
  ) {
    await this.assertCanManageAgent(supabase, userId, agentKey, orgId)
    if (isSystemAgentKey(agentKey)) {
      const skillRow = await this.missionsRepository.getAgentSkillOwnership(supabase, skillId)
      if (skillRow && skillRow.user_id == null && skillRow.org_id == null) {
        throw new ForbiddenException('System agent platform skills are managed by the platform')
      }
    }
    if (updates.skill_key) {
      await this.renameSkillResources(supabase, userId, agentKey, skillId, updates.skill_key, orgId)
    }
    const updated = await this.missionsRepository.updateAgentSkill(
      supabase,
      userId,
      agentKey,
      skillId,
      updates,
      orgId,
    )
    await this.missionAgentGatewayService
      .triggerAgentSkillsSync(userId, agentKey, orgId)
      .catch(() => undefined)
    return updated
  }

  async deleteAgentSkill(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    skillId: string,
    orgId?: string | null,
  ) {
    await this.assertCanManageAgent(supabase, userId, agentKey, orgId)
    if (isSystemAgentKey(agentKey)) {
      const skillRow = await this.missionsRepository.getAgentSkillOwnership(supabase, skillId)
      if (skillRow && skillRow.user_id == null && skillRow.org_id == null) {
        throw new ForbiddenException('System agent platform skills are managed by the platform')
      }
    }
    const deleted = await this.missionsRepository.deleteAgentSkill(
      supabase,
      userId,
      agentKey,
      skillId,
      orgId,
    )
    await this.missionAgentGatewayService
      .triggerAgentSkillsSync(userId, agentKey, orgId)
      .catch(() => undefined)
    return deleted
  }

  async createAgentSkillResource(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    skillKey: string,
    payload: { file_path: string; content?: string; content_type?: string; storage_url?: string },
    orgId?: string | null,
  ) {
    const writeKey = agentKey === ACCOUNT_SKILL_AGENT_KEY ? ACCOUNT_SKILL_AGENT_KEY : agentKey
    await this.assertCanManageAgent(supabase, userId, writeKey, orgId)
    return this.missionsRepository.createAgentSkillResource(supabase, {
      user_id: userId,
      org_id: orgId,
      agent_key: writeKey,
      skill_key: skillKey,
      file_path: payload.file_path,
      content: payload.content,
      content_type: payload.content_type,
      storage_url: payload.storage_url,
    })
  }

  async uploadSkillAsset(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    skillKey: string,
    file: SkillAssetFile,
    description?: string,
    orgId?: string | null,
  ) {
    await this.assertCanManageAgent(supabase, userId, agentKey, orgId)
    const { publicUrl } = await this.missionsRepository.uploadAgentSkillAsset(supabase, {
      user_id: userId,
      agent_key: agentKey,
      skill_key: skillKey,
      original_name: file.originalname,
      buffer: file.buffer,
      content_type: file.mimetype,
    })

    const filePath = `assets/${file.originalname}`
    const created = await this.missionsRepository.createAgentSkillResource(supabase, {
      user_id: userId,
      org_id: orgId,
      agent_key: agentKey,
      skill_key: skillKey,
      file_path: filePath,
      content: description || file.originalname,
      content_type: file.mimetype,
      storage_url: publicUrl,
    })
    return { ...created, url: publicUrl }
  }

  async updateAgentSkillResource(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    skillKey: string,
    resourceId: string,
    payload: { file_path: string },
    orgId?: string | null,
  ) {
    await this.assertCanManageAgent(supabase, userId, agentKey, orgId)
    return this.missionsRepository.updateAgentSkillResource(supabase, {
      user_id: userId,
      org_id: orgId,
      agent_key: agentKey,
      skill_key: skillKey,
      resource_id: resourceId,
      file_path: payload.file_path,
    })
  }

  async deleteAgentSkillResource(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    skillKey: string,
    resourceId: string,
    orgId?: string | null,
  ) {
    await this.assertCanManageAgent(supabase, userId, agentKey, orgId)
    return this.missionsRepository.deleteAgentSkillResource(supabase, {
      user_id: userId,
      org_id: orgId,
      agent_key: agentKey,
      skill_key: skillKey,
      resource_id: resourceId,
    })
  }

  async listAgentWorkflows(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    orgId?: string | null,
  ) {
    return this.missionsRepository.listAgentWorkflows(supabase, userId, agentKey, orgId)
  }

  async createAgentWorkflow(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    payload: {
      workflow_key: string
      name: string
      description: string
      markdown_content: string
      steps: unknown[]
      is_enabled?: boolean
    },
    orgId?: string | null,
  ) {
    await this.assertCanManageAgent(supabase, userId, agentKey, orgId)
    const created = await this.missionsRepository.createAgentWorkflow(supabase, {
      user_id: userId,
      org_id: orgId,
      agent_key: agentKey,
      workflow_key: payload.workflow_key,
      name: payload.name,
      description: payload.description,
      markdown_content: payload.markdown_content,
      steps: payload.steps,
      is_enabled: payload.is_enabled,
    })
    await this.missionAgentGatewayService
      .triggerAgentSkillsSync(userId, agentKey, orgId)
      .catch(() => undefined)
    return created
  }

  async updateAgentWorkflow(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    workflowId: string,
    updates: Partial<{
      workflow_key: string
      name: string
      description: string
      markdown_content: string
      steps: unknown[]
      is_enabled: boolean
    }>,
    orgId?: string | null,
  ) {
    await this.assertCanManageAgent(supabase, userId, agentKey, orgId)
    const updated = await this.missionsRepository.updateAgentWorkflow(
      supabase,
      userId,
      agentKey,
      workflowId,
      updates,
      orgId,
    )
    await this.missionAgentGatewayService
      .triggerAgentSkillsSync(userId, agentKey, orgId)
      .catch(() => undefined)
    return updated
  }

  async deleteAgentWorkflow(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    workflowId: string,
    orgId?: string | null,
  ) {
    await this.assertCanManageAgent(supabase, userId, agentKey, orgId)
    const deleted = await this.missionsRepository.deleteAgentWorkflow(
      supabase,
      userId,
      agentKey,
      workflowId,
      orgId,
    )
    await this.missionAgentGatewayService
      .triggerAgentSkillsSync(userId, agentKey, orgId)
      .catch(() => undefined)
    return deleted
  }

  private async assertCanManageAgent(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    orgId?: string | null,
  ): Promise<void> {
    const permissionKey =
      agentKey === ACCOUNT_SKILL_AGENT_KEY || isSkillWriteLocked(agentKey) ? 'vibey' : agentKey
    const canManage = await this.missionsRepository.canManageAgent(
      supabase,
      userId,
      permissionKey,
      orgId,
    )
    if (!canManage) {
      throw new ForbiddenException('You do not have permission to manage this agent')
    }
  }

  private async canViewOfficialSkillBodies(
    supabase: SupabaseClient,
    userId: string,
  ): Promise<boolean> {
    const { data, error } = await this.missionsRepository.readUserPlatformRole(supabase, userId)
    if (error) return false
    const role = String((data as { role?: unknown } | null)?.role ?? '')
    return OFFICIAL_SKILL_VIEWER_ROLES.has(role)
  }

  private async renameSkillResources(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    skillId: string,
    nextSkillKey: string,
    orgId?: string | null,
  ) {
    await this.missionsRepository.renameAgentSkillResourcesForSkillKey(
      supabase,
      userId,
      agentKey,
      skillId,
      nextSkillKey,
      orgId,
    )
  }
}
