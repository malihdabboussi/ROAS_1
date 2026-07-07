import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { CreateOrgInput, InvitableRole, UpdateCreditLimitInput, UpdateOrgInput } from '../dto'

@Injectable()
export class OrgRepository {
  async create(supabase: SupabaseClient, ownerId: string, dto: CreateOrgInput) {
    const { data, error } = await supabase
      .from('organizations')
      .insert({ owner_id: ownerId, name: dto.name, slug: dto.slug, avatar_url: dto.avatar_url })
      .select()
      .single()
    if (error) throw error
    return data
  }

  async findById(supabase: SupabaseClient, orgId: string) {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .eq('status', 'active')
      .is('deleted_at', null)
      .single()
    if (error) throw error
    return data
  }

  async findBySlug(supabase: SupabaseClient, slug: string) {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('slug', slug)
      .maybeSingle()
    if (error) throw error
    return data
  }

  async update(supabase: SupabaseClient, orgId: string, dto: UpdateOrgInput) {
    const { data, error } = await supabase
      .from('organizations')
      .update(dto)
      .eq('id', orgId)
      .select()
      .single()
    if (error) throw error
    return data
  }

  async softDelete(supabase: SupabaseClient, orgId: string) {
    const { error } = await supabase
      .from('organizations')
      .update({ deleted_at: new Date().toISOString(), status: 'suspended' })
      .eq('id', orgId)
    if (error) throw error
  }

  async restore(supabase: SupabaseClient, orgId: string) {
    const { error } = await supabase
      .from('organizations')
      .update({ deleted_at: null, status: 'active' })
      .eq('id', orgId)
    if (error) throw error
  }

  async listUserOrgs(supabase: SupabaseClient, userId: string) {
    const { data, error } = await supabase
      .from('org_members')
      .select(
        'id, role, status, org_id, organizations(id, name, slug, avatar_url, account_type, status)',
      )
      .eq('user_id', userId)
      .eq('status', 'active')
    if (error) throw error
    return data ?? []
  }

  async addMember(
    supabase: SupabaseClient,
    orgId: string,
    userId: string,
    role: InvitableRole | 'owner',
    invitedBy: string | null,
  ) {
    const { data, error } = await supabase
      .from('org_members')
      .insert({
        org_id: orgId,
        user_id: userId,
        role,
        status: 'active',
        invited_by: invitedBy,
        accepted_at: new Date().toISOString(),
      })
      .select()
      .single()
    if (error) throw error
    return data
  }

  async findMember(supabase: SupabaseClient, orgId: string, userId: string) {
    const { data, error } = await supabase
      .from('org_members')
      .select('*')
      .eq('org_id', orgId)
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw error
    return data
  }

  async listMembers(supabase: SupabaseClient, orgId: string) {
    const { data, error } = await supabase
      .from('org_members')
      .select(
        'id, user_id, role, status, accepted_at, created_at, profiles!org_members_user_id_fk_profiles(id, full_name, avatar_url, email)',
      )
      .eq('org_id', orgId)
      .eq('status', 'active')
      .order('created_at', { ascending: true })
    if (error) throw error
    return data ?? []
  }

  async updateMemberRole(supabase: SupabaseClient, memberId: string, role: InvitableRole) {
    const { data, error } = await supabase
      .from('org_members')
      .update({ role })
      .eq('id', memberId)
      .select()
      .single()
    if (error) throw error
    return data
  }

  async removeMember(supabase: SupabaseClient, memberId: string) {
    const { error } = await supabase.from('org_members').delete().eq('id', memberId)
    if (error) throw error
  }

  async suspendOrgMembers(supabase: SupabaseClient, orgId: string) {
    const { error } = await supabase
      .from('org_members')
      .update({ status: 'suspended' })
      .eq('org_id', orgId)
    if (error) throw error
  }

  async reactivateOrgMembers(supabase: SupabaseClient, orgId: string) {
    const { error } = await supabase
      .from('org_members')
      .update({ status: 'active' })
      .eq('org_id', orgId)
      .eq('status', 'suspended')
    if (error) throw error
  }

  async createInvitation(
    supabase: SupabaseClient,
    orgId: string,
    email: string,
    role: InvitableRole,
    invitedBy: string,
    token: string,
    expiresAt: string,
  ) {
    const { data, error } = await supabase
      .from('org_invitations')
      .insert({
        org_id: orgId,
        email,
        role,
        invited_by: invitedBy,
        token,
        expires_at: expiresAt,
        status: 'pending',
      })
      .select()
      .single()
    if (error) throw error
    return data
  }

