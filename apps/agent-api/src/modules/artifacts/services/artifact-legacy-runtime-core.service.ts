import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSystemAgentContract, isProtectedSystemAgent } from '@vibey/agent-policy'
import { ArtifactLegacyRuntimeRepository } from '../repositories/artifact-legacy-runtime.repository'
import {
  CEO_ONLY_ACTIONS,
  isArtifactActionAllowed,
  isIntegrationSubActionAllowed,
  normalizeAgentLevel,
  resolveCapabilityPolicy,
  SKILL_WRITE_ACTIONS,
  type ArtifactAgentRecord,
  type ArtifactCapabilityPolicy,
} from './artifact-capability.policy'
import { ArtifactLegacyRuntimeApiService } from './artifact-legacy-runtime-api.service'

const MUTATING_CAMPAIGN_ACTIONS = new Set([
  'create_offer',
  'update_offer_step',
  'delete_offer',
  'create_funnel',
  'add_funnel_page',
  'update_funnel_page',
  'patch_funnel_page',
  'delete_funnel',
  'create_form',
  'update_form',
  'attach_form_asset',
  'publish_form',
  'unpublish_form',
  'create_website',
  'add_website_page',
  'update_website_page',
  'patch_website_page',
  'delete_website',
  'create_sequence',
  'add_sequence_email',
  'update_sequence',
  'update_sequence_email',
  'delete_sequence',
  'delete_sequence_email',
  'create_ad',
  'update_ad',
  'delete_ad',
  'bulk_create_ads',
  'publish_ad_to_meta',
  'create_avatar',
  'update_avatar',
  'delete_avatar',
  'create_theme',
  'update_theme',
  'delete_theme',
  'create_social_post',
  'update_social_post',
  'schedule_social_post',
  'publish_social_post',
  'delete_social_post',
  'create_blog_post',
  'update_blog_post',
  'delete_blog_post',
  'create_presentation',
  'update_presentation',
  'patch_presentation',
  'update_presentation_slide',
  'add_presentation_slide',
  'delete_presentation',
  'set_website_layout',
  'generate_image',
  'edit_image',
  'generate_ad_set',
  'generate_video',
  'analyze_image',
  'save_user_memory',
  'ingest_agent_brain_text',
  'ingest_agent_brain_link',
  'create_campaign',
  'update_campaign',
  'assign_agent_to_campaign',
  'unassign_agent_from_campaign',
  'patch_state',
  'save_meta_defaults',
  'prepare_email_send',
  'prepare_sequence_send',
])

export const PERSONAL_BRAIN_POLICY_ACTIONS = new Set([
  'search_user_brain',
  'list_user_brain_memories',
  'crystallize_user_brain',
  'ingest_user_brain_link',
  'ingest_user_brain_text',
  'ingest_user_brain_document',
])

export const CAMPAIGN_CONTEXT_POLICY_ACTIONS = new Set([
  'get_campaign',
  'list_campaigns',
  'list_campaign_media',
  'get_campaign_main_dashboard',
  'get_campaign_social_analytics',
  'get_campaign_stripe_overview',
  'discover_channel_context',
])

const SKILL_WRITE_LOCKED_SYSTEM_AGENT_KEYS = new Set([
  'atlas',
  'brain_scholar',
  'viktor',
  'widget_builder',
])

function isSkillWriteLockedSystemAgent(agentKey: string): boolean {
  return SKILL_WRITE_LOCKED_SYSTEM_AGENT_KEYS.has(agentKey.trim().toLowerCase())
}

function isMcpSessionKey(sessionKey?: string): boolean {
  return typeof sessionKey === 'string' && sessionKey.includes('::mcp:')
}

function resolveProtectedSystemAgentRecord(agentKey: string): ArtifactAgentRecord | null {
  const contract = getSystemAgentContract(agentKey)
  if (!contract) return null
  const capabilityProfile = contract.roleDefaultKey
  const capabilityDomain = capabilityProfile === 'system_flows' ? 'flows' : 'management'
  return {
    agent_key: contract.agentKey,
    level: 'system',
    role: contract.displayName,
    config: {
      capability_profile: capabilityProfile,
      capability_domain: capabilityDomain,
    },
  }
}

