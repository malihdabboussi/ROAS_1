import { Inject, Injectable, Logger, Optional } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { LoggerService, SupabaseServiceClient } from '@vibey/api-shared'
import { MissionAgentGatewayService } from '../../missions/services/gateways/mission-agent-gateway.service'
import type { CreateOrgInput, InvitableRole, UpdateCreditLimitInput, UpdateOrgInput } from '../dto'
import { OrgSetupRepository } from '../repositories/org-setup.repository'
import { OrgRepository } from '../repositories/org.repository'

@Injectable()
export class OrgService {
  private readonly log = new Logger(OrgService.name)

  constructor(
    private readonly repo: OrgRepository,
    private readonly logger: LoggerService,
    private readonly serviceClient: SupabaseServiceClient,
    private readonly setupRepository: OrgSetupRepository = new OrgSetupRepository(),
    @Optional()
    @Inject(MissionAgentGatewayService)
    private readonly gatewayService?: MissionAgentGatewayService,
  ) {}

  async createOrg(supabase: SupabaseClient, userId: string, dto: CreateOrgInput) {
    // Slug check must use service role — user RLS only exposes orgs the user owns/belongs to,
    // so a taken slug owned by someone else would look free and fail later as a generic error.
    const existing = await this.repo.findBySlug(this.serviceClient.client, dto.slug)
    if (existing) {
      throw new Error('Organization slug already taken')
    }

    let createdOrgId: string | null = null
    try {
      // Org insert is allowed for the authenticated owner. Owner membership must use the
      // service role: user-scoped RLS on org_members can fail during first-member insert
      // (policy recursion / chicken-and-egg), leaving an orphan org that blocks the slug.
      const org = await this.repo.create(supabase, userId, dto)
      createdOrgId = org.id
      await this.repo.addMember(this.serviceClient.client, org.id, userId, 'owner', null)
      this.seedCoreAgents(org.id, userId).catch((e) =>
        this.log.warn(`Core agent seed failed for org ${org.id}: ${(e as Error).message}`),
      )
      this.seedStarterCredits(org.id, userId).catch((e) =>
        this.log.warn(`Starter credits failed for org ${org.id}: ${(e as Error).message}`),
      )
      return org
    } catch (error) {
      if (createdOrgId) {
        try {
          await this.repo.hardDelete(this.serviceClient.client, createdOrgId)
        } catch (rollbackError) {
          this.log.warn(
            `Failed to roll back orphan org ${createdOrgId}: ${(rollbackError as Error).message}`,
          )
        }
      }
      await this.logger.logError({
        severity: 'error',
        feature: 'org/create',
        error_code: 'DB_ERROR',
        message: 'Failed to create organization',
        context: { error: error instanceof Error ? error.message : 'Unknown', userId, dto },
      })
      throw new Error('Failed to create organization')
    }
  }

  private static readonly CORE_ORG_AGENTS = [
    {
      agent_key: 'vibey',
      name: 'Pixel',
      role: 'CMO',
      level: 'system',
      config: {
        archetype: 'ceo',
        capability_profile: 'vibey_ceo',
        capability_domain: 'management',
        model_id: 'auto',
      },
    },
    {
      agent_key: 'hr',
      name: 'Jaime',
      role: 'HR Manager',
      level: 'system',
      config: {
        capability_profile: 'system_hr',
        capability_domain: 'management',
        model_id: 'auto',
      },
    },
    {
      agent_key: 'atlas',
      name: 'Atlas',
      role: 'Brain Scholar & Knowledge Curator',
      level: 'system',
      config: {
        capability_profile: 'system_brain',
        capability_domain: 'management',
        model_id: 'auto',
      },
    },
    {
      agent_key: 'delegator',
      name: 'Delegator',
      role: 'Delegation Manager',
      level: 'system',
      config: {
        capability_profile: 'system_delegation',
        capability_domain: 'operations',
        platform_managed: true,
        model_id: 'auto',
      },
    },
  ] as const

