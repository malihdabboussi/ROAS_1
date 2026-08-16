import { Injectable } from '@nestjs/common'
import { SupabaseServiceClient } from '@vibey/api-shared'

export type WorkRequestDraftRow = {
  id: string
  owner_user_id: string
  owner_org_id: string | null
  campaign_id: string
  campaign_space_id: string | null
  page_grader_external_client_id: string
  page_grader_external_campaign_id: string | null
  request_type: string
  assignee_name: string | null
  title: string
  description: string | null
  due_at: string | null
  priority: string
  structured_fields: Record<string, unknown>
  required_fields: string[]
  missing_fields: string[]
  assets: unknown[]
  dependencies: unknown[]
  provenance: Record<string, unknown>
  routing: Record<string, unknown>
  requester_metadata: Record<string, unknown>
  status: 'draft' | 'finalized' | 'revoked' | 'expired'
  idempotency_key: string
  review_token_hash: string
  review_token_issued_at: string
  review_token_expires_at: string
  review_token_revoked_at: string | null
  review_token_used_at: string | null
  review_token_reissued_at: string | null
  review_token_version: number
  token_refresh_idempotency_key: string | null
  reminder_3h_sent_at: string | null
  reminder_1h_sent_at: string | null
  final_space_item_id: string | null
  finalized_at: string | null
  page_grader_receipt: Record<string, unknown>
  clickup_receipt: Record<string, unknown>
  sync_status: 'not_started' | 'sync_pending' | 'synced' | 'sync_failed'
  sync_attempt_count: number
  last_sync_attempt_at: string | null
  next_retry_at: string | null
  last_error: string | null
  created_at: string
  updated_at: string
}

export type WorkRequestFinalizeResult = {
  draft: WorkRequestDraftRow
  task: Record<string, unknown>
}

type AssigneeProfile = { id: string; full_name: string | null }

function normalizedName(value: string | null | undefined) {
  return value?.trim().replace(/\s+/g, ' ').toLocaleLowerCase() ?? ''
}

export function resolveUniqueAssigneeProfileId(profiles: AssigneeProfile[], requestedName: string) {
  const requested = normalizedName(requestedName)
  if (!requested) return null
  const exact = profiles.filter((profile) => normalizedName(profile.full_name) === requested)
  if (exact.length === 1) return exact[0]?.id ?? null
  if (exact.length > 1) return null

  const requestedFirstName = requested.split(' ')[0]
  const compatible = profiles.filter((profile) => {
    const candidate = normalizedName(profile.full_name)
    if (!candidate) return false
    const candidateParts = candidate.split(' ')
    return (
      requested.startsWith(`${candidate} `) ||
      candidate.startsWith(`${requested} `) ||
      candidateParts[0] === requestedFirstName
    )
  })
  return compatible.length === 1 ? (compatible[0]?.id ?? null) : null
}

const DRAFT_COLUMNS = [
  'id',
  'owner_user_id',
  'owner_org_id',
  'campaign_id',
  'campaign_space_id',
  'page_grader_external_client_id',
  'page_grader_external_campaign_id',
  'request_type',
  'assignee_name',
  'title',
  'description',
  'due_at',
  'priority',
  'structured_fields',
  'required_fields',
  'missing_fields',
  'assets',
  'dependencies',
  'provenance',
  'routing',
  'requester_metadata',
  'status',
  'idempotency_key',
  'review_token_hash',
  'review_token_issued_at',
  'review_token_expires_at',
  'review_token_revoked_at',
  'review_token_used_at',
  'review_token_version',
  'token_refresh_idempotency_key',
  'reminder_3h_sent_at',
  'reminder_1h_sent_at',
  'final_space_item_id',
  'finalized_at',
  'page_grader_receipt',
  'clickup_receipt',
  'sync_status',
  'sync_attempt_count',
  'last_sync_attempt_at',
  'next_retry_at',
  'last_error',
  'created_at',
  'updated_at',
].join(', ')