@Injectable()
export class ArtifactLegacyRuntimeCoreService {
  constructor(
    private readonly repository = new ArtifactLegacyRuntimeRepository(),
    private readonly apiService = new ArtifactLegacyRuntimeApiService(repository),
  ) {}

  async emitProgress(
    onProgress: ((message: string) => void | Promise<void>) | undefined,
    message: string,
  ): Promise<void> {
    if (!onProgress) return
    const clean = message.trim()
    if (!clean) return
    await onProgress(clean)
  }

  async authorizeAction(
    target: Record<string, any>,
    action: string,
    data: Record<string, unknown>,
    sessionKey?: string,
  ): Promise<{ allowed: boolean; reason?: string }> {
    const userId = target.resolveUserId(sessionKey)
    const callerAgentKey = target.parseAgentIdFromSessionKey(sessionKey ?? '')
    if (!callerAgentKey)
      return { allowed: false, reason: 'Invalid x-session-key: agent key is required' }
    const supabase = await target.getUserClient(userId, sessionKey as string)
    let authOrgId = target.resolveOrgId?.(sessionKey) as string | null | undefined
    if (authOrgId === undefined && sessionKey) {
      const conversationIdForCtx = target.parseConversationId(sessionKey)
      if (conversationIdForCtx) {
        const ctx = target.requestContext.get(conversationIdForCtx)
        if (ctx) authOrgId = ctx.orgId
      }
    }
    if (authOrgId === undefined) authOrgId = null
    const { data: agentData, error } = await this.repository.findAgentForAuthorization(supabase, {
      agentKey: callerAgentKey,
      orgId: authOrgId,
      userId,
    })
    if (error) throw error
    let callerAgent = agentData as ArtifactAgentRecord | null
    if (!callerAgent && isProtectedSystemAgent(callerAgentKey)) {
      callerAgent = resolveProtectedSystemAgentRecord(callerAgentKey)
    }
    if (!callerAgent)
      return {
        allowed: false,
        reason: `Unknown agent "${callerAgentKey}". Action denied by RBAC policy.`,
      }
    const policy = resolveCapabilityPolicy(callerAgent as ArtifactAgentRecord)
    if (!policy)
      return {
        allowed: false,
        reason: `Agent "${callerAgentKey}" has no valid capability profile. Action denied by RBAC policy.`,
      }
    const accessDecision = await this.authorizeAccessPolicyAction(
      target,
      action,
      callerAgentKey,
      authOrgId,
      userId,
      sessionKey,
    )
    if (!accessDecision.allowed) return accessDecision
    const actionDecision =
      typeof target.agentPolicyService?.canExecuteAction === 'function'
        ? await target.agentPolicyService.canExecuteAction(callerAgentKey, action, {
            orgId: authOrgId,
            userId: authOrgId ? null : userId,
          })
        : isArtifactActionAllowed(policy, action)
    if (!actionDecision.allowed) {
      return {
        allowed: false,
        reason:
          actionDecision.reason ??
          `Action "${action}" is not allowed for agent "${callerAgentKey}" (${policy.profile}/${policy.domain}/${policy.level}).`,
      }
    }
    if (action === 'use_integration') {
      const nestedDecision = this.authorizeIntegrationSubAction(policy, data)
      if (!nestedDecision.allowed) {
        return {
          allowed: false,
          reason:
            nestedDecision.reason ??
            `Integration action is not allowed for agent "${callerAgentKey}" (${policy.profile}/${policy.domain}/${policy.level}).`,
        }
      }
    }
    if (SKILL_WRITE_ACTIONS.has(action)) {
      const targetAgentKey = this.resolveSkillWriteTargetAgentKey(action, data)
      if (targetAgentKey && targetAgentKey !== callerAgentKey) {
        const skillTargetCheck = await this.authorizeSkillTarget(
          supabase,
          userId,
          policy,
          callerAgentKey,
          targetAgentKey,
          authOrgId,
        )
        if (!skillTargetCheck.allowed) return skillTargetCheck
      }
    }
    if (CEO_ONLY_ACTIONS.has(action)) {
      const archetype = callerAgent.config?.archetype
      if (archetype !== 'ceo') {
        return {
          allowed: false,
          reason: `Action "${action}" is restricted to CEO agents. This agent archetype is "${archetype ?? 'unset'}".`,
        }
      }
    }
    if (MUTATING_CAMPAIGN_ACTIONS.has(action)) {
      const permCheck = await this.checkCampaignPermission(target, userId, sessionKey, authOrgId)
      if (!permCheck.allowed) return permCheck
    }
    return { allowed: true }
  }

