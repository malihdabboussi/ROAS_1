import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class OrgSharingRepository {
  async listCampaignPermissions(supabase: SupabaseClient, orgId: string, campaignId: string) {
    return supabase
      .from('org_campaign_permissions')
      .select(
        'id, org_member_id, campaign_id, permission, created_at, org_members!inner(id, user_id, role, status, profiles:profiles!org_members_user_id_fk_profiles(full_name, avatar_url, email))',
      )
      .eq('campaign_id', campaignId)
      .eq('org_members.org_id', orgId)
      .eq('org_members.status', 'active')
  }

  async findCampaignForPermission(supabase: SupabaseClient, campaignId: string) {
    return supabase
      .from('campaigns')
      .select('id, org_id, deleted_at')
      .eq('id', campaignId)
      .maybeSingle()
  }

  async upsertCampaignPermission(
    supabase: SupabaseClient,
    memberId: string,
    campaignId: string,
    permission: 'view' | 'edit',
    grantedBy: string,
  ) {
    return supabase
      .from('org_campaign_permissions')
      .upsert(
        {
          org_member_id: memberId,
          campaign_id: campaignId,
          permission,
          granted_by: grantedBy,
        },
        { onConflict: 'org_member_id,campaign_id' },
      )
      .select()
      .single()
  }

  async findMemberUserId(supabase: SupabaseClient, memberId: string) {
    const { data } = await supabase
      .from('org_members')
      .select('user_id')
      .eq('id', memberId)
      .maybeSingle()
    return data?.user_id ? String(data.user_id) : null
  }

  async removeCampaignPermission(supabase: SupabaseClient, memberId: string, campaignId: string) {
    return supabase
      .from('org_campaign_permissions')
      .delete()
      .eq('org_member_id', memberId)
      .eq('campaign_id', campaignId)
  }

  async listBrainPermissions(supabase: SupabaseClient, orgId: string) {
    return supabase
      .from('brain_shares')
      .select('id, org_id, brain_id, entity_type, entity_id, level, created_by, created_at')
      .eq('org_id', orgId)
  }

  async findBrainForShare(supabase: SupabaseClient, brainId: string) {
    return supabase
      .from('ns_brains')
      .select('id, org_id, owner_id, created_by')
      .eq('id', brainId)
      .maybeSingle()
  }

  async findActiveMemberForBrainShareTarget(
    supabase: SupabaseClient,
    orgId: string,
    userId: string,
  ) {
    return supabase
      .from('org_members')
      .select('id')
      .eq('org_id', orgId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle()
  }

  async findAgentTeamForBrainShareTarget(
    supabase: SupabaseClient,
    orgId: string,
    teamId: string,
  ) {
    return supabase.from('agent_teams').select('id').eq('id', teamId).eq('org_id', orgId).maybeSingle()
  }

  async upsertBrainShare(
    supabase: SupabaseClient,
    input: {
      orgId: string
      brainId: string
      entityType: string
      entityId: string
      level: string
      createdBy: string
    },
  ) {
    return supabase
      .from('brain_shares')
      .upsert(
        {
          org_id: input.orgId,
          brain_id: input.brainId,
          entity_type: input.entityType,
          entity_id: input.entityId,
          level: input.level,
          created_by: input.createdBy,
        },
        { onConflict: 'brain_id,entity_type,entity_id' },
      )
      .select()
      .single()
  }

  async removeBrainShare(
    supabase: SupabaseClient,
    orgId: string,
    brainId: string,
    shareId: string,
  ) {
    return supabase
      .from('brain_shares')
      .delete()
      .eq('id', shareId)
      .eq('org_id', orgId)
      .eq('brain_id', brainId)
  }

  async removeOrgBrainShare(supabase: SupabaseClient, orgId: string, brainId: string) {
    return supabase
      .from('brain_shares')
      .delete()
      .eq('org_id', orgId)
      .eq('brain_id', brainId)
      .eq('entity_type', 'org')
      .eq('entity_id', orgId)
  }

  async upsertLegacyBrainShare(
    supabase: SupabaseClient,
    input: {
      orgId: string
      brainId: string
      entityType: string
      entityId: string
      level: string
      createdBy: string
    },
  ) {
    return this.upsertBrainShare(supabase, input)
  }

  async unshareLegacyBrain(
    supabase: SupabaseClient,
    orgId: string,
    brainId: string,
    userId: string,
  ) {
    return supabase
      .from('brain_shares')
      .delete()
      .eq('org_id', orgId)
      .eq('brain_id', brainId)
      .eq('created_by', userId)
  }

  async listLegacySharedBrains(supabase: SupabaseClient, orgId: string) {
    return supabase
      .from('brain_shares')
      .select(
        '*, ns_brains(id, name, description, color, icon, agent_id), profiles:created_by(id, full_name, avatar_url)',
      )
      .eq('org_id', orgId)
  }
}
