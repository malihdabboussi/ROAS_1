import { Injectable } from '@nestjs/common'
import { ArtifactSkillAssetsRepository } from '../repositories/artifact-skill-assets.repository'
import type { ArtifactActionHandler } from './artifact-action.registry'
import { ArtifactSkillAssetFetcherService } from './artifact-skill-asset-fetcher.service'

@Injectable()
export class ArtifactStateMetaIntegrationsGithubTeamBrainService {
  constructor(
    private readonly skillAssetsRepository: ArtifactSkillAssetsRepository = new ArtifactSkillAssetsRepository(),
    private readonly skillAssetFetcher: ArtifactSkillAssetFetcherService = new ArtifactSkillAssetFetcherService(),
  ) {}

  getHandlers(target: Record<string, any>): Record<string, ArtifactActionHandler> {
    return {
      list_agent_skills: (data, sessionKey) =>
        this.callOrExtracted(
          target,
          'listAgentSkills',
          () => this.listAgentSkills(target, data, sessionKey),
          data,
          sessionKey,
        ),
      create_agent_skill: (data, sessionKey) =>
        this.callOrExtracted(
          target,
          'createAgentSkill',
          () => this.createAgentSkill(target, data, sessionKey),
          data,
          sessionKey,
        ),
      update_agent_skill: (data, sessionKey) =>
        this.callOrExtracted(
          target,
          'updateAgentSkill',
          () => this.updateAgentSkill(target, data, sessionKey),
          data,
          sessionKey,
        ),
      delete_agent_skill: (data, sessionKey) =>
        this.callOrExtracted(
          target,
          'deleteAgentSkill',
          () => this.deleteAgentSkill(target, data, sessionKey),
          data,
          sessionKey,
        ),
      create_agent_skill_resource: (data, sessionKey) =>
        this.createAgentSkillResource(target, data, sessionKey),
      update_agent_skill_resource: (data, sessionKey) =>
        this.updateAgentSkillResource(target, data, sessionKey),
      delete_agent_skill_resource: (data, sessionKey) =>
        this.deleteAgentSkillResource(target, data, sessionKey),
      copy_skill_resource: (data, sessionKey) => this.copySkillResource(target, data, sessionKey),
      upload_skill_asset: (data, sessionKey) => this.uploadSkillAsset(target, data, sessionKey),
      patch_state: (data, sessionKey) => target.patchState(data, sessionKey),
      check_meta_connection: (_data, sessionKey) => target.checkMetaConnection(sessionKey),
      check_integration_connection: (data, sessionKey) =>
        target.checkIntegrationConnection(data, sessionKey),
      list_meta_ad_accounts: (_data, sessionKey) => target.listMetaAdAccounts(sessionKey),
      list_meta_pages: (_data, sessionKey) => target.listMetaPages(sessionKey),
      publish_ad_to_meta: (data, sessionKey) => target.publishAdToMeta(data, sessionKey),
      update_ad_campaign: (data, sessionKey) => target.updateAdCampaignOnMeta(data, sessionKey),
      update_ad_set: (data, sessionKey) => target.updateAdSetOnMeta(data, sessionKey),
      save_meta_defaults: (data, sessionKey) => target.saveMetaDefaults(data, sessionKey),
      get_meta_ad_status: (data, sessionKey) => target.getMetaAdStatus(data, sessionKey),
      get_meta_ads_insights: (data, sessionKey) => target.getMetaAdsInsights(data, sessionKey),
      get_delivery_estimate: (data, sessionKey) => target.getDeliveryEstimate(data, sessionKey),
      list_meta_audiences: (data, sessionKey) => target.listMetaAudiences(data, sessionKey),
      create_meta_custom_audience: (data, sessionKey) =>
        target.createMetaCustomAudience(data, sessionKey),
      create_meta_lookalike_audience: (data, sessionKey) =>
        target.createMetaLookalikeAudience(data, sessionKey),
      list_meta_pixel_events: (data, sessionKey) => target.listMetaPixelEvents(data, sessionKey),
      create_meta_pixel_event: (data, sessionKey) => target.createMetaPixelEvent(data, sessionKey),
      get_capabilities: (_data, sessionKey) => target.getIntegrationCapabilities(sessionKey),
      use_integration: (data, sessionKey) => target.useIntegration(data, sessionKey),
      get_integration: (data, sessionKey) => target.getIntegration(data, sessionKey),
      search_available_integrations: (data, sessionKey) =>
        target.searchAvailableIntegrations(data, sessionKey),
      initiate_integration_connect: (data, sessionKey) =>
        target.initiateIntegrationConnect(data, sessionKey),
      create_agent: (data, sessionKey) => target.hrCreateAgent(data, sessionKey),
      get_agent: (data, sessionKey) => target.hrGetAgent(data, sessionKey),
      update_agent: (data, sessionKey) => target.hrUpdateAgent(data, sessionKey),
      list_team: (data, sessionKey) => target.hrListTeam(data, sessionKey),
      audit_team_agents_and_skills: (data, sessionKey) =>
        target.auditTeamAgentsAndSkills(data, sessionKey),
      compare_team_skill_coverage: (data, sessionKey) =>
        target.compareTeamSkillCoverage(data, sessionKey),
      summarize_agent_capabilities: (data, sessionKey) =>
        target.summarizeAgentCapabilities(data, sessionKey),
      list_campaign_team: (data, sessionKey) => target.listCampaignTeam(data, sessionKey),
      assign_agent_to_campaign: (data, sessionKey) =>
        target.assignAgentToCampaign(data, sessionKey),
      unassign_agent_from_campaign: (data, sessionKey) =>
        target.unassignAgentFromCampaign(data, sessionKey),
      save_user_memory: (data, sessionKey) => target.saveMemory(data, sessionKey),
      search_user_brain: (data, sessionKey) => target.searchMemory(data, sessionKey),
    }
  }

