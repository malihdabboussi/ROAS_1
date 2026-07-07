import { Injectable } from '@nestjs/common'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class TelegramRuntimeRepository {
  createServiceRoleClient(fetchImpl: typeof fetch): SupabaseClient {
    const url = process.env.SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    return createClient(url, serviceKey, {
      global: { fetch: fetchImpl },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
  }

  async archiveActiveTelegramConversation(
    supabase: SupabaseClient,
    input: { userId: string; agentKey: string; telegramChatId: string; orgId?: string | null },
  ): Promise<void> {
    let query = supabase
      .from('conversations')
      .update({ status: 'archived' })
      .eq('user_id', input.userId)
      .eq('agent_id', input.agentKey)
      .eq('metadata->>telegram_chat_id', input.telegramChatId)
      .eq('status', 'active')
    query = input.orgId ? query.eq('org_id', input.orgId) : query.is('org_id', null)
    await query
  }

  async findActiveTelegramConversation(
    supabase: SupabaseClient,
    input: { userId: string; agentKey: string; telegramChatId: string; orgId?: string | null },
  ) {
    let query = supabase
      .from('conversations')
      .select('id, campaign_id, contact_id, created_at')
      .eq('user_id', input.userId)
      .eq('agent_id', input.agentKey)
      .eq('metadata->>telegram_chat_id', input.telegramChatId)
      .eq('status', 'active')
    query = input.orgId ? query.eq('org_id', input.orgId) : query.is('org_id', null)
    const { data } = await query.maybeSingle()
    return data as {
      id: string
      campaign_id?: string | null
      contact_id?: string | null
      created_at?: string | null
    } | null
  }

  async findCampaignName(supabase: SupabaseClient, campaignId: string): Promise<string | null> {
    const { data } = await supabase
      .from('campaigns')
      .select('name')
      .eq('id', campaignId)
      .maybeSingle()
    return typeof data?.name === 'string' ? data.name : null
  }

  async listActiveMissions(
    supabase: SupabaseClient,
    input: { userId: string; orgId?: string | null },
  ) {
    let query = supabase
      .from('missions')
      .select('title, status, priority')
      .eq('user_id', input.userId)
      .not('status', 'in', '("archived","cancelled","done")')
      .order('updated_at', { ascending: false })
      .limit(10)
    query = input.orgId ? query.eq('org_id', input.orgId) : query.is('org_id', null)
    const { data } = await query
    return (data ?? []) as Array<{ title: string; status: string; priority?: string | null }>
  }

  async listUserCampaigns(
    supabase: SupabaseClient,
    input: { userId: string; orgId?: string | null },
  ) {
    let query = supabase
      .from('campaigns')
      .select('id, name, status')
      .eq('user_id', input.userId)
      .neq('status', 'archived')
      .order('updated_at', { ascending: false })
      .limit(20)
    query = input.orgId ? query.eq('org_id', input.orgId) : query.is('org_id', null)
    const { data } = await query
    return (data ?? []) as Array<{ id: string; name: string; status?: string | null }>
  }

  async searchUserCampaigns(
    supabase: SupabaseClient,
    input: { userId: string; orgId?: string | null; searchName: string },
  ) {
    let query = supabase
      .from('campaigns')
      .select('id, name')
      .eq('user_id', input.userId)
      .neq('status', 'archived')
      .ilike('name', `%${input.searchName}%`)
      .limit(5)
    query = input.orgId ? query.eq('org_id', input.orgId) : query.is('org_id', null)
    const { data } = await query
    return (data ?? []) as Array<{ id: string; name: string }>
  }

  async updateActiveTelegramConversationCampaign(
    supabase: SupabaseClient,
    input: {
      userId: string
      agentKey: string
      telegramChatId: string
      campaignId: string
      orgId?: string | null
    },
  ): Promise<void> {
    let query = supabase
      .from('conversations')
      .update({ campaign_id: input.campaignId })
      .eq('user_id', input.userId)
      .eq('agent_id', input.agentKey)
      .eq('metadata->>telegram_chat_id', input.telegramChatId)
      .eq('status', 'active')
    query = input.orgId ? query.eq('org_id', input.orgId) : query.is('org_id', null)
    await query
  }

  async findUsableCampaignById(
    supabase: SupabaseClient,
    input: { campaignId: string; userId: string; orgId?: string | null },
  ): Promise<string | null> {
    let query = supabase
      .from('campaigns')
      .select('id')
      .eq('id', input.campaignId)
      .eq('user_id', input.userId)
      .is('deleted_at', null)
      .neq('status', 'archived')
      .limit(1)
    query = input.orgId ? query.eq('org_id', input.orgId) : query.is('org_id', null)
    const { data } = await query.maybeSingle()
    return typeof data?.id === 'string' ? data.id : null
  }

  async findRecentCampaignId(
    supabase: SupabaseClient,
    input: { userId: string; orgId?: string | null },
  ): Promise<string | null> {
    let query = supabase
      .from('campaigns')
      .select('id')
      .eq('user_id', input.userId)
      .is('deleted_at', null)
      .neq('status', 'archived')
      .order('updated_at', { ascending: false })
      .limit(1)
    query = input.orgId ? query.eq('org_id', input.orgId) : query.is('org_id', null)
    const { data } = await query.maybeSingle()
    return typeof data?.id === 'string' ? data.id : null
  }

  async findGeneralCampaignId(
    supabase: SupabaseClient,
    input: { userId: string; orgId?: string | null },
  ): Promise<string | null> {
    let query = supabase
      .from('campaigns')
      .select('id')
      .eq('user_id', input.userId)
      .contains('config', { system_kind: 'general' })
      .neq('status', 'archived')
      .limit(1)
    query = input.orgId ? query.eq('org_id', input.orgId) : query.is('org_id', null)
    const { data } = await query.maybeSingle()
    return typeof data?.id === 'string' ? data.id : null
  }

  async upsertChannelMember(
    supabase: SupabaseClient,
    row: Record<string, unknown>,
  ): Promise<string | null> {
    const { error } = await supabase
      .from('channel_members')
      .upsert(row, { onConflict: 'user_id,platform,platform_id,org_id' })
    return error?.message ?? null
  }

  async patchTelegramConversationContact(
    supabase: SupabaseClient,
    input: { userId: string; telegramChatId: string; contactId: string; orgId?: string | null },
  ): Promise<string | null> {
    let query = supabase
      .from('conversations')
      .update({ contact_id: input.contactId, updated_at: new Date().toISOString() })
      .eq('user_id', input.userId)
      .eq('metadata->>telegram_chat_id', input.telegramChatId)
      .is('contact_id', null)
    if (input.orgId !== undefined) {
      query = input.orgId ? query.eq('org_id', input.orgId) : query.is('org_id', null)
    }
    const { error } = await query
    return error?.message ?? null
  }

  async listTelegramConversationsWithCampaign(
    supabase: SupabaseClient,
    input: { userId: string; telegramChatId: string; orgId?: string | null },
  ): Promise<{ rows: Array<{ campaign_id?: string | null; agent_id?: string | null }>; errorMessage: string | null }> {
    let query = supabase
      .from('conversations')
      .select('campaign_id, agent_id')
      .eq('user_id', input.userId)
      .eq('metadata->>telegram_chat_id', input.telegramChatId)
      .not('campaign_id', 'is', null)
    if (input.orgId !== undefined) {
      query = input.orgId ? query.eq('org_id', input.orgId) : query.is('org_id', null)
    }
    const { data, error } = await query
    return {
      rows: (data ?? []) as Array<{ campaign_id?: string | null; agent_id?: string | null }>,
      errorMessage: error?.message ?? null,
    }
  }

  async upsertContactCampaignMembership(
    supabase: SupabaseClient,
    row: Record<string, unknown>,
  ): Promise<string | null> {
    const { error } = await supabase
      .from('contact_campaign_memberships')
      .upsert(row, { onConflict: 'contact_id,campaign_id' })
    return error?.message ?? null
  }

  async updateConversation(
    supabase: SupabaseClient,
    conversationId: string,
    userId: string,
    patch: Record<string, unknown>,
  ): Promise<void> {
    await supabase.from('conversations').update(patch).eq('id', conversationId).eq('user_id', userId)
  }

  async createTelegramConversation(supabase: SupabaseClient, payload: Record<string, unknown>) {
    const { data, error } = await supabase.from('conversations').insert(payload).select('id').single()
    if (error) throw new Error(`Failed to create conversation: ${error.message}`)
    return data as { id: string }
  }

  async uploadMedia(
    supabase: SupabaseClient,
    storagePath: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<string> {
    const { error } = await supabase.storage.from('campaigns').upload(storagePath, buffer, {
      contentType,
      upsert: false,
    })
    if (error) throw new Error(`Supabase storage upload failed: ${error.message}`)
    const {
      data: { publicUrl },
    } = supabase.storage.from('campaigns').getPublicUrl(storagePath)
    return publicUrl
  }
}
