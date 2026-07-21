import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseServiceClient } from '@vibey/api-shared'

export type GoogleWorkspaceConnectionRow = {
  id: string
  user_id: string
  org_id: string | null
  status: string
  scope_mode: string | null
  is_default: boolean | null
  connection_label: string | null
  metadata: Record<string, unknown> | null
  connected_at: string | null
}

const CONNECTION_SELECT =
  'id, user_id, org_id, status, scope_mode, is_default, connection_label, metadata, connected_at'

@Injectable()
export class GoogleWorkspaceRepository {
  constructor(private readonly serviceClient: SupabaseServiceClient) {}

  getServiceClient(): SupabaseClient {
    return this.serviceClient.client
  }

  async findOrgConnection(orgId: string): Promise<GoogleWorkspaceConnectionRow | null> {
    const { data, error } = await this.serviceClient.client
      .from('user_integrations')
      .select(CONNECTION_SELECT)
      .eq('org_id', orgId)
      .eq('integration_id', 'google_workspace')
      .eq('status', 'connected')
      .eq('scope_mode', 'org_shared')
      .order('is_default', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw new Error(`Failed to load Google Workspace connection: ${error.message}`)
    return (data as GoogleWorkspaceConnectionRow | null) ?? null
  }

  async listSlackPeopleWithEmail(
    supabase: SupabaseClient,
    orgId: string,
  ): Promise<
    Array<{
      id: string
      email: string | null
      display_name: string | null
      vibey_user_id: string | null
      person_brain_id: string | null
    }>
  > {
    const { data, error } = await supabase
      .from('channel_members')
      .select('id, email, display_name, vibey_user_id, person_brain_id')
      .eq('org_id', orgId)
      .eq('platform', 'slack')
      .eq('is_bot', false)
      .not('email', 'is', null)
    if (error) throw new Error(`Failed to list Slack people emails: ${error.message}`)
    return (data ?? []) as Array<{
      id: string
      email: string | null
      display_name: string | null
      vibey_user_id: string | null
      person_brain_id: string | null
    }>
  }

  async listPortalUsersWithEmail(
    supabase: SupabaseClient,
    orgId: string,
  ): Promise<Array<{ user_id: string; email: string | null; display_name: string | null }>> {
    const { data, error } = await supabase
      .from('org_members')
      .select('user_id, profiles!org_members_user_id_fk_profiles(full_name, email)')
      .eq('org_id', orgId)
      .eq('status', 'active')
    if (error) throw new Error(`Failed to list portal user emails: ${error.message}`)
    return (data ?? []).map((row) => {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
      return {
        user_id: String(row.user_id),
        email: profile?.email ? String(profile.email) : null,
        display_name: profile?.full_name ? String(profile.full_name) : null,
      }
    })
  }

  async listPersonalCalendarLabels(
    orgId: string,
  ): Promise<Array<{ connection_label: string | null; metadata: Record<string, unknown> | null }>> {
    const { data, error } = await this.serviceClient.client
      .from('user_integrations')
      .select('connection_label, metadata')
      .eq('org_id', orgId)
      .eq('integration_id', 'google_calendar')
      .eq('status', 'connected')
    if (error) throw new Error(`Failed to list personal calendar labels: ${error.message}`)
    return (data ?? []) as Array<{
      connection_label: string | null
      metadata: Record<string, unknown> | null
    }>
  }

  async listRecentMeetingItemsByEmail(
    orgId: string,
    email: string,
    limit = 40,
  ): Promise<Array<Record<string, unknown>>> {
    const normalized = email.trim().toLowerCase()
    const { data, error } = await this.serviceClient.client
      .from('space_items')
      .select('id, title, custom_data, updated_at, space_id')
      .eq('org_id', orgId)
      .order('updated_at', { ascending: false })
      .limit(Math.max(limit * 5, 100))
    if (error) return []
    return ((data ?? []) as Array<Record<string, unknown>>)
      .filter((row) => this.customDataMentionsEmail(row.custom_data, normalized))
      .slice(0, limit)
  }

  async listBrainMemories(brainId: string, limit = 8): Promise<Array<Record<string, unknown>>> {
    const { data, error } = await this.serviceClient.client
      .from('ns_memories')
      .select('id, content, memory_type, created_at')
      .eq('brain_id', brainId)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) return []
    return (data ?? []) as Array<Record<string, unknown>>
  }

  private customDataMentionsEmail(customData: unknown, email: string): boolean {
    if (!customData || typeof customData !== 'object') return false
    const blob = JSON.stringify(customData).toLowerCase()
    return blob.includes(email)
  }
}
