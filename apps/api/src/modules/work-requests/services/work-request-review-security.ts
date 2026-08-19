import { createHash, randomBytes } from 'node:crypto'
import type { WorkRequestDraftRow } from '../repositories/work-request.repository'

export type WorkRequestScopeOption = {
  id: string
  name: string
  externalClientId: string
  generalSpaceId: string | null
}

export type WorkRequestSpaceOption = {
  id: string
  name: string
  clientWorkspaceId: string
  externalCampaignId: string
}

export type WorkRequestTeamMemberOption = {
  id: string
  name: string
  email?: string | null
  source?: 'portal' | 'org'
}

export function publicWorkRequestOptions(options: {
  clients: WorkRequestScopeOption[]
  spaces: WorkRequestSpaceOption[]
  teamMembers?: WorkRequestTeamMemberOption[]
}) {
  return {
    client_workspaces: options.clients.map(({ id, name }) => ({ id, name })),
    campaign_spaces: options.spaces.map(({ id, name, clientWorkspaceId }) => ({
      id,
      name,
      client_workspace_id: clientWorkspaceId,
    })),
    team_members: (options.teamMembers ?? []).map(({ id, name, email, source }) => ({
      id,
      name,
      email: email ?? null,
      source: source ?? 'org',
    })),
  }
}

export function generateWorkRequestReviewToken(): string {
  return randomBytes(32).toString('base64url')
}

export function hashWorkRequestReviewToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}

export function buildWorkRequestTaskUrl(draft: WorkRequestDraftRow): string | null {
  if (!draft.final_space_item_id) return null
  const spaceId = draft.campaign_space_id ?? stringValue(asRecord(draft.routing).general_space_id)
  if (!spaceId) return null
  const params = new URLSearchParams({
    space: spaceId,
    item: draft.final_space_item_id,
  })
  // Public review links sit outside the dashboard org bootstrap. Include org so
  // "Open ROAS task" lands in the workspace that owns the Space.
  if (draft.owner_org_id) params.set('org', draft.owner_org_id)
  return `/spaces?${params.toString()}`
}

export function sanitizeWorkRequestDraft(draft: WorkRequestDraftRow) {
  const structured = asRecord(draft.structured_fields)
  return {
    id: draft.id,
    client_workspace_id: draft.campaign_id,
    campaign_space_id: draft.campaign_space_id,
    request_type: draft.request_type,
    assignee_name: draft.assignee_name,
    title: draft.title,
    description: draft.description,
    due_date: draft.due_at?.slice(0, 10) ?? null,
    priority: draft.priority,
    structured_fields: structured,
    links: Array.isArray(structured.links) ? structured.links : [],
    required_fields: draft.required_fields,
    missing_fields: draft.missing_fields,
    assets: draft.assets,
    dependencies: draft.dependencies,
    requester: {
      name:
        typeof draft.requester_metadata?.name === 'string' ? draft.requester_metadata.name : null,
    },
    status: draft.status,
    expires_at: draft.review_token_expires_at,
    final_task_id: draft.final_space_item_id,
    sync_status: draft.sync_status,
    resume_conversation_id: readResumeConversationId(draft.provenance),
    task_url: buildWorkRequestTaskUrl(draft),
    clickup_url:
      typeof draft.clickup_receipt?.task_url === 'string' ? draft.clickup_receipt.task_url : null,
  }
}

/** Safe public resume id for logged-in deep-link into the originating ROAS chat. */
export function readResumeConversationId(provenance: unknown): string | null {
  const root = asRecord(provenance)
  const context = asRecord(root.context)
  const candidates = [
    stringValue(root.conversation_id),
    stringValue(root.conversationId),
    stringValue(context.conversation_id),
    stringValue(context.conversationId),
  ]
  const match = candidates.find((value) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value),
  )
  return match || null
}

export function buildWorkRequestWebhookResult(
  draft: WorkRequestDraftRow,
  token: string | null,
  appUrl: string,
  state: string,
) {
  return {
    draft_id: draft.id,
    review_url: token ? `${appUrl.replace(/\/+$/, '')}/request-review/${token}` : null,
    expires_at: draft.review_token_expires_at,
    status: draft.status,
    state,
    client: {
      id: draft.page_grader_external_client_id,
      name: stringValue(asRecord(draft.routing).page_grader_client_name) || null,
    },
    campaign: draft.page_grader_external_campaign_id
      ? {
          id: draft.page_grader_external_campaign_id,
          name: stringValue(asRecord(draft.routing).page_grader_campaign_name) || null,
        }
      : null,
    missing_fields: draft.missing_fields,
    replayed: state !== 'created',
  }
}

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

export function stringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function schemaData(value: unknown) {
  const custom = asRecord(asRecord(asRecord(value).schema).custom_data)
  return {
    space_role: stringValue(custom.space_role),
    page_grader_client_id: stringValue(custom.page_grader_client_id),
    page_grader_campaign_id: stringValue(custom.page_grader_campaign_id),
  }
}

export function computeWorkRequestMissingFields(draft: WorkRequestDraftRow): string[] {
  const routing = asRecord(draft.routing)
  const values: Record<string, unknown> = {
    ...asRecord(draft.structured_fields),
    title: draft.title,
    description: draft.description,
    due_date: draft.due_at,
    priority: draft.priority,
    campaign_space_id: draft.campaign_space_id,
    general_space_id: routing.general_space_id,
    assets: draft.assets,
    dependencies: draft.dependencies,
    links: asRecord(draft.structured_fields).links,
  }
  const missing = draft.required_fields.filter((field) => isMissing(values[field]))
  if (routing.work_scope === 'campaign' && !draft.campaign_space_id) {
    missing.push('campaign_space_id')
  }
  if (routing.work_scope !== 'campaign' && isMissing(routing.general_space_id)) {
    missing.push('general_space_id')
  }
  return [...new Set(missing)]
}

export function isMissing(value: unknown): boolean {
  return (
    value == null ||
    (typeof value === 'string' && !value.trim()) ||
    (Array.isArray(value) && value.length === 0)
  )
}

export function safeWorkRequestError(error: unknown): string {
  return (error instanceof Error ? error.message : String(error))
    .replace(
      /\b(api[_-]?key|authorization|bearer|access[_-]?token|secret|password)(\s*[:=]\s*)[^\s,;]+/gi,
      '$1$2[redacted]',
    )
    .slice(0, 4000)
}
