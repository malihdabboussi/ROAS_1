import type { SupabaseClient } from '@supabase/supabase-js'
import { MissionsRepositoryAgentLifecycleBase } from './missions-repository-agent-lifecycle.base'

export abstract class MissionsRepositoryAgentConfigBase extends MissionsRepositoryAgentLifecycleBase {
  async listAgentUserState(supabase: SupabaseClient, userId: string) {
    const { data, error } = await supabase
      .from('agent_user_state')
      .select('agent_id, is_favorite, updated_at')
      .eq('user_id', userId)
    if (error) throw new Error(`DB error: ${error.message}`)
    return data ?? []
  }

  async findAgentRegistryIdInScope(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    orgId?: string | null,
  ): Promise<string | null> {
    let query = supabase.from('agents_registry').select('id').eq('agent_key', agentKey)
    if (orgId) {
      query = query.eq('org_id', orgId).is('user_id', null)
    } else {
      query = query.eq('user_id', userId).is('org_id', null)
    }
    const { data, error } = await query.maybeSingle()
    if (error) throw new Error(`DB error: ${error.message}`)
    return data?.id ? String(data.id) : null
  }

  async upsertAgentUserState(
    supabase: SupabaseClient,
    input: {
      user_id: string
      agent_id: string
      is_favorite?: boolean
      updated_at: string
    },
  ) {
    const cleaned: Record<string, unknown> = {
      user_id: input.user_id,
      agent_id: input.agent_id,
      updated_at: input.updated_at,
    }
    if (typeof input.is_favorite === 'boolean') cleaned.is_favorite = input.is_favorite
    const { data, error } = await supabase
      .from('agent_user_state')
      .upsert(cleaned, { onConflict: 'user_id,agent_id' })
      .select('agent_id, is_favorite, updated_at')
      .single()
    if (error) throw new Error(`DB error: ${error.message}`)
    return data
  }

  async canManageAgent(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    orgId?: string | null,
  ): Promise<boolean> {
    const { data, error } = await supabase.rpc('can_manage_agent', {
      p_agent_key: agentKey,
      p_org_id: orgId ?? null,
      p_user_id: orgId ? null : userId,
    })
    if (error) throw new Error(`Failed to check agent permissions: ${error.message}`)
    return data === true
  }

  async findScopedAgentRegistryRow(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    orgId?: string | null,
    select = '*',
    failureMessage = 'Failed to load agent registry row',
  ) {
    let query = supabase.from('agents_registry').select(select).eq('agent_key', agentKey)
    if (orgId) {
      query = query.eq('org_id', orgId).is('user_id', null)
    } else {
      query = query.eq('user_id', userId).is('org_id', null)
    }
    const { data, error } = await query.maybeSingle()
    if (error) throw new Error(`${failureMessage}: ${error.message}`)
    return data
  }

  async updateAgentRegistryFields(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    fields: Record<string, unknown>,
    orgId?: string | null,
    failureMessage = 'Failed to update agent registry row',
  ) {
    let query = supabase.from('agents_registry').update(fields).eq('agent_key', agentKey)
    if (orgId) {
      query = query.eq('org_id', orgId).is('user_id', null)
    } else {
      query = query.eq('user_id', userId).is('org_id', null)
    }
    const { error } = await query
    if (error) throw new Error(`${failureMessage}: ${error.message}`)
  }

  async updateAgentImage(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    imageUrl: string,
    orgId?: string | null,
  ) {
    let query = supabase
      .from('agents_registry')
      .update({ image_url: imageUrl })
      .eq('agent_key', agentKey)
    if (orgId) {
      query = query.eq('org_id', orgId).is('user_id', null)
    } else {
      query = query.eq('user_id', userId).is('org_id', null)
    }
    const { data, error } = await query.select('*').single()
    if (error) throw new Error(`Failed to update agent image: ${error.message}`)
    return data
  }

  async createVibeyRegistryRow(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null | undefined,
    config: Record<string, unknown>,
    failureMessage = 'Failed to create Vibey row',
  ) {
    const { error } = await supabase.from('agents_registry').insert({
      user_id: orgId ? null : userId,
      org_id: orgId ?? null,
      agent_key: 'vibey',
      name: 'Vibey',
      role: 'CMO',
      skills: [],
      status: 'idle',
      level: 'system',
      config,
      ...(orgId ? { created_by: userId } : {}),
    })
    if (error) throw new Error(`${failureMessage}: ${error.message}`)
  }

