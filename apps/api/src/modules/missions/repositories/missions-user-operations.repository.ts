import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { RequestScope } from '@vibey/api-shared'

@Injectable()
export class MissionsUserOperationsRepository {
  async findOrganizationBySlug(supabase: SupabaseClient, slug: string) {
    const { data, error } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return data
  }

  async updateProfileSettings(
    supabase: SupabaseClient,
    userId: string,
    patch: Record<string, unknown>,
  ) {
    await supabase.from('profiles').update(patch).eq('id', userId)
  }

  async getProfileSettings(supabase: SupabaseClient, userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select(
        'preferred_channel, daily_digest_enabled, daily_digest_time, awareness_loop_enabled, auto_approve_plans, public_agent_slug',
      )
      .eq('id', userId)
      .maybeSingle()
    return data
  }

  async updateAwarenessEnabled(supabase: SupabaseClient, userId: string, enabled: boolean) {
    await supabase.from('profiles').update({ awareness_loop_enabled: enabled }).eq('id', userId)
  }

  async updateAutoApprovePlans(supabase: SupabaseClient, userId: string, enabled: boolean) {
    const { error } = await supabase
      .from('profiles')
      .update({ auto_approve_plans: enabled })
      .eq('id', userId)
    return error
  }

  async listNotifications(
    supabase: SupabaseClient,
    userId: string,
    scope: RequestScope,
    opts: { limit: number; unreadOnly: boolean },
  ) {
    let query = supabase
      .from('user_notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(opts.limit)
    query = scope.orgId ? query.eq('org_id', scope.orgId) : query.is('org_id', null)
    if (opts.unreadOnly) query = query.is('read_at', null)
    const { data } = await query
    return data ?? []
  }

  async getUnreadCount(supabase: SupabaseClient, userId: string, scope: RequestScope) {
    let query = supabase
      .from('user_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('read_at', null)
    query = scope.orgId ? query.eq('org_id', scope.orgId) : query.is('org_id', null)
    const { count } = await query
    return count ?? 0
  }

  async markNotificationsReadAll(supabase: SupabaseClient, userId: string, scope: RequestScope) {
    let query = supabase
      .from('user_notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('read_at', null)
    query = scope.orgId ? query.eq('org_id', scope.orgId) : query.is('org_id', null)
    await query
  }

  async deleteReadNotifications(supabase: SupabaseClient, userId: string, scope: RequestScope) {
    let query = supabase
      .from('user_notifications')
      .delete()
      .eq('user_id', userId)
      .not('read_at', 'is', null)
    query = scope.orgId ? query.eq('org_id', scope.orgId) : query.is('org_id', null)
    await query
  }

  async markNotificationRead(
    supabase: SupabaseClient,
    userId: string,
    notificationId: string,
    scope: RequestScope,
  ) {
    let query = supabase
      .from('user_notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('user_id', userId)
    query = scope.orgId ? query.eq('org_id', scope.orgId) : query.is('org_id', null)
    await query
  }

  async deleteNotification(
    supabase: SupabaseClient,
    userId: string,
    notificationId: string,
    scope: RequestScope,
  ) {
    let query = supabase
      .from('user_notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', userId)
    query = scope.orgId ? query.eq('org_id', scope.orgId) : query.is('org_id', null)
    await query
  }

  async findMissionAttachmentCampaignId(
    supabase: SupabaseClient,
    userId: string,
    missionId: string,
  ) {
    const { data } = await supabase
      .from('missions')
      .select('campaign_id')
      .eq('id', missionId)
      .eq('user_id', userId)
      .maybeSingle()
    return (data?.campaign_id as string | null | undefined) ?? null
  }

  async uploadMissionAttachment(
    supabase: SupabaseClient,
    objectPath: string,
    file: Express.Multer.File,
  ): Promise<{ message: string } | null> {
    const { error } = await supabase.storage
      .from('mission-attachments')
      .upload(objectPath, file.buffer, { contentType: file.mimetype, upsert: false })
    return error
  }

  getMissionAttachmentPublicUrl(supabase: SupabaseClient, objectPath: string): string {
    const {
      data: { publicUrl },
    } = supabase.storage.from('mission-attachments').getPublicUrl(objectPath)
    return publicUrl
  }

  async insertMissionAttachmentMediaAsset(
    supabase: SupabaseClient,
    input: Record<string, unknown>,
  ): Promise<{ assetId?: string; error: { message: string } | null }> {
    const { data, error } = await supabase
      .from('media_assets')
      .insert(input)
      .select('id')
      .single()
    return { assetId: data?.id as string | undefined, error }
  }

  async findEvaluationDriftId(supabase: SupabaseClient, userId: string, missionId: string) {
    const { data } = await supabase
      .from('evaluation_drift')
      .select('id')
      .eq('mission_id', missionId)
      .eq('user_id', userId)
      .maybeSingle()
    return data?.id as string | undefined
  }

  async updateEvaluationDrift(
    supabase: SupabaseClient,
    id: string,
    patch: Record<string, unknown>,
  ) {
    const { error } = await supabase.from('evaluation_drift').update(patch).eq('id', id)
    return error
  }

  async findMissionRatingAgent(supabase: SupabaseClient, userId: string, missionId: string) {
    const { data } = await supabase
      .from('missions')
      .select('assigned_agent_key')
      .eq('id', missionId)
      .eq('user_id', userId)
      .maybeSingle()
    return data
  }

  async insertEvaluationDrift(supabase: SupabaseClient, input: Record<string, unknown>) {
    const { error } = await supabase.from('evaluation_drift').insert(input)
    return error
  }
}
