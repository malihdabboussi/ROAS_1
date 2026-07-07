import { ForbiddenException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isSystemAgentKey } from '../../missions/lib/system-agent-keys'
import { ArtifactsRepository } from '../repositories/artifacts.repository'

@Injectable()
export class ArtifactSkillDeleteService {
  constructor(private readonly repository: ArtifactsRepository) {}

  async deleteAgentSkill(supabase: SupabaseClient, userId: string, skillId: string) {
    const { data: skill, error: skillError } = await this.repository
      .table(supabase, 'agent_skills')
      .select('id, name, skill_key, agent_key, user_id, org_id')
      .eq('id', skillId)
      .maybeSingle()
    if (skillError) throw skillError
    if (!skill) return { success: false, error: 'skill not found' }

    const skillKey = skill.skill_key as string
    const agentKey = skill.agent_key as string
    const skillOrgId = skill.org_id as string | null
    const skillUserId = skill.user_id as string | null

    if (isSystemAgentKey(agentKey)) {
      throw new ForbiddenException(
        `Cannot delete skill '${skillKey}' on system agent '${agentKey}'. System agent content is engineering-owned. Use the per-user toggle (agent_overrides) to disable a skill instead.`,
      )
    }

    let resourcesDelete = this.repository
      .table(supabase, 'agent_skill_resources')
      .delete()
      .eq('agent_key', agentKey)
      .eq('skill_key', skillKey)
    if (skillOrgId) {
      resourcesDelete = resourcesDelete.eq('org_id', skillOrgId).is('user_id', null)
    } else {
      resourcesDelete = resourcesDelete.eq('user_id', skillUserId ?? userId).is('org_id', null)
    }
    await resourcesDelete

    const { error } = await this.repository
      .table(supabase, 'agent_skills')
      .delete()
      .eq('id', skillId)
    if (error) throw error

    const entityName = (skill.name as string) ?? 'Untitled Skill'
    return {
      success: true,
      deleted: {
        action: 'delete_agent_skill',
        entity_type: 'skill',
        entity_id: skillId,
        entity_name: entityName,
      },
      ui_blocks: [
        this.buildDeleteStatusBlock({
          deleteAction: 'delete_agent_skill',
          entityType: 'skill',
          entityId: skillId,
          entityName,
          status: 'success',
        }),
      ],
    }
  }

  async deleteAgentSkillResource(supabase: SupabaseClient, userId: string, compositeId: string) {
    const parts = compositeId.split('::')
    if (parts.length < 3)
      return { success: false, error: 'Invalid entity_id format for skill resource' }
    const [agentKey, skillKey, ...filePathParts] = parts
    const filePath = filePathParts.join('::')
    if (!agentKey || !skillKey || !filePath) {
      return {
        success: false,
        error: 'Could not parse agent_key, skill_key, file_path from entity_id',
      }
    }

    if (isSystemAgentKey(agentKey)) {
      throw new ForbiddenException(
        `Cannot delete skill resource for system agent '${agentKey}'. System agent content is engineering-owned.`,
      )
    }

    const { data: resource, error: resourceError } = await this.repository
      .table(supabase, 'agent_skill_resources')
      .select('id, file_path')
      .eq('user_id', userId)
      .eq('agent_key', agentKey)
      .eq('skill_key', skillKey)
      .eq('file_path', filePath)
      .maybeSingle()
    if (resourceError) throw resourceError
    if (!resource) return { success: false, error: 'skill resource not found' }

    const { error } = await this.repository
      .table(supabase, 'agent_skill_resources')
      .delete()
      .eq('id', resource.id)
    if (error) throw error

    const entityName = `${skillKey}/${filePath}`
    return {
      success: true,
      deleted: {
        action: 'delete_agent_skill_resource',
        entity_type: 'skill_resource',
        entity_id: compositeId,
        entity_name: entityName,
      },
      ui_blocks: [
        this.buildDeleteStatusBlock({
          deleteAction: 'delete_agent_skill_resource',
          entityType: 'skill_resource',
          entityId: compositeId,
          entityName,
          status: 'success',
        }),
      ],
    }
  }

  private buildDeleteStatusBlock(input: {
    deleteAction: string
    entityType: string
    entityId: string
    entityName: string
    status: 'success' | 'failed'
    error?: string
  }) {
    return {
      type: 'delete_status',
      id: `delete-status-${input.entityType}-${input.entityId}-${Date.now()}`,
      delete_action: input.deleteAction,
      entity_type: input.entityType,
      entity_id: input.entityId,
      entity_name: input.entityName,
      status: input.status,
      error: input.error ?? null,
    }
  }
}
