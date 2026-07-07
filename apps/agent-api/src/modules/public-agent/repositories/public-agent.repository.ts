import { Injectable } from '@nestjs/common'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { SupabaseServiceClient } from '@vibey/api-shared'
import type { PublicAgentScope } from '../services/public-agent.service'

export interface PublicAgentOwnerToken {
  accessToken: string
  refreshToken: string
  orgId: string | null
  actingUserId: string
  expiresAt: number
}

export interface PublicAgentOwner {
  actingUserId: string
  orgId: string | null
}

@Injectable()
export class PublicAgentRepository {
  constructor(private readonly svc: SupabaseServiceClient) {}

  async findOrgOwnerId(orgId: string): Promise<string | null> {
    const { data, error } = await this.svc.client
      .from('organizations')
      .select('owner_id')
      .eq('id', orgId)
      .maybeSingle()
    if (error || !data?.owner_id) return null
    return data.owner_id as string
  }

  async findPublicAgentByToken(token: string): Promise<{
    user_id: string | null
    org_id: string | null
    agent_key: string
    widget_enabled: boolean
    widget_allowed_origins: string[]
    widget_campaign_id: string | null
  } | null> {
    const { data, error } = await this.svc.client
      .from('agents_registry')
      .select(
        'user_id, org_id, agent_key, public_page_enabled, widget_enabled, widget_allowed_origins, widget_campaign_id',
      )
      .eq('public_page_token', token)
      .or('public_page_enabled.eq.true,widget_enabled.eq.true')
      .maybeSingle()
    if (error || !data) return null
    return {
      user_id: (data.user_id as string | null) ?? null,
      org_id: (data.org_id as string | null) ?? null,
      agent_key: data.agent_key,
      widget_enabled: !!data.widget_enabled,
      widget_allowed_origins: (data.widget_allowed_origins as string[]) ?? [],
      widget_campaign_id: (data.widget_campaign_id as string | null) ?? null,
    }
  }

  async findAgentInfo(publicAgentToken: string): Promise<{
    user_id: string | null
    agent_key: string
    org_id: string | null
  } | null> {
    const { data, error } = await this.svc.client
      .from('agents_registry')
      .select('user_id, agent_key, org_id')
      .eq('public_page_token', publicAgentToken)
      .eq('public_page_enabled', true)
      .maybeSingle()
    if (error || !data) return null
    return data as { user_id: string | null; agent_key: string; org_id: string | null }
  }

  async findWidgetConfig(scope: PublicAgentScope, agentKey: string): Promise<Record<string, any> | null> {
    let query = this.svc.client
      .from('agents_registry')
      .select(
        'name, role, image_url, widget_enabled, widget_title, widget_subtitle, widget_show_subtitle, widget_greeting, widget_accent_color, widget_launcher_icon_url, widget_header_image_url, widget_position, widget_allowed_origins, widget_home_config, widget_help_articles, widget_help_collections, widget_news_items, widget_campaign_id',
      )
      .eq('agent_key', agentKey)
    query = scope.orgId
      ? query.eq('org_id', scope.orgId).is('user_id', null)
      : query.eq('user_id', scope.userId!).is('org_id', null)
    const { data, error } = await query.maybeSingle()
    if (error || !data) return null
    return data as Record<string, any>
  }

  async findProfileSlug(userId: string): Promise<string | null> {
    const { data } = await this.svc.client
      .from('profiles')
      .select('public_agent_slug')
      .eq('id', userId)
      .maybeSingle()
    return data?.public_agent_slug ?? null
  }

  async findOrgSlug(orgId: string): Promise<string | null> {
    const { data } = await this.svc.client
      .from('organizations')
      .select('slug')
      .eq('id', orgId)
      .maybeSingle()
    return data?.slug ?? null
  }

  createOwnerClient(accessToken: string): SupabaseClient {
    return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }

