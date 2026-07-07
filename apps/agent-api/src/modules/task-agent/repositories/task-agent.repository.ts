import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseServiceClient } from '@vibey/api-shared'

@Injectable()
export class TaskAgentRepository {
  constructor(private readonly svc: SupabaseServiceClient) {}

  get client(): SupabaseClient {
    return this.svc.client
  }

  async findSpaceItem(itemId: string, spaceId: string) {
    return this.svc.client
      .from('space_items')
      .select('*')
      .eq('id', itemId)
      .eq('space_id', spaceId)
      .maybeSingle()
  }

  async findSpace(spaceId: string) {
    return this.svc.client
      .from('spaces')
      .select('title, schema, campaign_id')
      .eq('id', spaceId)
      .maybeSingle()
  }

  async listActivityRows(itemId: string) {
    return this.svc.client
      .from('space_item_activity')
      .select('event_type, payload, created_at')
      .eq('item_id', itemId)
      .order('created_at', { ascending: true })
      .limit(100)
  }

  async insertActivity(row: Record<string, unknown>) {
    return this.svc.client.from('space_item_activity').insert(row).select('id').single()
  }

  async listConversationRefs(ids: string[], userId: string, orgId: string | null, limit: number) {
    let query = this.svc.client
      .from('conversations')
      .select('id, title, agent_id, campaign_id, status, updated_at')
      .in('id', ids)
      .eq('user_id', userId)
    if (orgId) query = query.eq('org_id', orgId)
    return query.limit(limit)
  }

  async findActivityPayload(activityId: string) {
    return this.svc.client
      .from('space_item_activity')
      .select('payload')
      .eq('id', activityId)
      .maybeSingle()
  }

  async updateActivityPayload(activityId: string, payload: Record<string, unknown>) {
    return this.svc.client.from('space_item_activity').update({ payload }).eq('id', activityId)
  }

  async listBatchActivityPayloads(itemId: string, batchId: string) {
    return this.svc.client
      .from('space_item_activity')
      .select('payload, created_at')
      .eq('item_id', itemId)
      .eq('event_type', 'agent_task_execution')
      .contains('payload', { execution_batch_id: batchId })
      .order('created_at', { ascending: true })
  }

  async updateTaskExecutionStatus(itemId: string, spaceId: string, status: string) {
    return this.svc.client
      .from('space_items')
      .update({ task_execution_status: status })
      .eq('id', itemId)
      .eq('space_id', spaceId)
  }

  async findPausedAutomationRun(itemId: string) {
    return this.svc.client
      .from('space_automation_run_state')
      .select('id')
      .eq('item_id', itemId)
      .eq('status', 'paused')
      .maybeSingle()
  }

  async listRecentSpaceDocuments(input: {
    spaceId: string
    userId: string
    orgId: string | null
    createdAfter: string
    limit: number
  }) {
    let query = this.svc.client
      .from('space_items')
      .select('id, title, doc_body, custom_data, created_at')
      .eq('space_id', input.spaceId)
      .eq('user_id', input.userId)
      .eq('custom_data->>_view_type', 'doc')
      .gte('created_at', input.createdAfter)
      .order('created_at', { ascending: true })
    query = input.orgId ? query.eq('org_id', input.orgId) : query.is('org_id', null)
    return query.limit(input.limit)
  }

  async listRecentSpaceItems(input: {
    itemId: string
    spaceId: string
    userId: string
    orgId: string | null
    createdAfter: string
    limit: number
  }) {
    let query = this.svc.client
      .from('space_items')
      .select('id, title, status, doc_body, custom_data, created_at')
      .eq('space_id', input.spaceId)
      .eq('user_id', input.userId)
      .gte('created_at', input.createdAfter)
      .order('created_at', { ascending: true })
    query = input.orgId ? query.eq('org_id', input.orgId) : query.is('org_id', null)
    return query.limit(input.limit)
  }

  async listRecentScopedRows(input: {
    table: string
    select: string
    spaceId: string
    userId: string
    orgId: string | null
    campaignId?: string | null
    createdAfter: string
    limit: number
    userColumn?: string
    campaignColumn?: string | null
  }) {
    const userColumn = input.userColumn ?? 'user_id'
    const campaignColumn = input.campaignColumn === undefined ? 'campaign_id' : input.campaignColumn
    let query = this.svc.client
      .from(input.table)
      .select(input.select)
      .eq('space_id', input.spaceId)
      .eq(userColumn, input.userId)
      .gte('created_at', input.createdAfter)
      .order('created_at', { ascending: true })
    query = input.orgId ? query.eq('org_id', input.orgId) : query.is('org_id', null)
    if (campaignColumn && input.campaignId) query = query.eq(campaignColumn, input.campaignId)
    return query.limit(input.limit)
  }

  async listRecentTaskEmails(input: {
    itemId: string
    spaceId: string
    userId: string
    orgId: string | null
    campaignId?: string | null
    createdAfter: string
    limit: number
  }) {
    let query = this.svc.client
      .from('emails')
      .select('id, subject, body, status, campaign_id, space_id, source_item_id, created_at')
      .eq('space_id', input.spaceId)
      .eq('source_item_id', input.itemId)
      .eq('user_id', input.userId)
      .gte('created_at', input.createdAfter)
      .order('created_at', { ascending: true })
    query = input.orgId ? query.eq('org_id', input.orgId) : query.is('org_id', null)
    if (input.campaignId) query = query.eq('campaign_id', input.campaignId)
    return query.limit(input.limit)
  }

  async listPresentationFiles(presentationIds: string[], orgId: string | null) {
    let query = this.svc.client
      .from('presentation_files')
      .select('id, presentation_id, content, path, role')
      .in('presentation_id', presentationIds)
    query = orgId ? query.eq('org_id', orgId) : query.is('org_id', null)
    return query.limit(100)
  }

  async listFunnelPages(funnelIds: string[], orgId: string | null) {
    let query = this.svc.client
      .from('funnel_pages')
      .select('id, funnel_id, generated_html, content, sections')
      .in('funnel_id', funnelIds)
    query = orgId ? query.eq('org_id', orgId) : query.is('org_id', null)
    return query.limit(100)
  }

  async listFunnelFiles(funnelIds: string[], orgId: string | null) {
    let query = this.svc.client
      .from('funnel_files')
      .select('id, funnel_id, content, path, role')
      .in('funnel_id', funnelIds)
    query = orgId ? query.eq('org_id', orgId) : query.is('org_id', null)
    return query.limit(100)
  }
}
