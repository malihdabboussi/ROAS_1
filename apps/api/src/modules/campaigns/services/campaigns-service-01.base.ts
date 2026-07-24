import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { CampaignsServiceSharedBase } from './campaigns-service-shared.base'

export abstract class CampaignsServiceBase01 extends CampaignsServiceSharedBase {
  protected async ensureCoreCampaignAgents(
    supabase: SupabaseClient,
    userId: string,
    campaignId: string,
    orgId?: string | null,
  ): Promise<void> {
    for (const agentKey of CampaignsServiceBase01.CAMPAIGN_CORE_AGENT_KEYS) {
      let agent: Record<string, unknown> | null = null
      try {
        agent = await this.campaignAccessRepo.findAgentRegistryEntry(
          supabase,
          agentKey,
          userId,
          orgId,
        )
      } catch (error) {
        const message = error instanceof Error ? error.message : 'unknown'
        this.logger.warn(
          `ensureCoreCampaignAgents skipped ${agentKey} for campaign ${campaignId}: ${message}`,
        )
        continue
      }
      if (!agent?.agent_key) continue
      await this.campaignsRepo.upsertCampaignAgent(supabase, {
        campaign_id: campaignId,
        user_id: userId,
        agent_key: agentKey,
        name: String(agent.name ?? agentKey),
        status: 'idle',
        org_id: orgId ?? null,
      })
    }
  }
  protected async ensureCampaignBrain(
    supabase: SupabaseClient,
    userId: string,
    campaignId: string,
    campaignName: string,
    orgId?: string | null,
  ): Promise<void> {
    const existing = await this.campaignAccessRepo.findCampaignBrain(supabase, campaignId)
    if (existing?.id) return
    const { error } = await this.campaignAccessRepo.createCampaignBrain(supabase, {
      owner_id: userId,
      campaign_id: campaignId,
      name: campaignName,
      is_default: false,
      color: '#6366F1',
      icon: 'campaign',
      tags: [],
      ...(orgId ? { org_id: orgId } : {}),
    })
    if (error && !error.message.includes('idx_ns_brains_campaign')) {
      this.logger.warn(`ensureCampaignBrain failed for campaign ${campaignId}: ${error.message}`)
    }
  }
  async listUserState(supabase: SupabaseClient, userId: string) {
    return this.campaignAccessRepo.listUserState(supabase, userId)
  }
  async upsertUserState(
    supabase: SupabaseClient,
    userId: string,
    campaignId: string,
    patch: { is_favorite?: boolean; is_hidden?: boolean },
    orgId?: string | null,
  ) {
    // Personal campaigns are merged into org lists — resolve with personal fallback.
    let campaign = await this.campaignsRepo.findById(supabase, campaignId, { orgId })
    if (!campaign && orgId) {
      campaign = await this.campaignsRepo.findById(supabase, campaignId, { orgId: null })
    }
    if (!campaign) throw new NotFoundException('Campaign not found')
    const cleaned: Record<string, unknown> = {
      user_id: userId,
      campaign_id: campaignId,
      updated_at: new Date().toISOString(),
    }
    if (typeof patch.is_favorite === 'boolean') cleaned.is_favorite = patch.is_favorite
    if (typeof patch.is_hidden === 'boolean') cleaned.is_hidden = patch.is_hidden
    return this.campaignAccessRepo.upsertUserState(supabase, cleaned)
  }
  async listCampaigns(
    supabase: SupabaseClient,
    userId: string,
    orgId?: string | null,
    orgRole?: string | null,
  ) {
    await this.ensureGeneralCampaign(supabase, userId, orgId)
    // Home always uses the personal-account Personal campaign — ensure it exists
    // even when listing org campaigns.
    await this.ensurePersonalCampaign(supabase, userId)
    const campaigns = await this.campaignsRepo.findByUserId(supabase, userId, orgId)
    const personal =
      orgId != null && orgId !== ''
        ? await this.campaignsRepo.findPersonalByUserId(supabase, userId)
        : null
    const withPersonal =
      personal && !campaigns.some((c) => String(c.id) === String(personal.id))
        ? [personal, ...campaigns]
        : campaigns
    if (withPersonal.length === 0) return []

    let membershipRole = orgRole ?? null
    let permissionByCampaign = new Map<string, 'view' | 'edit'>()
    if (orgId) {
      const membership = await this.campaignAccessRepo.findOrgMembership(supabase, orgId, userId)
      if (membership) {
        membershipRole = (membership.role as string) ?? membershipRole
        const isOrgAdmin = membershipRole === 'owner' || membershipRole === 'admin'
        if (isOrgAdmin) {
          for (const c of withPersonal) permissionByCampaign.set(String(c.id), 'edit')
        } else {
          const perms = await this.campaignAccessRepo.listOrgCampaignPermissions(
            supabase,
            String(membership.id),
          )
          for (const p of perms ?? []) {
            permissionByCampaign.set(
              String(p.campaign_id),
              (p.permission as 'view' | 'edit') ?? 'view',
            )
          }
        }
      }
      if (personal) permissionByCampaign.set(String(personal.id), 'edit')
    }

    const accessible = this.programPermissions
      ? await this.programPermissions.filterAccessibleCampaignsByProgram(
          supabase,
          withPersonal.map((c) => ({
            ...c,
            id: String(c.id),
            program_id:
              c.program_id === undefined || c.program_id === null ? null : String(c.program_id),
          })),
          userId,
          membershipRole as never,
          orgId,
          'view',
        )
      : withPersonal
    const accessibleIds = new Set(accessible.map((c) => String(c.id)))
    const visibleCampaigns = withPersonal.filter((c) => accessibleIds.has(String(c.id)))

    const ownerIds = Array.from(
      new Set(
        visibleCampaigns
          .map((campaign) => String(campaign.user_id))
          .filter((campaignOwnerId) => campaignOwnerId !== userId),
      ),
    )
    let ownerMap = new Map<
      string,
      { id: string; full_name: string | null; avatar_url: string | null }
    >()
    if (ownerIds.length > 0) {
      const owners = await this.campaignAccessRepo.listProfilesByIds(supabase, ownerIds)
      ownerMap = new Map(
        (owners ?? []).map((owner) => [
          String(owner.id),
          {
            id: String(owner.id),
            full_name: (owner.full_name as string | null) ?? null,
            avatar_url: (owner.avatar_url as string | null) ?? null,
          },
        ]),
      )
    }

    return visibleCampaigns.map((campaign) => {
      const ownerId = String(campaign.user_id)
      const isOwner = ownerId === userId
      const memberPermission = permissionByCampaign.get(String(campaign.id))
      const permission = isOwner ? 'owner' : memberPermission === 'edit' ? 'editor' : 'viewer'
      return {
        ...campaign,
        permission,
        owner: isOwner
          ? null
          : (ownerMap.get(ownerId) ?? { id: ownerId, full_name: null, avatar_url: null }),
      }
    })
  }
  async getCampaign(
    supabase: SupabaseClient,
    id: string,
    orgId?: string | null,
    userId?: string,
    orgRole?: string | null,
  ) {
    // Personal campaigns (org_id null) are merged into org campaign lists for the
    // Programs sidebar. Resolve them when active org context would otherwise 404.
    let campaign = await this.campaignsRepo.findById(supabase, id, { orgId })
    if (!campaign && orgId) {
      campaign = await this.campaignsRepo.findById(supabase, id, { orgId: null })
    }
    if (!campaign) throw new NotFoundException('Campaign not found')
    if (userId && this.programPermissions) {
      await this.programPermissions.assertCampaignProgramAccess(
        supabase,
        {
          program_id:
            campaign.program_id === undefined || campaign.program_id === null
              ? null
              : String(campaign.program_id),
        },
        userId,
        orgRole as never,
        'view',
        orgId,
      )
    }
    return campaign
  }
  async listCampaignTeam(supabase: SupabaseClient, userId: string, campaignId: string) {
    const campaign = await this.campaignsRepo.findById(supabase, campaignId)
    if (!campaign) throw new Error('Campaign not found')
    const campaignOwnerId = String(campaign.user_id)

    if (campaignOwnerId === userId) {
      await this.ensureCoreCampaignAgents(
        supabase,
        userId,
        campaignId,
        campaign.org_id as string | null,
      )
    }

    const assigned = await this.campaignsRepo.listCampaignAgents(
      supabase,
      campaignOwnerId,
      campaignId,
    )
    if (assigned.length === 0) {
      return []
    }
    const keys = Array.from(
      new Set(assigned.map((row) => String(row.agent_key ?? '')).filter(Boolean)),
    )
    const campaignOrgId = campaign.org_id as string | null
    const data = await this.campaignAccessRepo.listAgentRegistryEntries(
      supabase,
      keys,
      campaignOwnerId,
      campaignOrgId,
    )
    const byAgentKey = new Map(
      (data ?? []).map((row) => [
        String(row.agent_key ?? ''),
        {
          name: (row.name as string | null) ?? null,
          role: (row.role as string | null) ?? null,
          level: (row.level as string | null) ?? null,
          image_url: (row.image_url as string | null) ?? null,
          config: (row.config as Record<string, unknown> | null) ?? null,
        },
      ]),
    )
    return assigned.map((row) => {
      const reg = byAgentKey.get(String(row.agent_key ?? ''))
      return {
        ...row,
        name: reg?.name ?? row.name,
        role: reg?.role ?? null,
        level: reg?.level ?? null,
        image_url: reg?.image_url ?? null,
        config: reg?.config ?? null,
      }
    })
  }
  async listAgentCampaignIds(
    supabase: SupabaseClient,
    userId: string,
    rawAgentKey: string,
    orgId?: string | null,
  ) {
    const agentKey = rawAgentKey.toLowerCase().replace(/[^a-z0-9_]/g, '_')
    const assignedCampaignIds = await this.campaignsRepo.listCampaignIdsForAgent(
      supabase,
      userId,
      agentKey,
      orgId,
    )

    let idsFromAssignments: string[] = []
    if (assignedCampaignIds.length > 0) {
      idsFromAssignments = await this.campaignAccessRepo.listAssignedAccessibleCampaignIds(
        supabase,
        userId,
        assignedCampaignIds,
        orgId,
      )
    }
    const isCore = (CampaignsServiceBase01.CAMPAIGN_CORE_AGENT_KEYS as readonly string[]).includes(
      agentKey,
    )
    if (!isCore) {
      return idsFromAssignments
    }
    const accessible = await this.campaignsRepo.findByUserId(supabase, userId, orgId)
    const nonGeneralIds = accessible
      .filter((c) => !this.isExcludedFromTeamCampaignAssignments(c as Record<string, unknown>))
      .map((c) => String(c.id))

    return [...new Set([...idsFromAssignments, ...nonGeneralIds])]
  }
  async assignAgentToCampaign(
    supabase: SupabaseClient,
    userId: string,
    campaignId: string,
    rawAgentKey: string,
    opts?: { orgRole?: string | null },
  ) {
    const campaign = await this.campaignsRepo.findById(supabase, campaignId)
    if (!campaign) throw new Error('Campaign not found')
    const campaignOwnerId = String(campaign.user_id)
    const agentKey = rawAgentKey.toLowerCase().replace(/[^a-z0-9_]/g, '_')
    const assignOrgId = campaign.org_id as string | null

    const agent = await this.campaignAccessRepo.findAgentRegistryEntry(
      supabase,
      agentKey,
      campaignOwnerId,
      assignOrgId,
      'agent_key, name, team_id',
    )
    if (!agent?.agent_key) throw new Error('Agent not found')
    await this.assertCanAssignCampaignAgent(
      supabase,
      userId,
      assignOrgId,
      (agent.team_id as string | null | undefined) ?? null,
      opts?.orgRole ?? null,
    )

    return this.campaignsRepo.upsertCampaignAgent(supabase, {
      campaign_id: campaignId,
      user_id: campaignOwnerId,
      agent_key: agentKey,
      name: String(agent.name ?? agentKey),
      status: 'idle',
      org_id: assignOrgId ?? null,
    })
  }
  async unassignAgentFromCampaign(
    supabase: SupabaseClient,
    userId: string,
    campaignId: string,
    rawAgentKey: string,
    opts?: { orgRole?: string | null },
  ) {
    const campaign = await this.campaignsRepo.findById(supabase, campaignId)
    if (!campaign) throw new Error('Campaign not found')
    const campaignOwnerId = String(campaign.user_id)
    const campaignOrgId = (campaign.org_id as string | null) ?? null

    const agentKey = rawAgentKey.toLowerCase().replace(/[^a-z0-9_]/g, '_')
    if ((CampaignsServiceBase01.CAMPAIGN_CORE_AGENT_KEYS as readonly string[]).includes(agentKey)) {
      throw new ForbiddenException('Core agents (Vibey, Atlas) cannot be removed from a campaign')
    }
    if (campaignOrgId) {
      const agent = await this.campaignAccessRepo.findAgentRegistryEntry(
        supabase,
        agentKey,
        campaignOwnerId,
        campaignOrgId,
        'team_id',
      )
      await this.assertCanAssignCampaignAgent(
        supabase,
        userId,
        campaignOrgId,
        (agent?.team_id as string | null | undefined) ?? null,
        opts?.orgRole ?? null,
      )
    }
    await this.campaignsRepo.deleteCampaignAgent(supabase, campaignOwnerId, campaignId, agentKey)
    return { success: true }
  }
  protected async assertCanAssignCampaignAgent(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null,
    agentTeamId: string | null,
    orgRole: string | null,
  ): Promise<void> {
    if (!orgId) return
    if (orgRole === 'owner' || orgRole === 'admin') return
    if (orgRole !== 'creator') {
      throw new ForbiddenException('Only admins and creators can assign agents to campaigns')
    }
    if (!agentTeamId) {
      throw new ForbiddenException('You can only assign agents from your teams')
    }
    const belongsToTeam = await this.campaignAccessRepo.userBelongsToAgentTeam(
      supabase,
      userId,
      agentTeamId,
    )
    if (!belongsToTeam) {
      throw new ForbiddenException('You can only assign agents from your teams')
    }
  }
  async createCampaign(
    supabase: SupabaseClient,
    userId: string,
    data: { name: string; campaign_type?: string; config?: Record<string, unknown> },
    orgId?: string | null,
  ) {
    const config = (data.config ?? {}) as Record<string, unknown>
    if (config.system_kind === CampaignsServiceBase01.GENERAL_SYSTEM_KIND) {
      return this.ensureGeneralCampaign(supabase, userId, orgId)
    }
    if (config.system_kind === CampaignsServiceBase01.PERSONAL_SYSTEM_KIND) {
      return this.ensurePersonalCampaign(supabase, userId)
    }
    const created = await this.campaignsRepo.create(supabase, {
      user_id: userId,
      name: data.name,
      campaign_type: data.campaign_type ?? 'get-more-leads',
      config,
      org_id: orgId ?? null,
    })
    await this.ensureCoreCampaignAgents(supabase, userId, String(created.id), orgId)
    await this.ensureCampaignBrain(supabase, userId, String(created.id), data.name, orgId)
    return created
  }
  async updateCampaign(
    supabase: SupabaseClient,
    id: string,
    data: Record<string, unknown>,
    orgId?: string | null,
    userId?: string,
    orgRole?: string | null,
  ) {
    // Personal campaign is org_id null — look up without org filter when needed.
    let campaign = await this.campaignsRepo.findById(supabase, id, { orgId })
    if (!campaign && orgId) {
      campaign = await this.campaignsRepo.findById(supabase, id, { orgId: null })
    }
    if (!campaign) throw new NotFoundException('Campaign not found')
    if (this.isProtectedSystemCampaign(campaign)) {
      if (Object.prototype.hasOwnProperty.call(data, 'name')) {
        throw new ForbiddenException(
          this.isPersonalCampaign(campaign)
            ? 'Personal campaign name cannot be changed'
            : 'General campaign name cannot be changed',
        )
      }
      const nextStatus = typeof data.status === 'string' ? data.status : null
      if (nextStatus === 'archived') {
        throw new ForbiddenException(
          this.isPersonalCampaign(campaign)
            ? 'Personal campaign cannot be archived'
            : 'General campaign cannot be archived',
        )
      }
    }
    if (Object.prototype.hasOwnProperty.call(data, 'program_id')) {
      const programId = data.program_id
      if (programId !== null && programId !== undefined) {
        if (typeof programId !== 'string') {
          throw new BadRequestException('program_id must be a uuid or null')
        }
        const campaignOrgId =
          campaign.org_id === undefined || campaign.org_id === null ? null : String(campaign.org_id)
        let programQuery = supabase
          .from('programs')
          .select('id')
          .eq('id', programId)
          .is('deleted_at', null)
        programQuery = campaignOrgId
          ? programQuery.eq('org_id', campaignOrgId)
          : programQuery.is('org_id', null)
        const { data: program, error: programError } = await programQuery.maybeSingle()
        if (programError) throw new Error(`DB error: ${programError.message}`)
        if (!program) throw new BadRequestException('Program not found in this workspace')
        if (userId && this.programPermissions) {
          await this.programPermissions.assertProgramAccess(
            supabase,
            programId,
            userId,
            orgRole as never,
            'edit',
            campaignOrgId ?? orgId,
          )
        }
      }
      // Moving out of a restricted Program still requires access to that Program.
      const currentProgramId =
        campaign.program_id === undefined || campaign.program_id === null
          ? null
          : String(campaign.program_id)
      if (
        currentProgramId &&
        userId &&
        this.programPermissions &&
        (programId === null || programId !== currentProgramId)
      ) {
        await this.programPermissions.assertProgramAccess(
          supabase,
          currentProgramId,
          userId,
          orgRole as never,
          'edit',
          orgId,
        )
      }
    }
    return this.campaignsRepo.update(supabase, id, data)
  }
}
