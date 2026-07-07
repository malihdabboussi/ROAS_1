import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseServiceClient } from '@vibey/api-shared'
import { MissionAgentGatewayService } from '../../missions/services/gateways/mission-agent-gateway.service'
import type { UpsertBrainSharingInput } from '../dto'
import { OrgSharingRepository } from '../repositories/org-sharing.repository'

@Injectable()
export class OrgSharingService {
  private readonly supabase: SupabaseClient

  constructor(
    private readonly svc: SupabaseServiceClient,
    @Optional()
    @Inject(MissionAgentGatewayService)
    private readonly gatewayService?: MissionAgentGatewayService,
    private readonly sharingRepository: OrgSharingRepository = new OrgSharingRepository(),
  ) {
    this.supabase = svc.client
  }

  async listCampaignPermissions(orgId: string, campaignId: string) {
    const { data, error } = await this.sharingRepository.listCampaignPermissions(
      this.supabase,
      orgId,
      campaignId,
    )
    if (error) throw new Error(`Failed to list campaign permissions: ${error.message}`)
    return data ?? []
  }

  async upsertCampaignPermission(
    orgId: string,
    memberId: string,
    campaignId: string,
    permission: 'view' | 'edit',
    grantedBy: string,
  ) {
    const { data: campaign, error: campaignLookupError } =
      await this.sharingRepository.findCampaignForPermission(this.supabase, campaignId)
    if (campaignLookupError)
      throw new Error(`Failed to validate campaign: ${campaignLookupError.message}`)
    if (!campaign || campaign.deleted_at != null) {
      throw new NotFoundException('Campaign not found')
    }
    if (String(campaign.org_id ?? '') !== String(orgId)) {
      throw new BadRequestException('Campaign does not belong to this organization')
    }

    const { data, error } = await this.sharingRepository.upsertCampaignPermission(
      this.supabase,
      memberId,
      campaignId,
      permission,
      grantedBy,
    )
    if (error) throw new Error(`Failed to upsert campaign permission: ${error.message}`)

    if (this.gatewayService) {
      const memberUserId = await this.sharingRepository.findMemberUserId(this.supabase, memberId)
      if (memberUserId) {
        this.gatewayService.triggerFullSync(memberUserId).catch(() => {})
      }
    }

    return data
  }

  async removeCampaignPermission(memberId: string, campaignId: string) {
    const { error } = await this.sharingRepository.removeCampaignPermission(
      this.supabase,
      memberId,
      campaignId,
    )
    if (error) throw new Error(`Failed to remove campaign permission: ${error.message}`)
  }

  async listBrainPermissions(orgId: string) {
    const { data, error } = await this.sharingRepository.listBrainPermissions(
      this.supabase,
      orgId,
    )
    if (error) throw new Error(`Failed to list brain permissions: ${error.message}`)
    return data ?? []
  }

  private normalizeBrainShareInput(orgId: string, input: UpsertBrainSharingInput) {
    const entityType = input.entity_type ?? 'org'
    return {
      entity_type: entityType,
      entity_id: input.entity_id ?? orgId,
      level: input.level ?? input.permission ?? 'query',
    }
  }

  private async assertBrainCanBeSharedInOrg(
    supabase: SupabaseClient,
    orgId: string,
    brainId: string,
    sharedBy: string,
  ) {
    const { data, error } = await this.sharingRepository.findBrainForShare(supabase, brainId)
    if (error) throw new Error(`Failed to validate brain: ${error.message}`)
    if (!data) throw new NotFoundException('Brain not found')
    if (String(data.org_id ?? '') === orgId) return
    if (
      data.org_id == null &&
      (String(data.owner_id ?? '') === sharedBy || String(data.created_by ?? '') === sharedBy)
    ) {
      return
    }
    if (data.org_id == null) {
      throw new BadRequestException('Personal brain can only be shared by its owner')
    }
    if (String(data.org_id ?? '') !== orgId) {
      throw new BadRequestException('Brain does not belong to this organization')
    }
  }

  private async assertShareTargetBelongsToOrg(
    supabase: SupabaseClient,
    orgId: string,
    share: ReturnType<OrgSharingService['normalizeBrainShareInput']>,
  ) {
    if (share.entity_type === 'org') {
      if (share.entity_id !== orgId) {
        throw new BadRequestException('Organization brain share must target the active org')
      }
      return
    }

    if (share.entity_type === 'user') {
      const { data, error } = await this.sharingRepository.findActiveMemberForBrainShareTarget(
        supabase,
        orgId,
        share.entity_id,
      )
      if (error) throw new Error(`Failed to validate brain share user: ${error.message}`)
      if (!data) throw new BadRequestException('Brain share user is not an active org member')
      return
    }

    const { data, error } = await this.sharingRepository.findAgentTeamForBrainShareTarget(
      supabase,
      orgId,
      share.entity_id,
    )
    if (error) throw new Error(`Failed to validate brain share team: ${error.message}`)
    if (!data)
      throw new BadRequestException('Brain share team does not belong to this organization')
  }

  async upsertBrainPermission(
    supabase: SupabaseClient,
    orgId: string,
    brainId: string,
    sharedBy: string,
    input: UpsertBrainSharingInput,
  ) {
    await this.assertBrainCanBeSharedInOrg(supabase, orgId, brainId, sharedBy)
    const share = this.normalizeBrainShareInput(orgId, input)
    await this.assertShareTargetBelongsToOrg(supabase, orgId, share)

    const { data, error } = await this.sharingRepository.upsertBrainShare(supabase, {
      orgId,
      brainId,
      entityType: share.entity_type,
      entityId: share.entity_id,
      level: share.level,
      createdBy: sharedBy,
    })
    if (error) throw new Error(`Failed to upsert brain permission: ${error.message}`)
    return data
  }

  async removeBrainShare(
    supabase: SupabaseClient,
    orgId: string,
    brainId: string,
    shareId: string,
  ) {
    const { error } = await this.sharingRepository.removeBrainShare(
      supabase,
      orgId,
      brainId,
      shareId,
    )
    if (error) throw new Error(`Failed to remove brain permission: ${error.message}`)
  }

  async removeBrainPermission(supabase: SupabaseClient, orgId: string, brainId: string) {
    const { error } = await this.sharingRepository.removeOrgBrainShare(supabase, orgId, brainId)
    if (error) throw new Error(`Failed to remove brain permission: ${error.message}`)
  }

  async shareLegacyBrain(
    supabase: SupabaseClient,
    orgId: string,
    userId: string,
    input: UpsertBrainSharingInput & { brain_id: string },
  ) {
    const { data, error } = await this.sharingRepository.upsertLegacyBrainShare(supabase, {
      orgId,
      brainId: input.brain_id,
      entityType: input.entity_type ?? 'org',
      entityId: input.entity_id ?? orgId,
      level: input.level ?? input.permission ?? 'query',
      createdBy: userId,
    })
    if (error) throw new HttpException('Failed to share brain', HttpStatus.INTERNAL_SERVER_ERROR)
    return data
  }

  async unshareLegacyBrain(
    supabase: SupabaseClient,
    orgId: string,
    brainId: string,
    userId: string,
  ) {
    await this.sharingRepository.unshareLegacyBrain(supabase, orgId, brainId, userId)
  }

  async listLegacySharedBrains(supabase: SupabaseClient, orgId: string) {
    const { data, error } = await this.sharingRepository.listLegacySharedBrains(supabase, orgId)
    if (error)
      throw new HttpException('Failed to list shared brains', HttpStatus.INTERNAL_SERVER_ERROR)
    return data ?? []
  }
}
