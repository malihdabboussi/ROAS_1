import { Injectable } from '@nestjs/common'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class InternalRepository {
  createServiceClient(): SupabaseClient {
    const url = process.env.SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    }
    return createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }

  async findOfferByCampaignName(supabase: SupabaseClient, campaignId: string, name: string) {
    return supabase
      .from('offers')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('name', name)
      .limit(1)
      .single()
  }

  async getCampaignOrgId(supabase: SupabaseClient, campaignId: string) {
    return supabase.from('campaigns').select('org_id').eq('id', campaignId).maybeSingle()
  }

  async insertOffer(supabase: SupabaseClient, payload: Record<string, unknown>) {
    return supabase.from('offers').insert(payload).select().single()
  }

  async updateOfferStep(
    supabase: SupabaseClient,
    offerId: string,
    payload: Record<string, unknown>,
  ) {
    return supabase.from('offers').update(payload).eq('id', offerId).select().single()
  }

  async findDocumentByCampaignTitle(supabase: SupabaseClient, campaignId: string, title: string) {
    return supabase
      .from('conversation_documents')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('title', title)
      .limit(1)
      .single()
  }

  async updateDocument(supabase: SupabaseClient, id: string, payload: Record<string, unknown>) {
    return supabase.from('conversation_documents').update(payload).eq('id', id).select().single()
  }

  async insertDocument(supabase: SupabaseClient, payload: Record<string, unknown>) {
    return supabase.from('conversation_documents').insert(payload).select().single()
  }

  async insertSequence(supabase: SupabaseClient, payload: Record<string, unknown>) {
    return supabase.from('sequences').insert(payload).select().single()
  }

  async insertSequenceEmail(supabase: SupabaseClient, payload: Record<string, unknown>) {
    return supabase.from('sequence_emails').insert(payload).select().single()
  }

  async uploadCampaignFile(
    supabase: SupabaseClient,
    storagePath: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<any> {
    return supabase.storage.from('campaigns').upload(storagePath, buffer, {
      contentType,
      upsert: true,
    })
  }

  getCampaignFilePublicUrl(supabase: SupabaseClient, storagePath: string) {
    return supabase.storage.from('campaigns').getPublicUrl(storagePath)
  }

  async getDefaultUserBrain(supabase: SupabaseClient, userId: string) {
    return supabase
      .from('ns_brains')
      .select('id')
      .eq('owner_id', userId)
      .eq('is_default', true)
      .eq('scope', 'user')
      .is('org_id', null)
      .maybeSingle()
  }

  async updateMemoriesByIds(
    supabase: SupabaseClient,
    brainId: string,
    ids: string[],
    patch: Record<string, unknown>,
  ) {
    return supabase
      .from('ns_memories')
      .update(patch)
      .eq('brain_id', brainId)
      .in('id', ids)
      .select('id')
  }

  async updateMemoriesBySourceTitle(
    supabase: SupabaseClient,
    brainId: string,
    sourceTitle: string,
    patch: Record<string, unknown>,
  ) {
    return supabase
      .from('ns_memories')
      .update(patch)
      .eq('brain_id', brainId)
      .eq('source_title', sourceTitle)
      .select('id')
  }

  async listMemoriesWithNullSourceTitle(supabase: SupabaseClient, brainId: string) {
    return supabase
      .from('ns_memories')
      .select('id')
      .eq('brain_id', brainId)
      .is('source_title', null)
  }

  async listMemoriesWithEmptySourceTitle(supabase: SupabaseClient, brainId: string) {
    return supabase.from('ns_memories').select('id').eq('brain_id', brainId).eq('source_title', '')
  }

  async getBrainOwnedByUser(supabase: SupabaseClient, userId: string, brainId: string) {
    return supabase
      .from('ns_brains')
      .select('id')
      .eq('id', brainId)
      .eq('owner_id', userId)
      .maybeSingle()
  }

  async getMemoryBrainId(supabase: SupabaseClient, memoryId: string) {
    return supabase.from('ns_memories').select('brain_id').eq('id', memoryId).maybeSingle()
  }

  async getSnapshotBrainId(supabase: SupabaseClient, snapshotId: string) {
    return supabase.from('ns_snapshots').select('brain_id').eq('id', snapshotId).maybeSingle()
  }

  async getSkEntryBrainId(supabase: SupabaseClient, entryId: string) {
    return supabase.from('ns_sk_entries').select('brain_id').eq('id', entryId).maybeSingle()
  }

  async getSkSourceBrainId(supabase: SupabaseClient, sourceId: string) {
    return supabase.from('ns_sk_sources').select('brain_id').eq('id', sourceId).maybeSingle()
  }

  async getConnectionMemoryIds(supabase: SupabaseClient, connectionId: string) {
    return supabase
      .from('ns_memory_connections')
      .select('source_memory_id, target_memory_id')
      .eq('id', connectionId)
      .maybeSingle()
  }

  async getOrganizationForReconciliation(supabase: SupabaseClient, orgId: string) {
    return supabase
      .from('organizations')
      .select('id, name, owner_id, credit_discount_percent')
      .eq('id', orgId)
      .maybeSingle()
  }

  async listOpenClawGatewayUsageRows(
    supabase: SupabaseClient,
    orgId: string,
    windowStartIso: string,
    windowEndIso: string,
    from: number,
    to: number,
  ) {
    return supabase
      .from('ai_usage_events')
      .select('id, created_at, feature, action, model_name, computed_cost, credits_charged')
      .eq('org_id', orgId)
      .eq('cost_source', 'gateway_tokens')
      .in('feature', ['brain', 'mission', 'agent_chat'])
      .gte('created_at', windowStartIso)
      .lt('created_at', windowEndIso)
      .order('created_at', { ascending: true })
      .range(from, to)
  }

  async listReconciliationRowsByBatchId(
    supabase: SupabaseClient,
    orgId: string,
    batchId: string,
  ) {
    return supabase
      .from('ai_usage_events')
      .select('id, credits_charged')
      .eq('org_id', orgId)
      .eq('cost_source', 'openrouter_reconciliation_estimate')
      .eq('metadata_json->>batch_id', batchId)
  }

  async insertUsageEvents(supabase: SupabaseClient, payloads: Array<Record<string, unknown>>) {
    return supabase.from('ai_usage_events').insert(payloads).select('id, credits_charged')
  }

  async deleteUsageEventsByIds(supabase: SupabaseClient, ids: string[]) {
    return supabase.from('ai_usage_events').delete().in('id', ids).select('id')
  }

  async getOrgAutoRechargeSettings(supabase: SupabaseClient, orgId: string) {
    return supabase
      .from('org_credit_auto_recharge')
      .select('is_enabled, threshold_credits, recharge_amount, max_monthly_recharges')
      .eq('org_id', orgId)
      .maybeSingle()
  }

  async countOrgAutoRechargesThisMonth(
    supabase: SupabaseClient,
    orgId: string,
    monthStartIso: string,
    nextMonthStartIso: string,
  ) {
    return supabase
      .from('org_credit_purchases')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('status', 'completed')
      .like('stripe_checkout_session_id', 'auto_recharge:%')
      .gte('created_at', monthStartIso)
      .lt('created_at', nextMonthStartIso)
  }

  async getOrgSubscriptionPaymentState(supabase: SupabaseClient, orgId: string) {
    return supabase
      .from('org_subscriptions')
      .select('stripe_customer_id, stripe_subscription_id')
      .eq('org_id', orgId)
      .not('stripe_customer_id', 'is', null)
      .maybeSingle()
  }
}
