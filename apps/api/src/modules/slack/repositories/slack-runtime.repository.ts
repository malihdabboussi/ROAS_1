import { Injectable } from '@nestjs/common'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createResilientFetch } from '@vibey/api-shared'

type OrgMemberProfileRow = {
  user_id?: string
  profiles?:
    | { email?: string | null; full_name?: string | null }
    | Array<{ email?: string | null; full_name?: string | null }>
    | null
}

export type SlackIdentityState = {
  platform_id: string
  vibey_user_id: string | null
  contact_id: string | null
  person_brain_id: string | null
  relationship_kind: string
  relationship_source: string
  identity_match_method: string
}

@Injectable()
export class SlackRuntimeRepository {
  private readonly serviceRoleFetch = createResilientFetch({
    label: 'slack_service',
    maxRetries: 2,
    timeoutMs: 60000,
  })

  getServiceRoleClient(): SupabaseClient {
    const url = process.env.SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    return createClient(url, serviceKey, {
      global: { fetch: this.serviceRoleFetch },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
  }

  async refreshSupabaseSession(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string | null }> {
    const supabaseUrl = process.env.SUPABASE_URL
    const anonKey = process.env.SUPABASE_ANON_KEY
    if (!supabaseUrl || !anonKey) throw new Error('Missing Supabase config')

    const anonClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: session, error } = await anonClient.auth.refreshSession({
      refresh_token: refreshToken,
    })
    const refreshedAccessToken = session.session?.access_token
    if (error || !refreshedAccessToken) {
      throw new Error(error?.message ?? 'No access token returned from refresh')
    }
    return {
      accessToken: refreshedAccessToken,
      refreshToken: session.session?.refresh_token ?? refreshToken,
    }
  }

  async disconnectIntegration(
    supabase: SupabaseClient,
    userId: string,
    orgId?: string | null,
  ): Promise<void> {
    let query = supabase
      .from('user_integrations')
      .update({ status: 'disconnected' })
      .eq('user_id', userId)
      .eq('integration_id', 'slack')
    query = orgId ? query.eq('org_id', orgId) : query.is('org_id', null)
    const { error } = await query
    if (error) throw new Error(`Failed to disconnect Slack: ${error.message}`)
  }

  async upsertChannelMember(
    supabase: SupabaseClient,
    member: Record<string, unknown>,
  ): Promise<void> {
    const { error } = await supabase
      .from('channel_members')
      .upsert(member, { onConflict: 'user_id,platform,platform_id,org_id' })
    if (error) throw error
  }

  async upsertResolvedSlackPerson(
    supabase: SupabaseClient,
    member: Record<string, unknown>,
  ): Promise<void> {
    await this.upsertChannelMember(supabase, {
      ...member,
      last_seen_at: new Date().toISOString(),
    })
  }

  async listSlackIdentityState(
    supabase: SupabaseClient,
    input: { userId: string; orgId?: string | null; platformIds: string[] },
  ): Promise<SlackIdentityState[]> {
    if (input.platformIds.length === 0) return []
    let query = supabase
      .from('channel_members')
      .select(
        'platform_id, vibey_user_id, contact_id, person_brain_id, relationship_kind, relationship_source, identity_match_method',
      )
      .eq('user_id', input.userId)
      .eq('platform', 'slack')
      .in('platform_id', input.platformIds)
    query = input.orgId ? query.eq('org_id', input.orgId) : query.is('org_id', null)
    const { data, error } = await query
    if (error) throw error
    return data ?? []
  }

  async listLinkedSlackIdentityState(
    supabase: SupabaseClient,
    input: {
      userId: string
      orgId?: string | null
      vibeyUserIds: string[]
      contactIds: string[]
      personBrainIds: string[]
    },
  ): Promise<SlackIdentityState[]> {
    const filters = [
      ...input.vibeyUserIds.map((id) => `vibey_user_id.eq.${id}`),
      ...input.contactIds.map((id) => `contact_id.eq.${id}`),
      ...input.personBrainIds.map((id) => `person_brain_id.eq.${id}`),
    ]
    if (filters.length === 0) return []
    let query = supabase
      .from('channel_members')
      .select(
        'platform_id, vibey_user_id, contact_id, person_brain_id, relationship_kind, relationship_source, identity_match_method',
      )
      .eq('user_id', input.userId)
      .eq('platform', 'slack')
      .or(filters.join(','))
    query = input.orgId ? query.eq('org_id', input.orgId) : query.is('org_id', null)
    const { data, error } = await query
    if (error) throw error
    return data ?? []
  }

  async findChannelMemberByPlatform(
    supabase: SupabaseClient,
    userId: string,
    platformId: string,
  ): Promise<{
    platform_id?: string
    display_name?: string | null
    username?: string | null
  } | null> {
    const { data } = await supabase
      .from('channel_members')
      .select('platform_id, display_name, username, notes')
      .eq('user_id', userId)
      .eq('platform', 'slack')
      .eq('platform_id', platformId)
      .maybeSingle()
    return data
  }

  async findChannelMemberDisplayName(
    supabase: SupabaseClient,
    userId: string,
    platformId: string,
  ): Promise<string | null> {
    const { data: member } = await supabase
      .from('channel_members')
      .select('display_name')
      .eq('user_id', userId)
      .eq('platform', 'slack')
      .eq('platform_id', platformId)
      .maybeSingle()
    return typeof member?.display_name === 'string' ? member.display_name : null
  }

  async listActiveOrgMembersWithProfileEmails(
    supabase: SupabaseClient,
    orgId: string,
  ): Promise<OrgMemberProfileRow[]> {
    const { data, error } = await supabase
      .from('org_members')
      .select('user_id, profiles!org_members_user_id_fk_profiles(email, full_name)')
      .eq('org_id', orgId)
      .eq('status', 'active')
    if (error) throw error
    return data ?? []
  }

  async findRecentCampaignIdForUser(
    supabase: SupabaseClient,
    userId: string,
  ): Promise<string | null> {
    const { data: recent } = await supabase
      .from('campaigns')
      .select('id')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .neq('status', 'archived')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    return recent?.id ?? null
  }

  async findGeneralCampaignIdForUser(
    supabase: SupabaseClient,
    userId: string,
  ): Promise<string | null> {
    const { data: general } = await supabase
      .from('campaigns')
      .select('id')
      .eq('user_id', userId)
      .contains('config', { system_kind: 'general' })
      .neq('status', 'archived')
      .limit(1)
      .maybeSingle()
    return general?.id ?? null
  }

  async findSlackConversation(
    supabase: SupabaseClient,
    input: {
      userId: string
      agentKey: string
      slackTeamId: string
      slackChannelId: string
      slackThreadTs?: string
      orgId?: string | null
    },
  ): Promise<{ id: string; campaign_id: string | null } | null> {
    let query = supabase
      .from('conversations')
      .select('id, campaign_id')
      .eq('user_id', input.userId)
      .eq('agent_id', input.agentKey)
      .eq('metadata->>slack_team_id', input.slackTeamId)
      .eq('metadata->>slack_channel_id', input.slackChannelId)

    query = input.orgId ? query.eq('org_id', input.orgId) : query.is('org_id', null)

    if (input.slackThreadTs) {
      query = query.eq('metadata->>slack_thread_ts', input.slackThreadTs)
    }

    const { data: existing } = await query.maybeSingle()
    return existing
  }

  async updateConversationCampaign(
    supabase: SupabaseClient,
    conversationId: string,
    campaignId: string,
  ): Promise<void> {
    await supabase
      .from('conversations')
      .update({ campaign_id: campaignId })
      .eq('id', conversationId)
  }

  async createSlackConversation(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<string> {
    const { data: created, error } = await supabase
      .from('conversations')
      .insert(payload)
      .select('id')
      .single()

    if (error) throw new Error(`Failed to create Slack conversation: ${error.message}`)
    return created.id
  }

  async uploadCampaignStorageObjectAndCreateSignedUrl(
    supabase: SupabaseClient,
    storagePath: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<string> {
    const storage = supabase.storage.from('campaigns')
    const { error } = await storage.upload(storagePath, buffer, {
      contentType,
      upsert: false,
    })
    if (error) {
      throw new Error(`Supabase storage upload failed: ${error.message}`)
    }

    const { data, error: signedUrlError } = await storage.createSignedUrl(
      storagePath,
      365 * 24 * 60 * 60,
    )
    if (signedUrlError || !data?.signedUrl) {
      throw new Error(
        `Supabase storage signed URL failed: ${signedUrlError?.message ?? 'No signed URL returned'}`,
      )
    }
    return data.signedUrl
  }
}