  async ensureVibeyRegistryRow(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null | undefined,
    config: Record<string, unknown>,
    verifyFailureMessage = 'Failed to verify Vibey row',
    createFailureMessage = 'Failed to create Vibey row',
  ): Promise<void> {
    const vibey = await this.findScopedAgentRegistryRow(
      supabase,
      userId,
      'vibey',
      orgId,
      'id',
      verifyFailureMessage,
    )
    if (vibey) return
    await this.createVibeyRegistryRow(supabase, userId, orgId, config, createFailureMessage)
  }

  async findAgentBrainId(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    orgId: string | null,
  ): Promise<string | null> {
    let query = supabase
      .from('ns_brains')
      .select('id, status')
      .eq('agent_id', agentKey)
      .not('status', 'eq', 'deleted')
    if (orgId) query = query.eq('org_id', orgId)
    else query = query.eq('owner_id', userId).is('org_id', null)

    const { data, error } = await query.maybeSingle<{ id: string; status: string }>()
    if (error) throw new Error(`Failed to resolve source brain: ${error.message}`)
    return data?.id ?? null
  }

  async ensureUniqueAgentKey(
    supabase: SupabaseClient,
    userId: string,
    baseKey: string,
    orgId?: string | null,
  ): Promise<string> {
    let attempt = 0
    let candidate = baseKey
    while (attempt < 100) {
      const existingId = await this.findAgentRegistryIdInScope(supabase, userId, candidate, orgId)
      if (!existingId) return candidate
      attempt += 1
      candidate = `${baseKey}_${attempt + 1}`
    }
    throw new Error('Failed to generate unique agent key')
  }

  async listManagedVibeyOwnerScopes(supabase: SupabaseClient) {
    const { data, error } = await supabase
      .from('agents_registry')
      .select('user_id, org_id')
      .eq('agent_key', 'vibey')
      .eq('level', 'c_level')
    if (error) throw new Error(error.message)
    return data ?? []
  }

  async listActiveOrgMemberUserIds(supabase: SupabaseClient, orgId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('org_members')
      .select('user_id')
      .eq('org_id', orgId)
      .eq('status', 'active')
    if (error) throw new Error(`Failed to list active org members: ${error.message}`)
    return (data ?? []).map((member: { user_id: string }) => String(member.user_id))
  }

  async updateAgentActive(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    isActive: boolean,
    orgId?: string | null,
  ) {
    let query = supabase
      .from('agents_registry')
      .update({ is_active: isActive })
      .eq('agent_key', agentKey)
    if (orgId) {
      query = query.eq('org_id', orgId).is('user_id', null)
    } else {
      query = query.eq('user_id', userId).is('org_id', null)
    }
    const { data, error } = await query.select('*').maybeSingle()
    if (error) throw new Error(`Failed to update agent active flag: ${error.message}`)
    if (!data) throw new Error(`Agent '${agentKey}' not found in registry`)
    return data
  }

  async isAgentActive(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    orgId?: string | null,
  ): Promise<{ exists: boolean; isActive: boolean }> {
    let query = supabase.from('agents_registry').select('is_active').eq('agent_key', agentKey)
    if (orgId) {
      query = query.eq('org_id', orgId).is('user_id', null)
    } else {
      query = query.eq('user_id', userId).is('org_id', null)
    }
    const { data, error } = await query.maybeSingle()
    if (error) throw new Error(`Failed to read agent active flag: ${error.message}`)
    if (!data) return { exists: false, isActive: false }
    return { exists: true, isActive: (data as { is_active?: boolean | null }).is_active !== false }
  }

  async updateAgentConfig(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    config: Record<string, unknown>,
    orgId?: string | null,
  ) {
    let query = supabase.from('agents_registry').update({ config }).eq('agent_key', agentKey)
    if (orgId) {
      query = query.eq('org_id', orgId).is('user_id', null)
    } else {
      query = query.eq('user_id', userId).is('org_id', null)
    }
    const { data, error } = await query.select('*').single()
    if (error) throw new Error(`Failed to update agent config: ${error.message}`)
    return data
  }

