import { Injectable, Optional } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { UndoAgentTaskEditsDto } from '../dto'
import { SpacesUndoRepository, type UndoActivityRow } from '../repositories/spaces-undo.repository'
import { SpacePermissionsService } from './space-permissions.service'

type ActivityRow = UndoActivityRow

type UndoSkip = {
  activity_id: string
  item_id: string
  field?: string
  reason: 'already_applied' | 'missing_item' | 'superseded' | 'has_children' | 'snapshot_missing'
}

const TOP_LEVEL_FIELDS = new Set([
  'title',
  'status',
  'priority',
  'assignee_type',
  'assignee_id',
  'assignees',
  'start_date',
  'due_date',
  'sort_order',
  'parent_item_id',
  'description',
  'notes',
  'recurrence',
  'linked_mission_id',
])

function sameValue(a: unknown, b: unknown): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
}

/** Status is stored as string; activity payloads may use '' while reads use null. */
function statusValuesMatch(itemStatus: unknown, expected: unknown): boolean {
  const a = itemStatus == null || itemStatus === '' ? '' : String(itemStatus)
  const b = expected == null || expected === '' ? '' : String(expected)
  return a === b
}

function snapshotFromActivity(row: ActivityRow): Record<string, unknown> | null {
  if (row.snapshot && typeof row.snapshot === 'object' && !Array.isArray(row.snapshot)) {
    return row.snapshot
  }
  const payloadSnapshot = row.payload?.snapshot
  if (payloadSnapshot && typeof payloadSnapshot === 'object' && !Array.isArray(payloadSnapshot)) {
    return payloadSnapshot as Record<string, unknown>
  }
  return null
}

function assigneePatch(value: unknown): Record<string, unknown> {
  const fromList = Array.isArray(value)
    ? value
    : value && typeof value === 'object' && !Array.isArray(value)
      ? Array.isArray((value as Record<string, unknown>).assignees)
        ? ((value as Record<string, unknown>).assignees as unknown[])
        : [value as Record<string, unknown>]
      : []
  const first =
    fromList.find(
      (entry): entry is Record<string, unknown> =>
        !!entry && typeof entry === 'object' && !Array.isArray(entry),
    ) ?? null
  const type = first?.type === 'human' || first?.type === 'agent' ? first.type : 'unassigned'
  const id = type === 'unassigned' ? null : String(first?.id ?? '')
  return {
    assignees: type === 'unassigned' || !id ? [] : [{ type, id }],
    assignee_type: type,
    assignee_id: type === 'unassigned' || !id ? null : id,
  }
}

@Injectable()
export class SpacesUndoService {
  constructor(
    private readonly permissions: SpacePermissionsService,
    @Optional()
    private readonly repo: SpacesUndoRepository = new SpacesUndoRepository(),
  ) {}

  async undoAgentTaskEdits(
    supabase: SupabaseClient,
    userId: string,
    spaceId: string,
    dto: UndoAgentTaskEditsDto,
    orgId?: string | null,
    orgRole?: import('@vibey/api-shared').OrgRole | null,
  ) {
    await this.permissions.assertCanAccessSpace(supabase, userId, orgRole, spaceId, 'edit', orgId)

    const rawRows = await this.repo.listAgentActivityRows(
      supabase,
      spaceId,
      dto.agent_message_id,
      dto.direction === 'redo',
    )
    const rows = rawRows.filter((row) =>
      dto.direction === 'undo' ? row.reverted_at == null : row.reverted_at != null,
    )
    if (rows.length === 0) {
      return { success: true, direction: dto.direction, undone: 0, skipped: [], items: [] }
    }

    const skipped: UndoSkip[] = []
    const touchedIds = new Set<string>()

    for (const row of rows) {
      const result = await this.applyActivity(supabase, userId, row, dto, skipped)
      if (result) touchedIds.add(result)
    }

    const items =
      touchedIds.size > 0 ? await this.repo.loadItems(supabase, spaceId, [...touchedIds]) : []

    const undone = rows.length - skipped.length

    return {
      success: true,
      direction: dto.direction,
      undone,
      skipped,
      items,
    }
  }

