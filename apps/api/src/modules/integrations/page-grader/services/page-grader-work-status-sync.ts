import { BadRequestException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { RequestScope } from '@vibey/api-shared'
import type { PageGraderAgencyWorkspaceService } from './page-grader-agency-workspace.service'
import type { MappedClientRow } from './page-grader-brain-sync.types'

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

export async function refreshPageGraderTaskMirror(input: {
  agencyWorkspace?: PageGraderAgencyWorkspaceService
  supabase: SupabaseClient
  mapped: MappedClientRow[]
  item: { user_id: unknown; org_id: unknown }
  clientId: string
  workId: string
  spaceItemId: string
}) {
  if (!input.agencyWorkspace) {
    throw new BadRequestException('Page Grader agency workspace sync is unavailable')
  }
  const owner =
    input.mapped.find(
      (row) =>
        row.userId === String(input.item.user_id) && row.orgId === (input.item.org_id ?? null),
    ) ?? input.mapped[0]
  if (!owner) throw new BadRequestException('Page Grader task owner is unavailable')
  const scope = {
    userId: owner.userId,
    orgId: owner.orgId,
    orgRole: owner.orgId ? ('owner' as const) : null,
  } as RequestScope
  await input.agencyWorkspace.getClient(input.supabase, owner.userId, scope, input.clientId, {
    sync: true,
  })
  await input.agencyWorkspace.getTaskDetail(
    input.supabase,
    owner.userId,
    scope,
    input.clientId,
    input.workId,
    input.spaceItemId,
  )
}
