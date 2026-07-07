import { Injectable, Optional } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseServiceClient } from '@vibey/api-shared'

const SHARED_ITEM_PUBLIC_COLUMNS =
  'id, space_id, title, status, due_date, notes, doc_body, custom_data'

@Injectable()
export class SpacePublicShareRepository {
  constructor(
    @Optional()
    private readonly serviceClient?: SupabaseServiceClient,
  ) {}

  getServiceSupabaseClient(): SupabaseClient {
    if (!this.serviceClient) throw new Error('Supabase service client is not available')
    return this.serviceClient.client
  }

  async findPublicItemByToken(supabase: SupabaseClient, token: string) {
    const { data, error } = await supabase
      .from('space_items')
      .select(SHARED_ITEM_PUBLIC_COLUMNS)
      .eq('share_token', token)
      .eq('share_link_enabled', true)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return (data ?? null) as Record<string, unknown> | null
  }

  async findSharedSpaceLite(supabase: SupabaseClient, spaceId: string) {
    const { data, error } = await supabase
      .from('spaces')
      .select('id, title, visibility')
      .eq('id', spaceId)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return (data ?? null) as Record<string, unknown> | null
  }

  async findEmailInviteByToken(supabase: SupabaseClient, token: string) {
    const { data, error } = await supabase
      .from('space_item_shares')
      .select('item_id, space_id, level, invite_expires_at')
      .eq('invite_token', token)
      .eq('entity_type', 'email')
      .maybeSingle()
    if (error) throw new Error(error.message)
    return (data ?? null) as Record<string, unknown> | null
  }

  async findInvitedItem(supabase: SupabaseClient, itemId: string, spaceId: string) {
    const { data, error } = await supabase
      .from('space_items')
      .select(SHARED_ITEM_PUBLIC_COLUMNS)
      .eq('id', itemId)
      .eq('space_id', spaceId)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return (data ?? null) as Record<string, unknown> | null
  }

  async findSharedSpaceByToken(supabase: SupabaseClient, token: string) {
    const { data, error } = await supabase
      .from('spaces')
      .select('*')
      .eq('share_token', token)
      .eq('share_link_enabled', true)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return (data ?? null) as Record<string, unknown> | null
  }

  async listPublicSpaceItems(supabase: SupabaseClient, spaceId: string) {
    const { data, error } = await supabase
      .from('space_items')
      .select('*')
      .eq('space_id', spaceId)
      .eq('is_private', false)
      .order('sort_order', { ascending: true })
    if (error) throw new Error(error.message)
    return (data ?? []) as Record<string, unknown>[]
  }

  async findCampaignLite(supabase: SupabaseClient, campaignId: string) {
    const { data, error } = await supabase
      .from('campaigns')
      .select('id, name')
      .eq('id', campaignId)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return (data ?? null) as Record<string, unknown> | null
  }

  async listConversationDocuments(supabase: SupabaseClient, campaignId: string) {
    const { data, error } = await supabase
      .from('conversation_documents')
      .select('*, conversations(id, title, metadata)')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (data ?? []) as Record<string, unknown>[]
  }

  async listMissionDeliverables(supabase: SupabaseClient, campaignId: string) {
    const { data, error } = await supabase
      .from('mission_deliverables')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })
      .limit(200)
    if (error) throw new Error(error.message)
    return (data ?? []) as Record<string, unknown>[]
  }

  async listOrgRosterEntries(
    supabase: SupabaseClient,
    orgId: string,
    kind: 'human' | 'agent',
    keyColumn: 'user_id' | 'agent_key',
    keys: string[],
  ) {
    if (keys.length === 0) return []
    const { data, error } = await supabase
      .from('team_roster')
      .select('participant_id, kind, display_name, avatar_url, user_id, agent_key')
      .eq('org_id', orgId)
      .eq('kind', kind)
      .in(keyColumn, keys)
    if (error) throw new Error(error.message)
    return (data ?? []) as Record<string, unknown>[]
  }

  async listPersonalAgentRosterEntries(
    supabase: SupabaseClient,
    spaceUserId: string,
    agentKeys: string[],
  ) {
    if (agentKeys.length === 0 || !spaceUserId) return []
    const { data, error } = await supabase
      .from('agents_registry')
      .select('id, agent_key, name, image_url')
      .eq('user_id', spaceUserId)
      .is('org_id', null)
      .in('agent_key', agentKeys)
    if (error) throw new Error(error.message)
    return (data ?? []) as Record<string, unknown>[]
  }

  async listPersonalHumanRosterEntries(supabase: SupabaseClient, humanUserIds: string[]) {
    if (humanUserIds.length === 0) return []
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', humanUserIds)
    if (error) throw new Error(error.message)
    return (data ?? []) as Record<string, unknown>[]
  }
}