  private async applyActivity(
    supabase: SupabaseClient,
    userId: string,
    row: ActivityRow,
    dto: UndoAgentTaskEditsDto,
    skipped: UndoSkip[],
  ): Promise<string | null> {
    if (row.event_type === 'created') {
      return this.applyCreatedActivity(supabase, userId, row, dto, skipped)
    }
    if (row.event_type === 'deleted') {
      return this.applyDeletedActivity(supabase, userId, row, dto, skipped)
    }

    const item = await this.repo.loadItem(supabase, row.space_id, row.item_id)
    if (!item) {
      skipped.push({ activity_id: row.id, item_id: row.item_id, reason: 'missing_item' })
      return null
    }

    let patch = this.patchForActivity(row, dto.direction)
    if (!patch) return null
    if (
      patch.custom_data &&
      typeof patch.custom_data === 'object' &&
      !Array.isArray(patch.custom_data)
    ) {
      patch = {
        ...patch,
        custom_data: {
          ...((item.custom_data ?? {}) as Record<string, unknown>),
          ...(patch.custom_data as Record<string, unknown>),
        },
      }
    }

    const expected = this.expectedForActivity(row, dto.direction)
    if (dto.mode === 'strict' && expected && !this.itemMatches(item, expected)) {
      skipped.push({
        activity_id: row.id,
        item_id: row.item_id,
        field: expected.field,
        reason: 'superseded',
      })
      return null
    }

    const updated = await this.repo.updateItem(supabase, row.space_id, row.item_id, patch)
    await this.markActivity(supabase, userId, row, dto.direction, patch)
    return String(updated.id)
  }

  private async applyCreatedActivity(
    supabase: SupabaseClient,
    userId: string,
    row: ActivityRow,
    dto: UndoAgentTaskEditsDto,
    skipped: UndoSkip[],
  ): Promise<string | null> {
    if (dto.direction === 'undo') {
      const existing = await this.repo.loadItem(supabase, row.space_id, row.item_id)
      if (!existing) {
        skipped.push({ activity_id: row.id, item_id: row.item_id, reason: 'already_applied' })
        await this.setRevertedState(supabase, row, true)
        return null
      }
      if (await this.repo.hasChildren(supabase, row.item_id)) {
        skipped.push({ activity_id: row.id, item_id: row.item_id, reason: 'has_children' })
        return null
      }
      await this.repo.deleteItem(supabase, row.space_id, row.item_id)
      await this.markActivity(supabase, userId, row, dto.direction, {
        deleted_item_id: row.item_id,
      })
      return row.item_id
    }

    const snapshot = snapshotFromActivity(row)
    if (!snapshot) {
      skipped.push({ activity_id: row.id, item_id: row.item_id, reason: 'snapshot_missing' })
      return null
    }
    const existing = await this.repo.loadItem(supabase, row.space_id, row.item_id)
    if (!existing) {
      await this.repo.createItemFromSnapshot(supabase, snapshot)
    }
    await this.markActivity(supabase, userId, row, dto.direction, { restored_item_id: row.item_id })
    return row.item_id
  }