  private callOrExtracted(
    target: Record<string, any>,
    methodName: string,
    extracted: () => Promise<unknown> | unknown,
    data: Record<string, unknown>,
    sessionKey?: string,
  ): Promise<unknown> | unknown {
    if (
      Object.prototype.hasOwnProperty.call(target, methodName) &&
      typeof target[methodName] === 'function'
    ) {
      return target[methodName](data, sessionKey)
    }
    return extracted()
  }

  private requireAgentKey(
    input: Record<string, unknown>,
    target: Record<string, any>,
    sessionKey?: string,
  ): string {
    const explicitAgentKey = (input.agent_key as string) ?? ''
    const sessionAgentKey =
      !explicitAgentKey && typeof target.parseAgentIdFromSessionKey === 'function'
        ? (target.parseAgentIdFromSessionKey(sessionKey) ?? '')
        : ''
    const agentKey = explicitAgentKey || sessionAgentKey
    if (!agentKey) throw new Error('agent_key is required')
    return agentKey
  }

  private async listAgentSkills(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const agentKey = this.requireAgentKey(input, target, sessionKey)
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
    return target.mainApiCall('GET', `/api/agents/${agentKey}/skills`, sessionKey)
  }

  private async createAgentSkill(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const agentKey = this.requireAgentKey(input, target, sessionKey)
    const skillKey = (input.skill_key as string) ?? ''
    const name = (input.name as string) ?? ''
    const description = (input.description as string) ?? ''
    const markdownContent = (input.markdown_content as string) ?? ''
    const missing: string[] = []
    if (!skillKey) missing.push('skill_key')
    if (!name) missing.push('name')
    if (!description) missing.push('description')
    if (!markdownContent) missing.push('markdown_content')
    if (missing.length) {
      return {
        success: false,
        error: `${missing.join(', ')} ${missing.length === 1 ? 'is' : 'are'} required`,
      }
    }
    const result = await target.mainApiCall('POST', `/api/agents/${agentKey}/skills`, sessionKey, {
      skill_key: skillKey,
      name,
      description,
      markdown_content: markdownContent,
      is_enabled: true,
    })
    this.bustRuntimeSkillCatalogCache(target, agentKey, sessionKey)
    return result
  }