  private resolveSkillWriteTargetAgentKey(action: string, data: Record<string, unknown>): string {
    if (action === 'copy_skill_resource') {
      return String(data.target_agent_key ?? data.agent_key ?? '')
    }
    return String(data.agent_key ?? '')
  }

  private async authorizeAccessPolicyAction(
    target: Record<string, any>,
    action: string,
    agentKey: string,
    orgId: string | null,
    userId: string,
    sessionKey?: string,
  ): Promise<{ allowed: boolean; reason?: string }> {
    if (
      isMcpSessionKey(sessionKey) &&
      (PERSONAL_BRAIN_POLICY_ACTIONS.has(action) || CAMPAIGN_CONTEXT_POLICY_ACTIONS.has(action))
    ) {
      return { allowed: true }
    }

    const policyService = target.agentPolicyService
    if (!policyService) {
      if (PERSONAL_BRAIN_POLICY_ACTIONS.has(action)) {
        return {
          allowed: false,
          reason: `Action "${action}" requires personal brain access, but policy service is unavailable.`,
        }
      }
      if (CAMPAIGN_CONTEXT_POLICY_ACTIONS.has(action)) {
        return {
          allowed: false,
          reason: `Action "${action}" requires campaign context access, but policy service is unavailable.`,
        }
      }
      return { allowed: true }
    }

    const scope = { orgId, userId: orgId ? null : userId }
    if (PERSONAL_BRAIN_POLICY_ACTIONS.has(action)) {
      const allowed = await policyService.canAgentUseCapability(
        agentKey,
        'brain_access',
        'personal',
        scope,
      )
      return allowed
        ? { allowed: true }
        : {
            allowed: false,
            reason: `Action "${action}" requires the "Read personal brain" switch to be on.`,
          }
    }

    if (CAMPAIGN_CONTEXT_POLICY_ACTIONS.has(action)) {
      const allowed = await policyService.canAgentUseCapability(
        agentKey,
        'campaign_context',
        '*',
        scope,
      )
      return allowed
        ? { allowed: true }
        : {
            allowed: false,
            reason: `Action "${action}" requires the "Read current campaign context" switch to be on.`,
          }
    }

    return { allowed: true }
  }

  private async checkCampaignPermission(
    target: Record<string, any>,
    userId: string,
    sessionKey?: string,
    authOrgId?: string | null,
  ): Promise<{ allowed: boolean; reason?: string }> {
    if (!sessionKey) return { allowed: true }
    const conversationId = target.parseConversationId(sessionKey)
    if (!conversationId) return { allowed: true }
    const ctx = target.requestContext?.get(conversationId)
    const campaignId = ctx?.campaignId as string | null | undefined
    if (!campaignId) return { allowed: true }

    const svc = target.svc?.client ?? target.supabase
    if (!svc) return { allowed: true }

    const { data: campaign } = await this.repository.findCampaignAccessCampaign(svc, campaignId)
    if (!campaign) return { allowed: true }

    if (String(campaign.user_id) === userId) return { allowed: true }

    const campaignOrgId = (campaign.org_id as string | null) ?? authOrgId ?? null
    if (!campaignOrgId) {
      return { allowed: false, reason: 'Edit access required for this campaign.' }
    }

    const { data: orgMember } = await this.repository.findActiveOrgMember(svc, {
      orgId: campaignOrgId,
      userId,
    })
    if (!orgMember) {
      return { allowed: false, reason: 'Edit access required for this campaign.' }
    }

    const orgRole = String(orgMember.role ?? '')
    if (orgRole === 'owner' || orgRole === 'admin') return { allowed: true }

    const { data: perm } = await this.repository.findOrgCampaignPermission(svc, {
      campaignId,
      orgMemberId: String(orgMember.id),
    })
    const permission = (perm?.permission as string) ?? 'view'
    if (permission === 'edit') return { allowed: true }

    return { allowed: false, reason: 'Edit access required for this campaign.' }
  }

