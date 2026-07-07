import { BadRequestException, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { RecentAutomationRunsQuery } from '../dto'

export type PausedAutomationRunState = {
  user_id: string
  org_id: string | null
  item_id: string
}

@Injectable()
export class SpaceAutomationRunsRepository {
  createServiceRoleClient(
    configService: ConfigService,
    options?: Parameters<typeof createClient>[2],
  ): SupabaseClient {
    const client = this.createOptionalServiceRoleClient(configService, options)
    if (!client) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    return client
  }

  createOptionalServiceRoleClient(
    configService: ConfigService,
    options?: Parameters<typeof createClient>[2],
  ): SupabaseClient | null {
    const supabaseUrl = configService.get<string>('SUPABASE_URL') ?? process.env.SUPABASE_URL
    const supabaseKey =
      configService.get<string>('SUPABASE_SERVICE_ROLE_KEY') ??
      process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseKey) return null
    return options
      ? createClient(supabaseUrl, supabaseKey, options)
      : createClient(supabaseUrl, supabaseKey)
  }

  async insertRunState(supabase: SupabaseClient, payload: Record<string, unknown>): Promise<void> {
    const { error } = await supabase.from('space_automation_run_state').insert(payload)
    if (error) throw new BadRequestException(error.message)
  }

  async insertRun(supabase: SupabaseClient, payload: Record<string, unknown>): Promise<void> {
    const { error } = await supabase.from('space_automation_runs').insert(payload)
    if (error) throw new BadRequestException(error.message)
  }

  async findPausedResumeState(
    supabase: SupabaseClient,
    runStateId: string,
  ): Promise<PausedAutomationRunState | null> {
    const { data } = await supabase
      .from('space_automation_run_state')
      .select('user_id, org_id, item_id')
      .eq('id', runStateId)
      .eq('status', 'paused')
      .maybeSingle()
    return (data ?? null) as PausedAutomationRunState | null
  }

  async findPausedRunState(supabase: SupabaseClient, runStateId: string) {
    const { data, error } = await supabase
      .from('space_automation_run_state')
      .select('*')
      .eq('id', runStateId)
      .eq('status', 'paused')
      .maybeSingle()
    if (error) throw new BadRequestException(error.message)
    return (data ?? null) as Record<string, unknown> | null
  }

  async findPausedRunsByItemId(supabase: SupabaseClient, itemId: string) {
    const { data, error } = await supabase
      .from('space_automation_run_state')
      .select('*')
      .eq('item_id', itemId)
      .eq('status', 'paused')
      .order('created_at', { ascending: true })
    if (error) throw new BadRequestException(error.message)
    return (data ?? []) as Record<string, unknown>[]
  }

  async markRunStateResumed(supabase: SupabaseClient, runStateId: string): Promise<void> {
    const { error } = await supabase
      .from('space_automation_run_state')
      .update({ status: 'resumed' })
      .eq('id', runStateId)
    if (error) throw new BadRequestException(error.message)
  }

  async assertActiveOrgMember(
    supabase: SupabaseClient,
    orgId: string,
    userId: string,
  ): Promise<boolean> {
    const { data, error } = await supabase
      .from('org_members')
      .select('id')
      .eq('org_id', orgId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle()
    if (error) throw new BadRequestException(error.message)
    return !!data
  }

  async listRecentCompletedRuns(
    supabase: SupabaseClient,
    query: RecentAutomationRunsQuery,
    workspaceOrgId: string | null,
    userId: string,
    cap: number,
  ) {
    const feedScope = query.feed_scope ?? 'workspace'
    const mineOnly = query.mine_only ?? true
    let runQuery = supabase
      .from('space_automation_runs')
      .select('id, space_id, item_id, automation_id, status, created_at, org_id')
      .in('status', ['success', 'partial'])

    if (feedScope === 'workspace') {
      if (workspaceOrgId) runQuery = runQuery.eq('org_id', workspaceOrgId)
      else runQuery = runQuery.is('org_id', null)
    } else if (feedScope === 'personal') {
      runQuery = runQuery.is('org_id', null)
    } else if (feedScope === 'org' && query.feed_org_id) {
      runQuery = runQuery.eq('org_id', query.feed_org_id)
    }

    if (mineOnly) runQuery = runQuery.eq('user_id', userId)

    if (query.campaign_id) {
      const spaceIds = await this.listSpaceIdsByCampaign(supabase, query.campaign_id)
      if (spaceIds.length === 0) return []
      runQuery = runQuery.in('space_id', spaceIds)
    }

    const { data, error } = await runQuery.order('created_at', { ascending: false }).limit(cap)
    if (error) throw new BadRequestException(error.message)
    return (data ?? []) as Array<{
      id: string
      space_id: string
      item_id: string | null
      automation_id: string | null
      status: string
      created_at: string
    }>
  }

  async listSpaceTitles(supabase: SupabaseClient, spaceIds: string[]) {
    if (spaceIds.length === 0) return new Map<string, string | null>()
    const { data, error } = await supabase.from('spaces').select('id, title').in('id', spaceIds)
    if (error) throw new BadRequestException(error.message)
    return new Map((data ?? []).map((row: any): [string, string | null] => [row.id, row.title]))
  }

  async listAutomationNames(supabase: SupabaseClient, automationIds: string[]) {
    if (automationIds.length === 0) return new Map<string, string | null>()
    const { data, error } = await supabase
      .from('space_automations')
      .select('id, name')
      .in('id', automationIds)
    if (error) throw new BadRequestException(error.message)
    return new Map((data ?? []).map((row: any): [string, string | null] => [row.id, row.name]))
  }

  private async listSpaceIdsByCampaign(supabase: SupabaseClient, campaignId: string) {
    const { data, error } = await supabase
      .from('spaces')
      .select('id')
      .eq('campaign_id', campaignId)
    if (error) throw new BadRequestException(error.message)
    return (data ?? []).map((space: { id: string }) => space.id)
  }
}
