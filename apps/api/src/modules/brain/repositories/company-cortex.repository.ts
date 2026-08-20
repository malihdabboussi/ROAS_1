import { Injectable } from '@nestjs/common'
import { SupabaseServiceClient } from '@vibey/api-shared'

const COMPANY_CORTEX_SELECT = 'id, owner_id, org_id, scope, cortex_max'
const SETTINGS_SELECT =
  'org_id, brain_id, enabled, schedule, local_time, timezone, lookback_hours, include_sources, min_activity_threshold, last_successful_dream_at'
const OBJECT_SELECT =
  'id, org_id, brain_id, object_type, title, truth, status, confidence, confidence_basis, source_signal_ids, evidence_refs, retrieval_rule, metadata, created_at, updated_at'
const SIGNAL_SELECT =
  'id, org_id, brain_id, signal_type, truth, scope, evidence_refs, confidence, confidence_basis, reason, context_form, status, source, reviewed_by, reviewed_at, review_decision, review_note, created_at, updated_at'

@Injectable()
export class CompanyCortexRepository {
  constructor(private readonly serviceClient: SupabaseServiceClient) {}

  async findCompanyCortex(orgId: string) {
    const { data, error } = await this.serviceClient.client
      .from('ns_brains')
      .select(COMPANY_CORTEX_SELECT)
      .eq('scope', 'company')
      .eq('org_id', orgId)
      .maybeSingle()
    if (error) throw new Error(`Failed to resolve Company Cortex: ${error.message}`)
    return data ?? null
  }

  async createCompanyCortex(input: { ownerId: string; orgId: string }) {
    const { data, error } = await this.serviceClient.client
      .from('ns_brains')
      .insert({
        owner_id: input.ownerId,
        org_id: input.orgId,
        created_by: input.ownerId,
        name: 'Company Cortex',
        description: 'Organizational operating mind',
        is_default: false,
        color: '#8b5cf6',
        icon: 'building-2',
        scope: 'company',
        cortex_max: true,
      })
      .select(COMPANY_CORTEX_SELECT)
      .single()
    if (error) throw new Error(`Failed to create Company Cortex: ${error.message}`)
    return data
  }

  async findSettings(orgId: string) {
    const { data, error } = await this.serviceClient.client
      .from('company_cortex_settings')
      .select(SETTINGS_SELECT)
      .eq('org_id', orgId)
      .maybeSingle()
    if (error) throw new Error(`Failed to resolve Company Cortex settings: ${error.message}`)
    return data ?? null
  }

  async createSettings(input: { orgId: string; brainId: string; ownerId?: string }) {
    const { data, error } = await this.serviceClient.client
      .from('company_cortex_settings')
      .insert({
        org_id: input.orgId,
        brain_id: input.brainId,
        enabled: false,
        schedule: 'manual_only',
        local_time: '02:00',
        timezone: 'UTC',
        lookback_hours: 24,
        min_activity_threshold: 1,
      })
      .select(SETTINGS_SELECT)
      .single()
    if (error) throw new Error(`Failed to create Company Cortex settings: ${error.message}`)
    await this.upsertDreamOpsCompanySetting(data as Record<string, unknown>, input.ownerId ?? null)
    return data
  }

  async updateSettings(orgId: string, updates: Record<string, unknown>, ownerId?: string) {
    const { data, error } = await this.serviceClient.client
      .from('company_cortex_settings')
      .update(updates)
      .eq('org_id', orgId)
      .select(SETTINGS_SELECT)
      .single()
    if (error) throw new Error(`Failed to update Company Cortex settings: ${error.message}`)
    await this.upsertDreamOpsCompanySetting(data as Record<string, unknown>, ownerId ?? null)
    return data
  }