  async authorizeSkillTarget(
    supabase: SupabaseClient,
    userId: string,
    callerPolicy: ArtifactCapabilityPolicy,
    callerAgentKey: string,
    targetAgentKey: string,
    authOrgId?: string | null,
  ): Promise<{ allowed: boolean; reason?: string }> {
    if (callerPolicy.profile === 'system_hr') {
      if (isSkillWriteLockedSystemAgent(targetAgentKey)) {
        return {
          allowed: false,
          reason: `Agent "${targetAgentKey}" skills are platform-managed and cannot be edited by Jaime.`,
        }
      }
      return { allowed: true }
    }
    if (callerPolicy.level === 'c_level') return { allowed: true }
    if (callerPolicy.level === 'employee')
      return {
        allowed: false,
        reason: `Agent "${callerAgentKey}" (employee) can only manage its own skills.`,
      }
    if (callerPolicy.level === 'manager') {
      const { data: targetAgent } = await this.repository.findTargetAgentLevelForSkillAuthorization(
        supabase,
        {
          orgId: authOrgId,
          targetAgentKey,
          userId,
        },
      )
      const targetLevel = normalizeAgentLevel(targetAgent?.level)
      if (targetLevel !== 'employee') {
        return {
          allowed: false,
          reason: `Agent "${callerAgentKey}" (manager) can only manage skills for employee-level agents.`,
        }
      }
      return { allowed: true }
    }
    return { allowed: false, reason: 'Skill target authorization failed.' }
  }

  authorizeIntegrationSubAction(
    policy: ArtifactCapabilityPolicy,
    data: Record<string, unknown>,
  ): { allowed: boolean; reason?: string } {
    const service = String(data.service ?? '')
    const integrationAction = String(data.integration_action ?? data.action ?? '')
    return isIntegrationSubActionAllowed(policy, service, integrationAction)
  }

  async resolveMissionContext(
    target: Record<string, any>,
    sessionKey: string,
    userId: string,
  ): Promise<{ missionId: string; campaignId: string | null; orgId: string | null }> {
    const missionId = await this.resolveMissionIdForSession(target, sessionKey, userId)
    if (!missionId) throw new Error('mission_id required via mission session key')
    const { data: mission, error } = await this.repository.findMissionContext(
      target.serviceClient,
      missionId,
    )
    if (error) throw error
    if (!mission || String(mission.user_id ?? '') !== userId)
      throw new Error('Mission not found for session')
    return {
      missionId: String(mission.id),
      campaignId: (mission.campaign_id as string | null) ?? null,
      orgId: (mission.org_id as string | null) ?? null,
    }
  }