  async refreshOwnerSession(
    refreshToken: string,
  ): Promise<Omit<PublicAgentOwnerToken, 'orgId' | 'actingUserId'> | null> {
    const url = process.env.SUPABASE_URL
    const anonKey = process.env.SUPABASE_ANON_KEY
    if (!url || !anonKey) return null

    try {
      const client = createClient(url, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
      const { data, error } = await client.auth.refreshSession({ refresh_token: refreshToken })
      if (error || !data.session) return null

      return {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token ?? refreshToken,
        expiresAt: data.session.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
      }
    } catch {
      return null
    }
  }

  async mintOwnerToken(actingUserId: string, orgId: string | null): Promise<PublicAgentOwnerToken> {
    const url = process.env.SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const anonKey = process.env.SUPABASE_ANON_KEY
    if (!url || !serviceKey || !anonKey) {
      throw new Error('Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or SUPABASE_ANON_KEY')
    }

    const serviceClient = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: userData, error: userError } =
      await serviceClient.auth.admin.getUserById(actingUserId)
    if (userError || !userData?.user?.email) {
      throw new Error(
        `Public agent: failed to resolve user ${actingUserId}: ${userError?.message ?? 'no email'}`,
      )
    }

    const { data: linkData, error: linkError } = await serviceClient.auth.admin.generateLink({
      type: 'magiclink',
      email: userData.user.email,
    })
    if (linkError || !linkData?.properties?.email_otp) {
      throw new Error(
        `Public agent: failed to generate link for ${actingUserId}: ${linkError?.message ?? 'no OTP'}`,
      )
    }

    const anonClient = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: session, error: otpError } = await anonClient.auth.verifyOtp({
      email: userData.user.email,
      token: linkData.properties.email_otp,
      type: 'magiclink',
    })
    if (otpError || !session?.session?.access_token) {
      throw new Error(
        `Public agent: OTP exchange failed for ${actingUserId}: ${otpError?.message ?? 'no session'}`,
      )
    }

    return {
      accessToken: session.session.access_token,
      refreshToken: session.session.refresh_token ?? '',
      orgId,
      actingUserId,
      expiresAt: session.session.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
    }
  }

  async insertConversation(supabase: SupabaseClient, row: Record<string, unknown>) {
    return supabase.from('conversations').insert(row).select('id, created_at').single()
  }

  async listConversations(
    supabase: SupabaseClient,
    owner: PublicAgentOwner,
    agentKey: string,
    visitor: string,
    email: string,
  ) {
    const orFilter = email
      ? `metadata->>visitor_id.eq.${visitor},metadata->>visitor_email.eq.${email}`
      : `metadata->>visitor_id.eq.${visitor}`
    let query = supabase
      .from('conversations')
      .select('id, title, created_at, updated_at, metadata, contact_id')
      .eq('user_id', owner.actingUserId)
      .eq('agent_id', agentKey)
      .or(orFilter)
      .order('updated_at', { ascending: false })
      .limit(50)
    query = owner.orgId ? query.eq('org_id', owner.orgId) : query.is('org_id', null)
    return query
  }

  async listMessagePreviews(supabase: SupabaseClient, ids: string[]) {
    return supabase
      .from('messages')
      .select('conversation_id, content, created_at')
      .in('conversation_id', ids)
      .order('created_at', { ascending: false })
      .limit(ids.length * 4)
  }

  async findConversationForRename(
    supabase: SupabaseClient,
    owner: PublicAgentOwner,
    agentKey: string,
    conversationId: string,
  ) {
    let query = supabase
      .from('conversations')
      .select('id, metadata')
      .eq('id', conversationId)
      .eq('user_id', owner.actingUserId)
      .eq('agent_id', agentKey)
    query = owner.orgId ? query.eq('org_id', owner.orgId) : query.is('org_id', null)
    return query.maybeSingle()
  }

  async updateConversationTitle(
    supabase: SupabaseClient,
    owner: PublicAgentOwner,
    conversationId: string,
    title: string,
  ) {
    let query = supabase
      .from('conversations')
      .update({ title, updated_at: new Date().toISOString() })
      .eq('id', conversationId)
      .eq('user_id', owner.actingUserId)
    query = owner.orgId ? query.eq('org_id', owner.orgId) : query.is('org_id', null)
    return query
  }

  async listConversationMessages(supabase: SupabaseClient, conversationId: string) {
    return supabase
      .from('messages')
      .select('id, role, content, metadata, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
  }

  async findConversationForIdentify(
    supabase: SupabaseClient,
    owner: PublicAgentOwner,
    conversationId: string,
  ) {
    let query = supabase
      .from('conversations')
      .select('id, metadata, user_id')
      .eq('id', conversationId)
      .eq('user_id', owner.actingUserId)
    query = owner.orgId ? query.eq('org_id', owner.orgId) : query.is('org_id', null)
    return query.maybeSingle()
  }

  async updateConversationIdentity(
    supabase: SupabaseClient,
    owner: PublicAgentOwner,
    conversationId: string,
    update: Record<string, unknown>,
  ) {
    let query = supabase
      .from('conversations')
      .update(update)
      .eq('id', conversationId)
      .eq('user_id', owner.actingUserId)
    query = owner.orgId ? query.eq('org_id', owner.orgId) : query.is('org_id', null)
    return query
  }
}