@Injectable()
export class WorkRequestRepository {
  constructor(private readonly serviceClient: SupabaseServiceClient) {}

  get client() {
    return this.serviceClient.client
  }

  async findByTokenHash(tokenHash: string): Promise<WorkRequestDraftRow | null> {
    const { data, error } = await this.client
      .from('work_request_drafts')
      .select(DRAFT_COLUMNS)
      .eq('review_token_hash', tokenHash)
      .maybeSingle()
    if (error) throw new Error(`Could not load Service Request: ${error.message}`)
    return (data as unknown as WorkRequestDraftRow | null) ?? null
  }

  async findById(id: string): Promise<WorkRequestDraftRow | null> {
    const { data, error } = await this.client
      .from('work_request_drafts')
      .select(DRAFT_COLUMNS)
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(`Could not load Service Request: ${error.message}`)
    return (data as unknown as WorkRequestDraftRow | null) ?? null
  }

  async findByIdempotency(
    ownerUserId: string,
    externalClientId: string,
    idempotencyKey: string,
  ): Promise<WorkRequestDraftRow | null> {
    const { data, error } = await this.client
      .from('work_request_drafts')
      .select(DRAFT_COLUMNS)
      .eq('owner_user_id', ownerUserId)
      .eq('page_grader_external_client_id', externalClientId)
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle()
    if (error) throw new Error(`Could not load idempotent Service Request: ${error.message}`)
    return (data as unknown as WorkRequestDraftRow | null) ?? null
  }

  async create(values: Record<string, unknown>): Promise<WorkRequestDraftRow> {
    const { data, error } = await this.client
      .from('work_request_drafts')
      .insert(values)
      .select(DRAFT_COLUMNS)
      .single()
    if (error) {
      throw Object.assign(new Error(`Could not create Service Request: ${error.message}`), {
        code: error.code,
      })
    }
    return data as unknown as WorkRequestDraftRow
  }

  async update(id: string, values: Record<string, unknown>): Promise<WorkRequestDraftRow> {
    const { data, error } = await this.client
      .from('work_request_drafts')
      .update(values)
      .eq('id', id)
      .select(DRAFT_COLUMNS)
      .single()
    if (error) throw new Error(`Could not update Service Request: ${error.message}`)
    return data as unknown as WorkRequestDraftRow
  }

  async finalize(tokenHash: string): Promise<WorkRequestFinalizeResult> {
    const { data, error } = await this.client.rpc('finalize_work_request_draft', {
      p_token_hash: tokenHash,
    })
    if (error) throw new Error(error.message)
    return data as unknown as WorkRequestFinalizeResult
  }

  async listConnectionScopeRows(ownerUserId: string) {
    const { data, error } = await this.client
      .from('user_integrations')
      .select('org_id, metadata')
      .eq('user_id', ownerUserId)
      .eq('integration_id', 'page_grader')
      .eq('status', 'connected')
    if (error) throw new Error(`Could not load Service Request scope: ${error.message}`)
    return (data ?? []) as Array<{ org_id: string | null; metadata: unknown }>
  }

  async listCampaignOptions(campaignIds: string[]) {
    if (campaignIds.length === 0) return []
    const { data, error } = await this.client
      .from('campaigns')
      .select('id, name, user_id, org_id')
      .in('id', campaignIds)
      .is('deleted_at', null)
    if (error) throw new Error(`Could not load client workspaces: ${error.message}`)
    return data ?? []
  }

  async listSpaceOptions(campaignIds: string[]) {
    if (campaignIds.length === 0) return []
    const { data, error } = await this.client
      .from('spaces')
      .select('id, title, campaign_id, user_id, org_id, schema')
      .in('campaign_id', campaignIds)
      .eq('is_template', false)
    if (error) throw new Error(`Could not load campaign Spaces: ${error.message}`)
    return data ?? []
  }