  async findPendingInvitationByEmail(supabase: SupabaseClient, orgId: string, email: string) {
    const { data, error } = await supabase
      .from('org_invitations')
      .select('*')
      .eq('org_id', orgId)
      .eq('status', 'pending')
      .ilike('email', email)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw error
    return data
  }

  async findInvitationByToken(supabase: SupabaseClient, token: string) {
    const { data, error } = await supabase
      .from('org_invitations')
      .select('*, organizations(id, name, slug, avatar_url)')
      .eq('token', token)
      .eq('status', 'pending')
      .maybeSingle()
    if (error) throw error
    return data
  }

  async listInvitations(supabase: SupabaseClient, orgId: string) {
    const { data, error } = await supabase
      .from('org_invitations')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  }

  async updateInvitationStatus(supabase: SupabaseClient, invitationId: string, status: string) {
    const { error } = await supabase
      .from('org_invitations')
      .update({ status })
      .eq('id', invitationId)
    if (error) throw error
  }

  async findProfileBootstrapState(supabase: SupabaseClient, userId: string, machineColumn: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select(`onboarding_completed, ${machineColumn}`)
      .eq('id', userId)
      .maybeSingle()
    if (error) throw error
    return data as ({ onboarding_completed?: boolean | null } & Record<string, unknown>) | null
  }

  async findActiveSubscription(supabase: SupabaseClient, userId: string) {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('id')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing'])
      .maybeSingle()
    if (error) throw error
    return data
  }

  async markProfileOrgOnly(supabase: SupabaseClient, userId: string, defaultOrgId: string) {
    const { error } = await supabase
      .from('profiles')
      .update({
        account_mode: 'org_only',
        default_account_mode: 'org',
        default_org_id: defaultOrgId,
        onboarding_completed: true,
        onboarding_animation_seen: true,
      })
      .eq('id', userId)
    if (error) throw error
  }

  async ensureDefaultBrain(supabase: SupabaseClient, userId: string) {
    const { data: existing, error: existingError } = await supabase
      .from('ns_brains')
      .select('id')
      .eq('owner_id', userId)
      .eq('is_default', true)
      .eq('scope', 'user')
      .is('org_id', null)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (existingError) throw existingError
    if (existing?.id) return existing.id

    const { data: created, error } = await supabase
      .from('ns_brains')
      .insert({
        owner_id: userId,
        org_id: null,
        name: 'Default Brain',
        is_default: true,
        scope: 'user',
        color: '#8B85C8',
        icon: 'brain',
        tags: [],
      })
      .select('id')
      .maybeSingle()
    if (created?.id) return created.id
    if (error && error.code !== '23505') throw error

    const { data: fallback, error: fallbackError } = await supabase
      .from('ns_brains')
      .select('id')
      .eq('owner_id', userId)
      .eq('is_default', true)
      .eq('scope', 'user')
      .is('org_id', null)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (fallbackError) throw fallbackError
    if (!fallback?.id) throw new Error('Failed creating or finding default brain')
    return fallback.id
  }

  async upsertCreditLimit(
    supabase: SupabaseClient,
    orgId: string,
    memberId: string,
    dto: UpdateCreditLimitInput,
  ) {
    const { data, error } = await supabase
      .from('org_member_credit_limits')
      .upsert(
        {
          org_id: orgId,
          member_id: memberId,
          period: dto.period,
          credit_limit: dto.credit_limit,
          credits_used: 0,
          period_start: new Date().toISOString(),
        },
        { onConflict: 'org_id,member_id' },
      )
      .select()
      .single()
    if (error) throw error
    return data
  }

  async findUserByEmail(supabase: SupabaseClient, email: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .ilike('email', email)
      .maybeSingle()
    if (error) throw error
    return data
  }

  async hasVibeyCeoAgent(supabase: SupabaseClient, orgId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('agents_registry')
      .select('agent_key, level')
      .eq('org_id', orgId)
      .is('user_id', null)
      .in('agent_key', ['vibey'])
    if (error) throw error
    return (data ?? []).some((agent) => agent.agent_key === 'vibey' && agent.level === 'c_level')
  }

  async pauseMemberMissions(supabase: SupabaseClient, orgId: string, userId: string) {
    const { error } = await supabase
      .from('missions')
      .update({ status: 'paused' })
      .eq('user_id', userId)
      .eq('org_id', orgId)
      .in('status', ['queued', 'in_progress', 'executing'])
    if (error) throw error
  }
}
