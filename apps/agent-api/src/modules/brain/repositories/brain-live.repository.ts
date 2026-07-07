import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

type QueryError = { message: string }

@Injectable()
export class BrainLiveRepository {
  async findConversationCampaignId(
    supabase: SupabaseClient,
    conversationId: string,
  ): Promise<string | null> {
    const { data } = await supabase
      .from('conversations')
      .select('campaign_id')
      .eq('id', conversationId)
      .maybeSingle()
    return (data?.campaign_id as string | null) ?? null
  }

  async findAgentBrainId(
    supabase: SupabaseClient,
    input: { userId: string; agentId: string },
  ): Promise<string | null> {
    const { data } = await supabase
      .from('ns_brains')
      .select('id')
      .eq('owner_id', input.userId)
      .eq('agent_id', input.agentId)
      .maybeSingle()
    return (data?.id as string | null) ?? null
  }

  async findDefaultUserBrainId(supabase: SupabaseClient, userId: string): Promise<string> {
    const { data } = await supabase
      .from('ns_brains')
      .select('id')
      .eq('owner_id', userId)
      .eq('is_default', true)
      .eq('scope', 'user')
      .is('org_id', null)
      .order('created_at', { ascending: true })
      .limit(1)
    return (data?.[0]?.id as string | undefined) ?? ''
  }

  async findAgentConfig(
    supabase: SupabaseClient,
    input: { agentKey: string; userId: string; orgId?: string | null },
  ): Promise<Record<string, unknown> | null> {
    const query = supabase.from('agents_registry').select('config').eq('agent_key', input.agentKey)
    if (input.orgId) {
      query.eq('org_id', input.orgId)
    } else {
      query.eq('user_id', input.userId).is('org_id', null)
    }
    const { data } = await query.maybeSingle()
    return (data?.config as Record<string, unknown> | null) ?? null
  }

  async findActiveOrganizationProfile(
    supabase: SupabaseClient,
    orgId: string,
  ): Promise<Record<string, unknown> | null> {
    const { data } = await supabase
      .from('organizations')
      .select('name, slug, account_type')
      .eq('id', orgId)
      .eq('status', 'active')
      .maybeSingle()
    return (data as Record<string, unknown> | null) ?? null
  }

  async findUserProfile(
    supabase: SupabaseClient,
    userId: string,
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase
      .from('profiles')
      .select(
        'full_name, email, company_name, industry, website, plan, onboarding_data, preferences',
      )
      .eq('id', userId)
      .maybeSingle()) as { data: Record<string, unknown> | null; error: QueryError | null }
  }

  async listConversationHistoryMessages(
    supabase: SupabaseClient,
    conversationId: string,
  ): Promise<{ data: Array<Record<string, unknown>> | null; error: QueryError | null }> {
    return (await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(200)) as { data: Array<Record<string, unknown>> | null; error: QueryError | null }
  }

  async listCompanyCortexObjects(
    supabase: SupabaseClient,
    brainId: string,
  ): Promise<Array<Record<string, unknown>>> {
    const { data } = await supabase
      .from('company_cortex_objects')
      .select('object_type, title, truth, status')
      .eq('brain_id', brainId)
      .neq('status', 'archived')
      .order('updated_at', { ascending: false })
      .limit(12)
    return (data ?? []) as Array<Record<string, unknown>>
  }

  async listCompanyCortexSignals(
    supabase: SupabaseClient,
    brainId: string,
  ): Promise<Array<Record<string, unknown>>> {
    const { data } = await supabase
      .from('company_cortex_signals')
      .select('signal_type, truth, status')
      .eq('brain_id', brainId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(8)
    return (data ?? []) as Array<Record<string, unknown>>
  }

  async countMemoryRowsByType(
    supabase: SupabaseClient,
    brainId: string,
  ): Promise<{ count: number; rows: Array<Record<string, unknown>> }> {
    const result = await supabase
      .from('ns_memories')
      .select('memory_type', { count: 'exact' })
      .eq('brain_id', brainId)
      .limit(10000)
    return {
      count: result.count ?? 0,
      rows: (result.data ?? []) as Array<Record<string, unknown>>,
    }
  }

  async countSnapshots(supabase: SupabaseClient, brainId: string): Promise<number> {
    const result = await supabase
      .from('ns_snapshots')
      .select('*', { count: 'exact', head: true })
      .eq('brain_id', brainId)
    return result.count ?? 0
  }

  async searchCompanyCortexObjects(
    supabase: SupabaseClient,
    input: { brainId: string; query: string; limit: number },
  ): Promise<{ data: Array<Record<string, unknown>> | null; error: QueryError | null }> {
    const pattern = `%${input.query.replace(/[%_]/g, '')}%`
    return (await supabase
      .from('company_cortex_objects')
      .select('id, object_type, title, truth, updated_at')
      .eq('brain_id', input.brainId)
      .neq('status', 'archived')
      .or(`title.ilike.${pattern},truth.ilike.${pattern}`)
      .order('updated_at', { ascending: false })
      .limit(input.limit)) as {
      data: Array<Record<string, unknown>> | null
      error: QueryError | null
    }
  }

  async listAvailableBrains(
    supabase: SupabaseClient,
    userId: string,
  ): Promise<{ data: Array<Record<string, unknown>> | null; error: QueryError | null }> {
    return (await supabase
      .from('ns_brains')
      .select('id, name, is_default, agent_id')
      .eq('owner_id', userId)
      .order('created_at', { ascending: true })) as {
      data: Array<Record<string, unknown>> | null
      error: QueryError | null
    }
  }

  async listDelegationInputMessages(
    supabase: SupabaseClient,
    conversationId: string,
  ): Promise<Array<Record<string, unknown>>> {
    const { data } = await supabase
      .from('messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(50)
    return (data ?? []) as Array<Record<string, unknown>>
  }

  async insertTranscriptMessage(
    supabase: SupabaseClient,
    input: {
      conversationId: string
      role: 'user' | 'assistant'
      content: string
      metadata?: Record<string, unknown>
    },
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase
      .from('messages')
      .insert({
        conversation_id: input.conversationId,
        role: input.role,
        content: input.content,
        metadata: { ...input.metadata, source: 'voice_live' },
      })
      .select('*')
      .single()) as { data: Record<string, unknown> | null; error: QueryError | null }
  }

  async insertVoiceTaskSummaryRows(
    supabase: SupabaseClient,
    rows: Array<Record<string, unknown>>,
  ): Promise<{ error: QueryError | null }> {
    return (await supabase.from('messages').insert(rows)) as { error: QueryError | null }
  }
}