  private async seedCoreAgents(orgId: string, userId: string): Promise<void> {
    const svc = this.serviceClient.client
    for (const agent of OrgService.CORE_ORG_AGENTS) {
      const existing = await this.setupRepository.findCoreOrgAgent(svc, orgId, agent.agent_key)
      if (existing) continue

      const error = await this.setupRepository.insertCoreOrgAgent(svc, {
        orgId,
        userId,
        agent,
      })
      if (error) this.log.warn(`Seed ${agent.agent_key} failed for org ${orgId}: ${error.message}`)
      else this.log.log(`Seeded ${agent.agent_key} agent for org ${orgId}`)
    }
  }

  private static readonly ORG_STARTER_CREDITS = 1_000

  private async seedStarterCredits(orgId: string, userId: string): Promise<void> {
    const svc = this.serviceClient.client
    const existing = await this.setupRepository.listCompletedStarterCreditPurchases(svc, orgId)
    if (existing && existing.length > 0) return

    await this.setupRepository.insertStarterCredits(
      svc,
      orgId,
      userId,
      OrgService.ORG_STARTER_CREDITS,
    )
    this.log.log(`Seeded ${OrgService.ORG_STARTER_CREDITS} starter credits for org ${orgId}`)
  }

  async getOrg(supabase: SupabaseClient, orgId: string) {
    return this.repo.findById(supabase, orgId)
  }

  async updateOrg(supabase: SupabaseClient, orgId: string, dto: UpdateOrgInput) {
    if (dto.slug) {
      const existing = await this.repo.findBySlug(this.serviceClient.client, dto.slug)
      if (existing && existing.id !== orgId) {
        throw new Error('Organization slug already taken')
      }
    }
    return this.repo.update(supabase, orgId, dto)
  }

  async deleteOrg(supabase: SupabaseClient, orgId: string) {
    await this.repo.suspendOrgMembers(supabase, orgId)
    await this.repo.softDelete(supabase, orgId)
  }

  async restoreOrg(supabase: SupabaseClient, orgId: string) {
    await this.repo.restore(supabase, orgId)
    await this.repo.reactivateOrgMembers(supabase, orgId)
  }

  async listUserOrgs(supabase: SupabaseClient, userId: string) {
    return this.repo.listUserOrgs(supabase, userId)
  }

  async listMembers(supabase: SupabaseClient, orgId: string) {
    return this.repo.listMembers(supabase, orgId)
  }

  async changeMemberRole(
    supabase: SupabaseClient,
    orgId: string,
    memberId: string,
    newRole: InvitableRole,
  ) {
    const members = await this.repo.listMembers(supabase, orgId)
    const target = members.find((m) => m.id === memberId)
    if (!target) throw new Error('Member not found')
    if (target.role === 'owner') throw new Error('Cannot change owner role')
    return this.repo.updateMemberRole(supabase, memberId, newRole)
  }

  async updateAiDataAdmin(
    supabase: SupabaseClient,
    orgId: string,
    memberId: string,
    enabled: boolean,
  ) {
    const members = await this.repo.listMembers(supabase, orgId)
    const target = members.find((member) => member.id === memberId)
    if (!target) throw new Error('Member not found')
    if (target.role === 'owner') throw new Error('Owner access cannot be disabled')
    return this.repo.updateMemberAiDataAdmin(supabase, memberId, enabled)
  }

  async removeMember(supabase: SupabaseClient, orgId: string, memberId: string, userId: string) {
    const members = await this.repo.listMembers(supabase, orgId)
    const target = members.find((m) => m.id === memberId)
    if (!target) throw new Error('Member not found')
    if (target.role === 'owner') throw new Error('Cannot remove the owner')
    await this.repo.pauseMemberMissions(supabase, orgId, target.user_id)
    await this.repo.removeMember(supabase, memberId)

    this.gatewayService?.triggerFullSync(target.user_id).catch(() => {})
  }

  async updateCreditLimit(
    supabase: SupabaseClient,
    orgId: string,
    memberId: string,
    dto: UpdateCreditLimitInput,
  ) {
    return this.repo.upsertCreditLimit(supabase, orgId, memberId, dto)
  }
}