  async findSpace(spaceId: string) {
    const { data, error } = await this.client
      .from('spaces')
      .select('id, title, campaign_id, user_id, org_id, schema')
      .eq('id', spaceId)
      .maybeSingle()
    if (error) throw new Error(`Could not resolve Service Request Space: ${error.message}`)
    return data ?? null
  }

  async findTask(taskId: string) {
    const { data, error } = await this.client
      .from('space_items')
      .select('*')
      .eq('id', taskId)
      .maybeSingle()
    if (error) throw new Error(`Could not resolve finalized Service Request task: ${error.message}`)
    return (data as Record<string, unknown> | null) ?? null
  }

  async resolveOrgAssigneeByName(orgId: string, name: string) {
    const { data: members, error: membersError } = await this.client
      .from('org_members')
      .select('user_id')
      .eq('org_id', orgId)
      .eq('status', 'active')
    if (membersError)
      throw new Error(`Could not resolve Service Request assignee: ${membersError.message}`)
    const userIds = (members ?? []).map((row) => String(row.user_id)).filter(Boolean)
    if (userIds.length === 0) return null
    const { data, error } = await this.client
      .from('profiles')
      .select('id, full_name')
      .in('id', userIds)
      .limit(100)
    if (error) throw new Error(`Could not resolve Service Request assignee: ${error.message}`)
    return resolveUniqueAssigneeProfileId((data ?? []) as AssigneeProfile[], name)
  }

  async assignTask(taskId: string, userId: string) {
    const { data, error } = await this.client
      .from('space_items')
      .update({
        assignee_type: 'human',
        assignee_id: userId,
        assignees: [{ type: 'human', id: userId }],
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId)
      .select('*')
      .single()
    if (error) throw new Error(`Could not assign Service Request task: ${error.message}`)
    return data as Record<string, unknown>
  }

  async listDueThreeHourReminders(cutoff: string, limit: number) {
    const { data, error } = await this.client
      .from('work_request_drafts')
      .select(DRAFT_COLUMNS)
      .eq('status', 'draft')
      .is('reminder_3h_sent_at', null)
      .lte('review_token_issued_at', cutoff)
      .gt('review_token_expires_at', new Date().toISOString())
      .limit(limit)
    if (error) throw new Error(`Could not load due Service Request reminders: ${error.message}`)
    return (data ?? []) as unknown as WorkRequestDraftRow[]
  }

  async listDueOneHourWarnings(cutoff: string, limit: number) {
    const now = new Date().toISOString()
    const { data, error } = await this.client
      .from('work_request_drafts')
      .select(DRAFT_COLUMNS)
      .eq('status', 'draft')
      .is('reminder_1h_sent_at', null)
      .gt('review_token_expires_at', now)
      .lte('review_token_expires_at', cutoff)
      .limit(limit)
    if (error) throw new Error(`Could not load due Service Request warnings: ${error.message}`)
    return (data ?? []) as unknown as WorkRequestDraftRow[]
  }

  async listDueSyncRetries(cutoff: string, limit: number) {
    const { data, error } = await this.client
      .from('work_request_drafts')
      .select(DRAFT_COLUMNS)
      .eq('status', 'finalized')
      .in('sync_status', ['sync_pending', 'sync_failed'])
      .not('final_space_item_id', 'is', null)
      .lte('next_retry_at', cutoff)
      .limit(limit)
    if (error) throw new Error(`Could not load due Service Request sync retries: ${error.message}`)
    return (data ?? []) as unknown as WorkRequestDraftRow[]
  }

  async claimReminder(
    id: string,
    column: 'reminder_3h_sent_at' | 'reminder_1h_sent_at',
    claimedAt: string,
  ): Promise<boolean> {
    const { data, error } = await this.client
      .from('work_request_drafts')
      .update({ [column]: claimedAt })
      .eq('id', id)
      .eq('status', 'draft')
      .is(column, null)
      .select('id')
      .maybeSingle()
    if (error) throw new Error(`Could not claim Service Request reminder: ${error.message}`)
    return Boolean(data?.id)
  }
}
