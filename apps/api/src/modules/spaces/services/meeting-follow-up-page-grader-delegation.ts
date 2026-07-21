import type { ModuleRef } from '@nestjs/core'
import type { SupabaseClient } from '@supabase/supabase-js'
import { PageGraderApiService } from '../../integrations/page-grader/services/page-grader-api.service'
import type { SpacesRepository } from '../repositories/spaces.repository'
import { buildMeetingFollowUpActionLedger } from './meeting-follow-up-action-ledger'
import {
  resolvePageGraderAssigneeForFollowUp,
  resolvePageGraderClientForFollowUp,
} from './meeting-follow-up-page-grader-routing'

type LoggerLike = { warn(message: string): void }

type DelegationInput = {
  supabase: SupabaseClient
  ownerUserId: string
  orgId: string | null
  spaceId: string
  callItemId: string
  followUps: Array<Record<string, unknown>>
}

type DelegationDeps = {
  repo: SpacesRepository
  moduleRef: ModuleRef
  logger: LoggerLike
}

export async function delegateConfirmedPageGraderCandidates(
  deps: DelegationDeps,
  input: DelegationInput,
): Promise<void> {
  const candidates = input.followUps
    .map((item) => ({
      item,
      ledger: buildMeetingFollowUpActionLedger({
        item,
        callItemId: input.callItemId,
        status: 'confirmed',
      }),
    }))
    .filter(({ ledger }) => ledger.page_grader.candidate && ledger.page_grader.task_type)
  if (candidates.length === 0) return

  let pageGrader: PageGraderApiService | null = null
  try {
    const resolved = deps.moduleRef.get(PageGraderApiService, { strict: false })
    if (
      resolved &&
      typeof resolved.listClients === 'function' &&
      typeof resolved.listAssignees === 'function' &&
      typeof resolved.sendWork === 'function'
    ) {
      pageGrader = resolved
    }
  } catch {
    pageGrader = null
  }
  if (!pageGrader) {
    deps.logger.warn('Page Grader delegation skipped: integration service is unavailable')
    return
  }

  let catalog: Awaited<ReturnType<PageGraderApiService['listClients']>>
  let assignees: Awaited<ReturnType<PageGraderApiService['listAssignees']>>['assignees']
  try {
    const [catalogResult, assigneeResult] = await Promise.all([
      pageGrader.listClients(input.ownerUserId, { all: true }),
      pageGrader.listAssignees(input.ownerUserId, { limit: 200 }),
    ])
    catalog = catalogResult
    assignees = assigneeResult.assignees
  } catch (err) {
    await markCandidatesBlocked(deps, input, candidates, {
      error: `Page Grader connection unavailable: ${err instanceof Error ? err.message : String(err)}`,
    })
    return
  }

  const space = (await deps.repo.findSpaceByIdForAccess(input.supabase, input.spaceId)) as Record<
    string,
    unknown
  > | null
  const campaignId = typeof space?.campaign_id === 'string' ? space.campaign_id : null

  for (const { item, ledger } of candidates) {
    const itemId = String(item.id ?? '').trim()
    if (!itemId) continue
    const client = resolvePageGraderClientForFollowUp({
      item,
      clients: catalog.clients,
      scopeMap: catalog.client_scope_map,
      spaceId: input.spaceId,
      campaignId,
    })
    if (!client) {
      await writeLedgerResult(deps, input, itemId, ledger, {
        status: 'blocked',
        error: 'No unambiguous Page Grader client mapping was found for this action item.',
      })
      continue
    }

    const assignee = resolvePageGraderAssigneeForFollowUp(ledger.owner_name, assignees)
    if (!assignee) {
      await writeLedgerResult(deps, input, itemId, ledger, {
        status: 'blocked',
        clientId: client.id,
        clientName: client.name,
        error: ledger.owner_name
          ? `No unambiguous Page Grader assignee mapping was found for ${ledger.owner_name}.`
          : 'The action item has no fulfillment owner.',
      })
      continue
    }

    const sourceExcerpt = `${String(item.title ?? '').trim()}\n${String(
      item.description ?? '',
    ).trim()}`.trim()
    try {
      const result = await pageGrader.sendWork(
        input.supabase,
        input.ownerUserId,
        {
          client_id: client.id,
          space_id: input.spaceId,
          space_item_ids: [itemId],
          work_kind: 'task_request',
          task_type: ledger.page_grader.task_type!,
          ...(ledger.page_grader.task_subtype
            ? { task_subtype: ledger.page_grader.task_subtype }
            : {}),
          ...(sourceExcerpt ? { source_excerpt: sourceExcerpt } : {}),
          assignee: {
            page_grader_user_id: assignee.id,
            ...(assignee.email ? { email: assignee.email } : {}),
            name: assignee.name,
          },
          note: 'Delegated automatically after the post-call action-item review was confirmed.',
        },
        input.orgId,
      )
      const sent = result.results[0]
      if (!sent || sent.status === 'failed' || !sent.work_id) {
        await writeLedgerResult(deps, input, itemId, ledger, {
          status: 'failed',
          clientId: client.id,
          clientName: client.name,
          error: sent?.error || 'Page Grader did not return a work record.',
        })
        continue
      }
      await writeLedgerResult(deps, input, itemId, ledger, {
        status: 'delegated',
        clientId: client.id,
        clientName: client.name,
        workId: sent.work_id,
        workUrl: sent.work_url,
        clickupTaskId: sent.clickup_task_id,
        clickupTaskUrl: sent.clickup_task_url,
      })
    } catch (err) {
      await writeLedgerResult(deps, input, itemId, ledger, {
        status: 'failed',
        clientId: client.id,
        clientName: client.name,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }
}

export async function stampMeetingFollowUpActionLedger(
  deps: Pick<DelegationDeps, 'repo' | 'logger'>,
  supabase: SupabaseClient,
  input: {
    userId: string
    orgId: string | null
    spaceId: string
    callItemId: string
    followUps: Array<Record<string, unknown>>
    status: 'proposed' | 'confirmed'
  },
) {
  for (const item of input.followUps) {
    const itemId = String(item.id ?? '').trim()
    if (!itemId) continue
    try {
      await deps.repo.updateItem(
        supabase,
        input.userId,
        input.spaceId,
        itemId,
        {
          custom_data: {
            action_ledger: buildMeetingFollowUpActionLedger({
              item,
              callItemId: input.callItemId,
              status: input.status,
            }),
          },
        },
        input.orgId,
      )
    } catch (err) {
      deps.logger.warn(
        `Failed to stamp action ledger ${itemId}: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }
}

async function markCandidatesBlocked(
  deps: DelegationDeps,
  input: DelegationInput,
  candidates: Array<{
    item: Record<string, unknown>
    ledger: ReturnType<typeof buildMeetingFollowUpActionLedger>
  }>,
  result: { error: string },
) {
  for (const { item, ledger } of candidates) {
    const itemId = String(item.id ?? '').trim()
    if (!itemId) continue
    await writeLedgerResult(deps, input, itemId, ledger, {
      status: 'blocked',
      error: result.error,
    })
  }
}

async function writeLedgerResult(
  deps: DelegationDeps,
  input: DelegationInput,
  itemId: string,
  ledger: ReturnType<typeof buildMeetingFollowUpActionLedger>,
  result: {
    status: 'delegated' | 'blocked' | 'failed'
    clientId?: string
    clientName?: string
    workId?: string
    workUrl?: string
    clickupTaskId?: string | null
    clickupTaskUrl?: string | null
    error?: string
  },
) {
  const now = new Date().toISOString()
  await deps.repo.updateItem(
    input.supabase,
    input.ownerUserId,
    input.spaceId,
    itemId,
    {
      custom_data: {
        action_ledger: {
          ...ledger,
          status: result.status === 'delegated' ? 'delegated' : 'blocked',
          page_grader: {
            ...ledger.page_grader,
            delegation_status: result.status,
            client_id: result.clientId ?? null,
            client_name: result.clientName ?? null,
            work_id: result.workId ?? null,
            work_url: result.workUrl ?? null,
            clickup_task_id: result.clickupTaskId ?? null,
            clickup_task_url: result.clickupTaskUrl ?? null,
            error: result.error ?? null,
            delegated_at: result.status === 'delegated' ? now : null,
          },
          updated_at: now,
        },
      },
    },
    input.orgId,
  )
}