  async resolveMissionIdForSession(
    target: Record<string, any>,
    sessionKey: string,
    userId: string,
  ): Promise<string | null> {
    if (!sessionKey) return null
    let base = sessionKey
    const dblIdx = base.indexOf('::')
    if (dblIdx !== -1) base = base.substring(0, dblIdx)
    const parts = base.split(':')
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const modeIdx = parts.findIndex(
      (p, i) => i >= 2 && (p === 'mission' || p === 'subtask' || p === 'state' || p === 'eval'),
    )
    const mode = modeIdx !== -1 ? parts[modeIdx] : parts[2]
    if (mode === 'mission') {
      const idIdx = modeIdx !== -1 ? modeIdx + 3 : 5
      const missionId = parts[idIdx] ?? ''
      return uuidPattern.test(missionId) ? missionId : null
    }
    if (mode === 'subtask') {
      const idIdx = modeIdx !== -1 ? modeIdx + 3 : 5
      const subtaskId = parts[idIdx] ?? ''
      if (!uuidPattern.test(subtaskId)) return null
      const { data, error } = await this.repository.findSubtaskMissionContext(
        target.serviceClient,
        subtaskId,
      )
      if (error) throw error
      if (!data || String(data.user_id ?? '') !== userId) return null
      const missionId = String(data.mission_id ?? '')
      return uuidPattern.test(missionId) ? missionId : null
    }
    const fallbackId = target.parseConversationId(sessionKey) ?? ''
    return uuidPattern.test(fallbackId) ? fallbackId : null
  }

  async persistMissionDeliverable(target: Record<string, any>, input: any) {
    const normalizedMetadata: Record<string, unknown> = {
      ...(input.metadata ?? {}),
      source: 'agent_tool',
      source_action: input.sourceAction,
      agent_key: input.agentKey,
    }
    const payload: Record<string, unknown> = {
      mission_id: input.missionId,
      user_id: input.userId,
      campaign_id: input.campaignId,
      agent_key: input.agentKey,
      type: input.type,
      title: input.title,
      content: input.content ?? null,
      content_json: input.contentJson ?? null,
      file_url: input.fileUrl ?? null,
      file_name: input.fileName ?? null,
      file_size: input.fileSize ?? null,
      mime_type: input.mimeType ?? null,
      source_action: input.sourceAction,
      generation_status:
        typeof normalizedMetadata.media_generation_status === 'string'
          ? normalizedMetadata.media_generation_status
          : null,
      generation_job_id:
        typeof normalizedMetadata.media_job_id === 'string'
          ? normalizedMetadata.media_job_id
          : null,
      org_id: input.orgId ?? null,
      entity_id: input.metadata?.entity_id ?? null,
      entity_table: input.metadata?.entity_table ?? null,
      source: input.source ?? 'mission',
      metadata: normalizedMetadata,
    }
    const { data, error } = await this.repository.saveMissionDeliverable(target.serviceClient, {
      missionId: input.missionId,
      payload,
      updateId: input.updateId,
      userId: input.userId,
    })
    if (error) throw error
    const row = data as Record<string, unknown>
    const deliverableId = String(row.id)
    target.logger.log(
      `[mission_deliverable] source_action=${input.sourceAction} mission=${input.missionId} deliverable=${deliverableId} type=${row.type}`,
    )
    return {
      success: true,
      id: deliverableId,
      deliverable_id: deliverableId,
      type: String(row.type),
      title: String(row.title),
      file_url: (row.file_url as string | null) ?? null,
      file_name: (row.file_name as string | null) ?? null,
      metadata: (row.metadata as Record<string, unknown>) ?? {},
    }
  }

  async mainApiCall(
    target: Record<string, any>,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    sessionKey?: string,
    body?: Record<string, unknown>,
  ): Promise<unknown> {
    return this.apiService.mainApiCall(target, method, path, sessionKey, body)
  }

  async mainApiCallMissionSessionDirect(
    target: Record<string, any>,
    method: string,
    path: string,
    userId: string,
    body?: Record<string, unknown>,
    orgId?: string | null,
  ): Promise<unknown> {
    return this.apiService.mainApiCallMissionSessionDirect(
      target,
      method,
      path,
      userId,
      body,
      orgId,
    )
  }

  requireMissionId(input: Record<string, unknown>): string {
    const missionId = (input.mission_id as string) ?? ''
    if (!missionId) throw new Error('mission_id is required')
    return missionId
  }
}
