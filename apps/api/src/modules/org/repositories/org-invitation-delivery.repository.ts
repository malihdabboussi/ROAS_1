import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

export type PlatformEmailConfigRow = {
  sender_email?: string | null
  sender_name?: string | null
  reply_to_email?: string | null
  sender_verified?: boolean | null
}

type InvitationNotificationInput = {
  userId: string
  token: string
  orgName: string
  inviterName: string
  roleLabel: string
}

@Injectable()
export class OrgInvitationDeliveryRepository {
  async findPlatformEmailConfig(supabase: SupabaseClient): Promise<PlatformEmailConfigRow | null> {
    const { data } = await supabase
      .from('platform_email_config')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    return (data as PlatformEmailConfigRow | null) ?? null
  }

  async findOrgName(supabase: SupabaseClient, orgId: string): Promise<string | null> {
    const { data } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', orgId)
      .maybeSingle()
    return typeof data?.name === 'string' ? data.name : null
  }

  async findInviterName(supabase: SupabaseClient, invitedBy: string): Promise<string | null> {
    const { data } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', invitedBy)
      .maybeSingle()
    return typeof data?.full_name === 'string' ? data.full_name : null
  }

  async insertInvitationNotification(
    supabase: SupabaseClient,
    input: InvitationNotificationInput,
  ): Promise<void> {
    const { error } = await supabase.from('user_notifications').insert({
      user_id: input.userId,
      org_id: null,
      type: 'org_invitation',
      title: `You've been invited to join ${input.orgName}`,
      body: `${input.inviterName} invited you as ${input.roleLabel}. Click to review and accept.`,
      mission_id: null,
      action_url: `/invite/${input.token}`,
    })
    if (error) throw error
  }
}
