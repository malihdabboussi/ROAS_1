import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class UsersRepository {
  private serviceClient: SupabaseClient | null = null

  constructor(private readonly config: ConfigService) {}

  private getServiceClient(): SupabaseClient {
    if (this.serviceClient) return this.serviceClient
    this.serviceClient = createClient(
      this.config.getOrThrow('SUPABASE_URL'),
      this.config.getOrThrow('SUPABASE_SERVICE_ROLE_KEY'),
    )
    return this.serviceClient
  }

  async getUserProfile(userId: string) {
    return this.getServiceClient()
      .from('user_profiles')
      .select('id, role, display_name, created_at, updated_at')
      .eq('id', userId)
      .single()
  }

  async createUserProfile(userId: string) {
    return this.getServiceClient()
      .from('user_profiles')
      .insert({ id: userId, role: 'user' })
      .select()
      .single()
  }

  async setUserRole(userId: string, role: string, updatedAt: string) {
    return this.getServiceClient()
      .from('user_profiles')
      .update({ role, updated_at: updatedAt })
      .eq('id', userId)
      .select()
      .single()
  }

  async getProfile(supabase: SupabaseClient, userId: string, selectFields: string) {
    return supabase.from('profiles').select(selectFields).eq('id', userId).maybeSingle()
  }

  async getPublicProfile(supabase: SupabaseClient, id: string) {
    return supabase
      .from('profiles')
      .select('full_name, email, avatar_url')
      .eq('id', id)
      .maybeSingle()
  }

  async updateProfile(supabase: SupabaseClient, userId: string, payload: Record<string, unknown>) {
    return supabase.from('profiles').update(payload).eq('id', userId)
  }

  async findActiveOrgMembership(supabase: SupabaseClient, userId: string, orgId: string) {
    return supabase
      .from('org_members')
      .select('id, org_id, organizations!inner(id, status, deleted_at)')
      .eq('user_id', userId)
      .eq('org_id', orgId)
      .eq('status', 'active')
      .eq('organizations.status', 'active')
      .is('organizations.deleted_at', null)
      .maybeSingle()
  }

  async insertAvatarMediaAsset(supabase: SupabaseClient, payload: Record<string, unknown>) {
    return supabase.from('media_assets').insert(payload).select('*').single()
  }

  async uploadAvatar(
    supabase: SupabaseClient,
    filePath: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<{ error: { message: string } | null }> {
    return supabase.storage.from('avatars').upload(filePath, buffer, { contentType, upsert: true })
  }

  getAvatarPublicUrl(supabase: SupabaseClient, filePath: string) {
    return supabase.storage.from('avatars').getPublicUrl(filePath)
  }

  async getEmailSettings(supabase: SupabaseClient, userId: string, orgId: string | null) {
    const query = supabase
      .from('email_settings')
      .select('*')
      .eq('user_id', userId)
      [orgId ? 'eq' : 'is']('org_id', orgId)
      .maybeSingle()
    return query
  }

  async findEmailSettingsId(supabase: SupabaseClient, userId: string, orgId: string | null) {
    return supabase
      .from('email_settings')
      .select('id')
      .eq('user_id', userId)
      [orgId ? 'eq' : 'is']('org_id', orgId)
      .maybeSingle()
  }

  async updateEmailSettings(
    supabase: SupabaseClient,
    id: string,
    payload: Record<string, unknown>,
  ) {
    return supabase.from('email_settings').update(payload).eq('id', id).select('*').single()
  }

  async insertEmailSettings(supabase: SupabaseClient, payload: Record<string, unknown>) {
    return supabase.from('email_settings').insert(payload).select('*').single()
  }
}