  private async upsertDreamOpsCompanySetting(
    setting: Record<string, unknown>,
    ownerId: string | null,
  ): Promise<void> {
    const orgId = String(setting.org_id || '')
    const brainId = String(setting.brain_id || '')
    if (!orgId || !brainId) return
    const userId = ownerId || (await this.resolveBrainOwner(brainId))
    if (!userId) return

    const { error } = await this.serviceClient.client.from('dream_ops_settings').upsert(
      {
        org_id: orgId,
        user_id: userId,
        operation_type: 'company_daily_dream',
        subject_kind: 'company_brain',
        subject_key: brainId,
        target_id: brainId,
        enabled: Boolean(setting.enabled),
        schedule: setting.schedule || 'manual_only',
        local_time: setting.local_time || '02:00',
        timezone: setting.timezone || 'UTC',
        lookback_hours: setting.lookback_hours || 24,
        min_activity_threshold: setting.min_activity_threshold || 1,
        metadata: { source: 'company_cortex_settings' },
      },
      { onConflict: 'org_id,operation_type,subject_kind,subject_key' },
    )
    if (error) throw new Error(`Failed to sync Company Cortex Dream Ops setting: ${error.message}`)
  }

  private async resolveBrainOwner(brainId: string): Promise<string | null> {
    const { data, error } = await this.serviceClient.client
      .from('ns_brains')
      .select('owner_id')
      .eq('id', brainId)
      .maybeSingle()
    if (error) throw new Error(`Failed to resolve Company Cortex owner: ${error.message}`)
    return typeof data?.owner_id === 'string' ? data.owner_id : null
  }

  async listObjects(input: { brainId: string; orgId: string }) {
    const { data, error } = await this.serviceClient.client
      .from('company_cortex_objects')
      .select(OBJECT_SELECT)
      .eq('brain_id', input.brainId)
      .eq('org_id', input.orgId)
      .order('updated_at', { ascending: false })
    if (error) throw new Error(`Failed to list Company Cortex objects: ${error.message}`)
    return data ?? []
  }

  async listSignals(input: { brainId: string; orgId: string; status?: string }) {
    let query = this.serviceClient.client
      .from('company_cortex_signals')
      .select(SIGNAL_SELECT)
      .eq('brain_id', input.brainId)
      .eq('org_id', input.orgId)
    if (input.status) query = query.eq('status', input.status)
    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) throw new Error(`Failed to list Company Cortex signals: ${error.message}`)
    return data ?? []
  }

  async findProposedSignalForReview(input: { brainId: string; orgId: string; signalId: string }) {
    const { data, error } = await this.serviceClient.client
      .from('company_cortex_signals')
      .select(SIGNAL_SELECT)
      .eq('id', input.signalId)
      .eq('brain_id', input.brainId)
      .eq('org_id', input.orgId)
      .eq('status', 'proposed')
      .maybeSingle()
    if (error) throw new Error(`Failed to load Company Cortex signal: ${error.message}`)
    return data ?? null
  }

  async reviewSignal(input: {
    brainId: string
    orgId: string
    signalId: string
    status: string
    reviewedBy: string
    reviewedAt: string
    reviewDecision: string
    reviewNote?: string | null
    confidenceBasis: Record<string, unknown>
  }) {
    const { data, error } = await this.serviceClient.client
      .from('company_cortex_signals')
      .update({
        status: input.status,
        reviewed_by: input.reviewedBy,
        reviewed_at: input.reviewedAt,
        review_decision: input.reviewDecision,
        review_note: input.reviewNote ?? null,
        confidence_basis: input.confidenceBasis,
      })
      .eq('id', input.signalId)
      .eq('brain_id', input.brainId)
      .eq('org_id', input.orgId)
      .eq('status', 'proposed')
      .select(SIGNAL_SELECT)
      .maybeSingle()
    if (error) throw new Error(`Failed to update Company Cortex signal: ${error.message}`)
    return data ?? null
  }

  async insertFormationOutbox(input: {
    brainId: string
    orgId: string
    userId: string
    signalId: string
    source?: 'human_review' | 'auto_high_confidence'
  }) {
    const source = input.source ?? 'human_review'
    const { error } = await this.serviceClient.client.from('brain_ops_outbox').insert({
      brain_id: input.brainId,
      user_id: input.userId,
      org_id: input.orgId,
      event_type: 'company_cortex_formation',
      dedupe_key: `company-cortex-formation-review-${input.brainId}-${input.signalId}`,
      payload: { source, signal_ids: [input.signalId] },
    })
    if (error) throw new Error(`Failed to enqueue Company Cortex formation: ${error.message}`)
  }
}
