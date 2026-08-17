import type { SendPageGraderWorkDto } from '../../integrations/page-grader/dto/page-grader.dto'
import type { PageGraderApiService } from '../../integrations/page-grader/services/page-grader-api.service'
import type {
  WorkRequestDraftRow,
  WorkRequestRepository,
} from '../repositories/work-request.repository'
import { safeWorkRequestError } from './work-request-review-security'

/** Mirror a finalized native Space task into Portal/ClickUp once. */
export async function mirrorWorkRequestFinalTask(
  repository: WorkRequestRepository,
  pageGraderApi: PageGraderApiService,
  draft: WorkRequestDraftRow,
  task: Record<string, unknown>,
): Promise<WorkRequestDraftRow> {
  const attemptAt = new Date()
  try {
    const result = await pageGraderApi.sendWork(
      repository.client,
      draft.owner_user_id,
      {
        client_id: draft.page_grader_external_client_id,
        space_id: String(task.space_id),
        space_item_ids: [String(task.id)],
        work_kind: 'task_request',
        task_type: draft.request_type as SendPageGraderWorkDto['task_type'],
        due_date: draft.due_at?.slice(0, 10),
        // Do not send source_excerpt: Portal already formats description into
        // the ClickUp body. Repeating the brief duplicated Notes/Source folder.
        ...(draft.assignee_name ? { assignee: { name: draft.assignee_name } } : {}),
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
        : safeWorkRequestError(
            first?.error ?? (mirrored ? 'ClickUp mirror is pending' : 'Page Grader mirror failed'),
          ),
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
