import type { SendPageGraderWorkDto } from '../../integrations/page-grader/dto/page-grader.dto'
import type { PageGraderSendResult } from '../../integrations/page-grader/services/page-grader-api.helpers'
import type { PageGraderApiService } from '../../integrations/page-grader/services/page-grader-api.service'
import type {
  WorkRequestDraftRow,
  WorkRequestRepository,
} from '../repositories/work-request.repository'
import {
  pageGraderSendAssignee,
  resolveWorkRequestAssigneeIdentity,
  type WorkRequestAssigneeIdentity,
  type WorkRequestTeamMember,
} from './work-request-assignee'
import { safeWorkRequestError } from './work-request-review-security'

export function clickUpMirrorLastError(
  first: PageGraderSendResult | undefined,
  identity: WorkRequestAssigneeIdentity,
  mirrored: boolean,
): string {
  if (first?.error) return first.error
  const unmapped = (first?.assignee_resolution ?? []).filter((row) => row.status === 'unmapped')
  if (unmapped.length > 0) {
    return 'ClickUp does not have a mapped user for this assignee yet.'
  }
  if (mirrored && !first?.clickup_task_id) {
    if (!identity.pageGraderUserId && identity.name) {
      return `ClickUp mirror is pending. Assignee "${identity.name}" was sent without a Portal user id.`
    }
    return 'ClickUp mirror is pending'
  }
  return 'Page Grader mirror failed'
}

/** Mirror a finalized native Space task into Portal/ClickUp once. */
export async function mirrorWorkRequestFinalTask(
  repository: WorkRequestRepository,
  pageGraderApi: PageGraderApiService,
  draft: WorkRequestDraftRow,
  task: Record<string, unknown>,
  teamMembers: WorkRequestTeamMember[] = [],
): Promise<WorkRequestDraftRow> {
  const attemptAt = new Date()
  const identity = resolveWorkRequestAssigneeIdentity(
    draft.routing,
    draft.assignee_name,
    teamMembers,
  )
  const assignee = pageGraderSendAssignee(identity)
  try {
    const result = await pageGraderApi.sendWork(
      repository.client,
      draft.owner_user_id,
      {
        client_id: draft.page_grader_external_client_id,
        ...(draft.page_grader_external_campaign_id
          ? { campaign_id: draft.page_grader_external_campaign_id }
          : {}),
        origin: 'page_grader',
        space_id: String(task.space_id),
        space_item_ids: [String(task.id)],
        work_kind: 'task_request',
        task_type: draft.request_type as SendPageGraderWorkDto['task_type'],
        due_date: draft.due_at?.slice(0, 10),
        // Do not send source_excerpt: Portal already formats description into
        // the ClickUp body. Repeating the brief duplicated Notes/Source folder.
        ...(assignee ? { assignee } : {}),
        note: `Finalized from ROAS Service Request ${draft.id}.`,
      },
      draft.owner_org_id,
      draft.owner_org_id ? 'owner' : null,
    )
    const first = result.results[0]
    const mirrored = Boolean(result.success && first && first.status !== 'failed')
    const success = Boolean(mirrored && first?.clickup_task_id)
    const receiptResults = result.results.map(({ error, ...receipt }) => ({
      ...receipt,
      ...(error ? { error: safeWorkRequestError(error) } : {}),
    }))
    return repository.update(draft.id, {
      page_grader_receipt: {
        success: result.success,
        retryable: !success,
        results: receiptResults,
      },
      clickup_receipt: first
        ? {
            task_id: first.clickup_task_id ?? null,
            task_url: first.clickup_task_url ?? null,
          }
        : {},
      sync_status: success ? 'synced' : mirrored ? 'sync_pending' : 'sync_failed',
      sync_attempt_count: draft.sync_attempt_count + 1,
      last_sync_attempt_at: attemptAt.toISOString(),
      next_retry_at: success ? null : new Date(attemptAt.getTime() + 15 * 60 * 1000).toISOString(),
      last_error: success
        ? null
        : safeWorkRequestError(clickUpMirrorLastError(first, identity, mirrored)),
    })
  } catch (error) {
    return repository.update(draft.id, {
      sync_status: 'sync_failed',
      sync_attempt_count: draft.sync_attempt_count + 1,
      last_sync_attempt_at: attemptAt.toISOString(),
      next_retry_at: new Date(attemptAt.getTime() + 15 * 60 * 1000).toISOString(),
      last_error: safeWorkRequestError(error),
      page_grader_receipt: { success: false, retryable: true },
    })
  }
}