  async updateAgentConfigPatch(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    patch: Record<string, unknown>,
    orgId?: string | null,
    options?: { ignoreLookupError?: boolean },
  ) {
    let lookup = supabase.from('agents_registry').select('config').eq('agent_key', agentKey)
    if (orgId) {
      lookup = lookup.eq('org_id', orgId).is('user_id', null)
    } else {
      lookup = lookup.eq('user_id', userId).is('org_id', null)
    }
    const { data: existing, error: existingError } = await lookup.maybeSingle()
    if (existingError && !options?.ignoreLookupError) {
      throw new Error(`Failed to fetch agent config: ${existingError.message}`)
    }

    const currentConfig =
      !existingError && existing && typeof existing.config === 'object' && existing.config !== null
        ? (existing.config as Record<string, unknown>)
        : {}
    const nextConfig = { ...currentConfig, ...patch }

    let update = supabase
      .from('agents_registry')
      .update({ config: nextConfig })
      .eq('agent_key', agentKey)
    if (orgId) {
      update = update.eq('org_id', orgId).is('user_id', null)
    } else {
      update = update.eq('user_id', userId).is('org_id', null)
    }
    const { data, error } = await update.select('*').single()
    if (error) throw new Error(`Failed to patch agent config: ${error.message}`)
    return data
  }

  async updateAgentVoiceName(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    voiceName: string | null,
    orgId?: string | null,
  ) {
    let query = supabase
      .from('agents_registry')
      .update({ voice_name: voiceName })
      .eq('agent_key', agentKey)
    if (orgId) {
      query = query.eq('org_id', orgId).is('user_id', null)
    } else {
      query = query.eq('user_id', userId).is('org_id', null)
    }
    const { data, error } = await query.select('*').single()
    if (error) throw new Error(`Failed to update voice name: ${error.message}`)
    return data
  }

  async getAgent(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    orgId?: string | null,
  ) {
    let query = supabase.from('agents_registry').select('*').eq('agent_key', agentKey)
    if (orgId) {
      query = query.eq('org_id', orgId).is('user_id', null)
    } else {
      query = query.eq('user_id', userId).is('org_id', null)
    }
    const { data, error } = await query.single()
    if (error) throw new Error(`Failed to get agent: ${error.message}`)
    return data
  }

  async updateAgentSyncStatus(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    syncStatus: 'pending' | 'syncing' | 'ready' | 'failed',
    orgId?: string | null,
  ) {
    let query = supabase
      .from('agents_registry')
      .update({ sync_status: syncStatus, updated_at: new Date().toISOString() })
      .eq('agent_key', agentKey)
    if (orgId) {
      query = query.eq('org_id', orgId).is('user_id', null)
    } else {
      query = query.eq('user_id', userId).is('org_id', null)
    }
    const { error } = await query
    if (error) throw new Error(`Failed to update agent sync status: ${error.message}`)
  }

  async listStaleAgentSetups(supabase: SupabaseClient, cutoffIso: string, limit = 25) {
    const { data, error } = await supabase
      .from('agents_registry')
      .select('agent_key, user_id, org_id, created_by, sync_status, updated_at')
      .eq('sync_status', 'syncing')
      .lt('updated_at', cutoffIso)
      .order('updated_at', { ascending: true })
      .limit(limit)
    if (error) throw new Error(`Failed to list stale agent setups: ${error.message}`)
    return data ?? []
  }

  async updateCampaignAgentsConfigByAgentKey(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    configPatch: Record<string, unknown>,
  ) {
    const { data: rows, error: listError } = await supabase
      .from('campaign_agents')
      .select('id, config')
      .eq('user_id', userId)
      .eq('agent_key', agentKey)

    if (listError) throw new Error(`Failed to list campaign agents: ${listError.message}`)
    if (!rows || rows.length === 0) return []

    const updates = await Promise.all(
      rows.map(async (row) => {
        const nextConfig = { ...(row.config || {}), ...configPatch }
        const { data, error } = await supabase
          .from('campaign_agents')
          .update({ config: nextConfig })
          .eq('id', row.id)
          .select('id, config')
          .single()
        if (error) throw new Error(`Failed to update campaign agent config: ${error.message}`)
        return data
      }),
    )

    return updates
  }
}