  private async applyDeletedActivity(
    supabase: SupabaseClient,
    userId: string,
    row: ActivityRow,
    dto: UndoAgentTaskEditsDto,
    skipped: UndoSkip[],
  ): Promise<string | null> {
    if (dto.direction === 'undo') {
      const snapshot = snapshotFromActivity(row)
      if (!snapshot) {
        skipped.push({ activity_id: row.id, item_id: row.item_id, reason: 'snapshot_missing' })
        return null
      }
      const existing = await this.repo.loadItem(supabase, row.space_id, row.item_id)
      if (!existing) {
        await this.repo.createItemFromSnapshot(supabase, snapshot)
      }
      await this.markActivity(supabase, userId, row, dto.direction, {
        restored_item_id: row.item_id,
      })
      return row.item_id
    }

    const existing = await this.repo.loadItem(supabase, row.space_id, row.item_id)
    if (!existing) {
      await this.setRevertedState(supabase, row, false)
      skipped.push({ activity_id: row.id, item_id: row.item_id, reason: 'already_applied' })
      return null
    }
    if (await this.repo.hasChildren(supabase, row.item_id)) {
      skipped.push({ activity_id: row.id, item_id: row.item_id, reason: 'has_children' })
      return null
    }
    await this.repo.deleteItem(supabase, row.space_id, row.item_id)
    await this.markActivity(supabase, userId, row, dto.direction, { deleted_item_id: row.item_id })
    return row.item_id
  }

  private patchForActivity(
    row: ActivityRow,
    direction: 'undo' | 'redo',
  ): Record<string, unknown> | null {
    const payload = row.payload ?? {}
    const value = direction === 'undo' ? payload.from : payload.to

    if (row.event_type === 'status_change') return { status: value }
    if (row.event_type === 'assignee_change') return assigneePatch(value)
    if (row.event_type !== 'field_change') return null

    const field = String(payload.field ?? '')
    if (!field) return null
    if (TOP_LEVEL_FIELDS.has(field)) return { [field]: value }
    return { custom_data: { [field]: value } }
  }

  private expectedForActivity(
    row: ActivityRow,
    direction: 'undo' | 'redo',
  ): { field: string; value: unknown; custom: boolean } | null {
    const payload = row.payload ?? {}
    const value = direction === 'undo' ? payload.to : payload.from
    if (row.event_type === 'status_change') return { field: 'status', value, custom: false }
    if (row.event_type === 'assignee_change') return { field: 'assignees', value, custom: false }
    if (row.event_type !== 'field_change') return null
    const field = String(payload.field ?? '')
    if (!field) return null
    return { field, value, custom: !TOP_LEVEL_FIELDS.has(field) }
  }

  private itemMatches(
    item: Record<string, unknown>,
    expected: { field: string; value: unknown; custom: boolean },
  ): boolean {
    if (expected.field === 'assignees') {
      const patch = assigneePatch(expected.value)
      return (
        sameValue(item.assignees ?? [], patch.assignees) &&
        sameValue(item.assignee_type, patch.assignee_type) &&
        sameValue(item.assignee_id, patch.assignee_id)
      )
    }
    if (!expected.custom) {
      if (expected.field === 'status') {
        return statusValuesMatch(item[expected.field], expected.value)
      }
      return sameValue(item[expected.field], expected.value)
    }
    const custom = (item.custom_data ?? {}) as Record<string, unknown>
    return sameValue(custom[expected.field], expected.value)
  }

  private async markActivity(
    supabase: SupabaseClient,
    userId: string,
    row: ActivityRow,
    direction: 'undo' | 'redo',
    payload: Record<string, unknown>,
  ) {
    const activity = await this.repo.createUndoActivity(supabase, {
      item_id: row.item_id,
      space_id: row.space_id,
      user_id: userId,
      org_id: row.org_id,
      actor_kind: 'user',
      event_type: row.event_type === 'status_change' ? 'status_change' : 'field_change',
      payload: {
        ...payload,
        [direction === 'undo' ? 'undo_of' : 'redo_of']: row.id,
        agent_message_id: row.agent_message_id,
      },
    })

    await this.repo.setActivityRevertedState(supabase, row.id, {
      reverted_at: direction === 'undo' ? new Date().toISOString() : null,
      reverted_by_activity_id: direction === 'undo' ? activity.id : null,
    })
  }

  private async setRevertedState(
    supabase: SupabaseClient,
    row: ActivityRow,
    reverted: boolean,
  ): Promise<void> {
    await this.repo.setActivityRevertedState(supabase, row.id, {
      reverted_at: reverted ? new Date().toISOString() : null,
      reverted_by_activity_id: null,
    })
  }
}