  private async updateAgentSkill(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const agentKey = this.requireAgentKey(input, target, sessionKey)
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
    const skillId = (input.skill_id as string) ?? ''
    if (!skillId) return { success: false, error: 'skill_id is required' }
    const userId = target.resolveUserId(sessionKey)
    const orgId = typeof target.resolveOrgId === 'function' ? target.resolveOrgId(sessionKey) : null
    const preSnapshot =
      typeof target.captureAgentCheckpointSnapshot === 'function'
        ? await target.captureAgentCheckpointSnapshot(userId, orgId ?? null, agentKey)
        : null
    const payload: Record<string, unknown> = {}
    for (const key of ['skill_key', 'name', 'description', 'markdown_content', 'is_enabled']) {
      if (input[key] !== undefined) payload[key] = input[key]
    }
    if (Object.keys(payload).length === 0) {
      return {
        success: false,
        error:
          'No valid update fields provided. Accepted: skill_key, name, description, markdown_content, is_enabled. For reference files, use create_agent_skill_resource.',
      }
    }
    const result = await target.mainApiCall(
      'PATCH',
      `/api/agents/${agentKey}/skills/${skillId}`,
      sessionKey,
      payload,
    )
    if (typeof target.recordAgentCheckpointMutation === 'function') {
      await target.recordAgentCheckpointMutation(
        sessionKey,
        agentKey,
        input.change_summary,
        preSnapshot,
      )
    }
    this.bustRuntimeSkillCatalogCache(target, agentKey, sessionKey)
    return result
  }

  private async createAgentSkillResource(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const agentKey = this.requireAgentKey(input, target, sessionKey)
    const skillKey = (input.skill_key as string) ?? ''
    const filePath = (input.file_path as string) ?? ''
    const content = (input.content as string) ?? ''
    if (!skillKey || !filePath || !content) {
      return {
        success: false,
        error: 'agent_key, skill_key, file_path, and content are required',
      }
    }
    const result = await target.mainApiCall(
      'POST',
      `/api/agents/${agentKey}/skills/${encodeURIComponent(skillKey)}/resources`,
      sessionKey,
      { file_path: filePath, content },
    )
    this.bustRuntimeSkillCatalogCache(target, agentKey, sessionKey)
    return result
  }

  private async uploadSkillAsset(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const agentKey = this.requireAgentKey(input, target, sessionKey)
    const skillKey = (input.skill_key as string) ?? ''
    const imageUrl = (input.image_url as string) ?? ''
    const description = (input.description as string) ?? ''
    if (!skillKey || !imageUrl) {
      return { success: false, error: 'agent_key, skill_key, and image_url are required' }
    }

    const userId = target.resolveUserId(sessionKey)
    const orgId = typeof target.resolveOrgId === 'function' ? target.resolveOrgId(sessionKey) : null

    const imageFetch = await this.skillAssetFetcher.fetchImage(imageUrl)
    if (!imageFetch.ok) return { success: false, error: imageFetch.error }
    const { buffer, contentType } = imageFetch
    const ext =
      contentType.includes('jpeg') || contentType.includes('jpg')
        ? 'jpg'
        : contentType.includes('webp')
          ? 'webp'
          : contentType.includes('gif')
            ? 'gif'
            : 'png'

    const { randomUUID } = await import('node:crypto')
    const filename = `${randomUUID()}.${ext}`
    const storagePath = `${userId}/${agentKey}/${skillKey}/${filename}`

    const uploadResult = await this.skillAssetsRepository.uploadSkillAsset(target.serviceClient, {
      storagePath,
      buffer,
      contentType,
    })
    if (!uploadResult.success) return uploadResult
    const publicUrl = uploadResult.url ?? ''

    const resourcePayload = {
      file_path: `assets/${description || filename}`.replace(/[^a-zA-Z0-9._\-/]/g, '_'),
      content: description || filename,
      content_type: contentType,
      storage_url: publicUrl,
    }
    const created = await target.mainApiCall(
      'POST',
      `/api/agents/${agentKey}/skills/${encodeURIComponent(skillKey)}/resources`,
      sessionKey,
      resourcePayload,
    )
    this.bustRuntimeSkillCatalogCache(target, agentKey, sessionKey)

    return { success: true, url: publicUrl, resource: created }
  }

  private async updateAgentSkillResource(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const agentKey = this.requireAgentKey(input, target, sessionKey)
    const skillKey = (input.skill_key as string) ?? ''
    const filePath = (input.file_path as string) ?? ''
    const content = (input.content as string) ?? ''
    if (!skillKey || !filePath || !content) {
      return {
        success: false,
        error: 'agent_key, skill_key, file_path, and content are required',
      }
    }
    const result = await target.mainApiCall(
      'POST',
      `/api/agents/${agentKey}/skills/${encodeURIComponent(skillKey)}/resources`,
      sessionKey,
      { file_path: filePath, content },
    )
    this.bustRuntimeSkillCatalogCache(target, agentKey, sessionKey)
    return result
  }

