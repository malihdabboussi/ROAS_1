import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { RequestScope } from '@vibey/api-shared'

@Injectable()
export class AgentsRepository {
  async findEnabledTemplateLevel(supabase: SupabaseClient, roleKey: string) {
    return supabase
      .from('agent_employee_templates')
      .select('level')
      .eq('role_key', roleKey)
      .eq('is_enabled', true)
      .maybeSingle()
  }

  async findTeamMembership(supabase: SupabaseClient, teamId: string, userId: string) {
    return supabase
      .from('agent_team_members')
      .select('team_id')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .maybeSingle()
  }

  async listAwarenessPoints(supabase: SupabaseClient, userId: string, scope: RequestScope) {
    let q = supabase
      .from('agent_awareness_points')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
    q = scope.orgId ? q.eq('org_id', scope.orgId) : q.is('org_id', null)
    return q
  }

  async markAwarenessPointsRead(supabase: SupabaseClient, userId: string, scope: RequestScope) {
    let q = supabase
      .from('agent_awareness_points')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('read_at', null)
    q = scope.orgId ? q.eq('org_id', scope.orgId) : q.is('org_id', null)
    return q
  }

  async markAwarenessPointRead(
    supabase: SupabaseClient,
    userId: string,
    pointId: string,
    scope: RequestScope,
  ) {
    let q = supabase
      .from('agent_awareness_points')
      .update({ read_at: new Date().toISOString() })
      .eq('id', pointId)
      .eq('user_id', userId)
    q = scope.orgId ? q.eq('org_id', scope.orgId) : q.is('org_id', null)
    return q
  }

  async deleteAwarenessPoint(
    supabase: SupabaseClient,
    userId: string,
    pointId: string,
    scope: RequestScope,
  ) {
    let q = supabase
      .from('agent_awareness_points')
      .delete()
      .eq('id', pointId)
      .eq('user_id', userId)
    q = scope.orgId ? q.eq('org_id', scope.orgId) : q.is('org_id', null)
    return q
  }

  async getProfilePublicSlug(supabase: SupabaseClient, userId: string) {
    return supabase.from('profiles').select('public_agent_slug').eq('id', userId).maybeSingle()
  }

  async getOrgSlugName(supabase: SupabaseClient, orgId: string) {
    return supabase.from('organizations').select('slug, name').eq('id', orgId).maybeSingle()
  }

  async getAuthUserEmail(supabase: SupabaseClient): Promise<string> {
    const { data: authUser } = await supabase.auth.getUser()
    return authUser?.user?.email ?? ''
  }

  async updateProfilePublicSlug(supabase: SupabaseClient, userId: string, slug: string) {
    return supabase.from('profiles').update({ public_agent_slug: slug }).eq('id', userId)
  }

  async updateAgentPublicPageEnabled(
    supabase: SupabaseClient,
    agentKey: string,
    userId: string,
    scope: RequestScope,
    enabled: boolean,
  ) {
    let q = supabase
      .from('agents_registry')
      .update({ public_page_enabled: enabled })
      .eq('agent_key', agentKey)
    q = scope.orgId
      ? q.eq('org_id', scope.orgId).is('user_id', null)
      : q.eq('user_id', userId).is('org_id', null)
    return q
  }

  async getAgentWidget(
    supabase: SupabaseClient,
    agentKey: string,
    userId: string,
    scope: RequestScope,
  ) {
    let q = supabase
      .from('agents_registry')
      .select(
        'public_page_token, widget_enabled, widget_title, widget_subtitle, widget_show_subtitle, widget_greeting, widget_accent_color, widget_launcher_icon_url, widget_header_image_url, widget_position, widget_allowed_origins, widget_home_config, widget_help_articles, widget_help_collections, widget_news_items, widget_campaign_id',
      )
      .eq('agent_key', agentKey)
    q = scope.orgId
      ? q.eq('org_id', scope.orgId).is('user_id', null)
      : q.eq('user_id', userId).is('org_id', null)

    return q.maybeSingle()
  }

  async findCampaign(supabase: SupabaseClient, campaignId: string, scope: RequestScope) {
    let campaignQuery = supabase.from('campaigns').select('id').eq('id', campaignId)
    campaignQuery = scope.orgId
      ? campaignQuery.eq('org_id', scope.orgId)
      : campaignQuery.is('org_id', null)
    return campaignQuery.maybeSingle()
  }

  async updateAgentWidget(
    supabase: SupabaseClient,
    agentKey: string,
    userId: string,
    scope: RequestScope,
    patch: Record<string, unknown>,
  ) {
    let q = supabase.from('agents_registry').update(patch).eq('agent_key', agentKey)
    q = scope.orgId
      ? q.eq('org_id', scope.orgId).is('user_id', null)
      : q.eq('user_id', userId).is('org_id', null)
    return q
  }
}