  private async deleteAgentSkillResource(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const agentKey = this.requireAgentKey(input, target, sessionKey)
    const skillKey = (input.skill_key as string) ?? ''
    const filePath = (input.file_path as string) ?? ''
    if (!agentKey || !skillKey || !filePath) {
      return { success: false, error: 'agent_key, skill_key, and file_path are required' }
    }
    return {
      success: true,
      status: 'pending_approval',
      ui_blocks: [
        this.buildDeleteConfirmBlock({
          action: 'delete_agent_skill_resource',
          entityType: 'skill_resource',
          entityId: `${agentKey}::${skillKey}::${filePath}`,
          entityName: `${skillKey}/${filePath}`,
        }),
      ],
    }
  }

  private async copySkillResource(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const sourceAgentKey = (input.source_agent_key as string) ?? ''
    const sourceSkillKey = (input.source_skill_key as string) ?? ''
    const filePath = (input.file_path as string) ?? ''
    const targetAgentKey = (input.target_agent_key as string) ?? ''
    const targetSkillKey = (input.target_skill_key as string) ?? ''
    const targetFilePath = (input.target_file_path as string) || filePath
    if (!sourceAgentKey || !sourceSkillKey || !filePath || !targetAgentKey || !targetSkillKey) {
      return {
        success: false,
        error:
          'source_agent_key, source_skill_key, file_path, target_agent_key, and target_skill_key are required',
      }
    }
    const sourceResources = await target.mainApiCall(
      'GET',
      `/api/agents/${sourceAgentKey}/skills`,
      sessionKey,
    )
    const skills = Array.isArray(sourceResources) ? sourceResources : (sourceResources?.data ?? [])
    const sourceSkill = skills.find(
      (s: Record<string, unknown>) => s.skill_key === sourceSkillKey || s.id === sourceSkillKey,
    )
    if (!sourceSkill?.resources) {
      return {
        success: false,
        error: `Could not find resources for skill "${sourceSkillKey}" on agent "${sourceAgentKey}"`,
      }
    }
    const resource = (sourceSkill.resources as Array<Record<string, unknown>>).find(
      (r) => r.file_path === filePath,
    )
    if (!resource?.content) {
      return {
        success: false,
        error: `Resource file "${filePath}" not found in skill "${sourceSkillKey}"`,
      }
    }
    const result = await target.mainApiCall(
      'POST',
      `/api/agents/${targetAgentKey}/skills/${encodeURIComponent(targetSkillKey)}/resources`,
      sessionKey,
      { file_path: targetFilePath, content: resource.content },
    )
    this.bustRuntimeSkillCatalogCache(target, targetAgentKey, sessionKey)
    return result
  }

  private bustRuntimeSkillCatalogCache(
    target: Record<string, any>,
    agentKey: string,
    sessionKey?: string,
  ): void {
    if (typeof target.bustRuntimeSkillCatalogCacheForAgent !== 'function') return
    target.bustRuntimeSkillCatalogCacheForAgent(agentKey, sessionKey)
  }

  private buildDeleteConfirmBlock(input: {
    action: string
    entityType: string
    entityId: string
    entityName: string
  }) {
    return {
      type: 'delete_confirm',
      id: `delete-${input.entityType}-${input.entityId}-${Date.now()}`,
      delete_action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId,
      entity_name: input.entityName,
      status: 'pending',
    }
  }

  private async deleteAgentSkill(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const agentKey = this.requireAgentKey(input, target, sessionKey)
    const skillId = (input.skill_id as string) ?? ''
    const skillName = (input.skill_name as string) || (input.name as string) || ''
    if (!skillId) return { success: false, error: 'skill_id is required' }

    let displayName = skillName
    if (!displayName) {
      try {
        const skills = await target.mainApiCall('GET', `/api/agents/${agentKey}/skills`, sessionKey)
        const list = Array.isArray(skills) ? skills : (skills?.data ?? [])
        const found = list.find((s: Record<string, unknown>) => s.id === skillId)
        displayName = (found?.name as string) || (found?.skill_key as string) || skillId
      } catch {
        displayName = skillId
      }
    }

    return {
      success: true,
      status: 'pending_approval',
      ui_blocks: [
        this.buildDeleteConfirmBlock({
          action: 'delete_agent_skill',
          entityType: 'skill',
          entityId: skillId,
          entityName: displayName,
        }),
      ],
    }
  }
}
