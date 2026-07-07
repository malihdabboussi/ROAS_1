import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  FunnelHistoryRepository,
  type FunnelChangeItemInput,
  type FunnelChangeSetInput,
  type FunnelChangeSource,
} from '../repositories/funnel-history.repository'

type Snapshot = Record<string, unknown> | null

interface RecordFileChangeInput {
  funnelId: string
  funnelPageId: string | null
  userId: string
  orgId: string | null
  source: FunnelChangeSource
  action: string
  label?: string | null
  beforeSnapshot: Snapshot
  afterSnapshot: Snapshot
}

interface HistoryScope {
  funnelId: string
  funnelPageId?: string | null
  orgId?: string | null
}

const SNAPSHOT_COMPARE_KEYS = [
  'funnel_id',
  'funnel_page_id',
  'path',
  'content',
  'role',
  'mime_type',
  'size_bytes',
]

function normalizePageId(pageId: string | null | undefined): string | null {
  return typeof pageId === 'string' && pageId.trim() ? pageId.trim() : null
}

function snapshotsEqual(a: Snapshot, b: Snapshot): boolean {
  if (!a && !b) return true
  if (!a || !b) return false
  return SNAPSHOT_COMPARE_KEYS.every((key) => a[key] === b[key])
}

function fileOperation(beforeSnapshot: Snapshot, afterSnapshot: Snapshot) {
  if (!beforeSnapshot && afterSnapshot) return 'insert' as const
  if (beforeSnapshot && !afterSnapshot) return 'delete' as const
  return 'update' as const
}

@Injectable()
export class FunnelHistoryService {
  constructor(private readonly historyRepo: FunnelHistoryRepository) {}

  async getState(supabase: SupabaseClient, input: HistoryScope) {
    const scope = { funnelId: input.funnelId, funnelPageId: normalizePageId(input.funnelPageId) }
    const [undoCandidate, redoCandidate] = await Promise.all([
      this.historyRepo.findLatestApplied(supabase, scope),
      this.historyRepo.findLatestUndone(supabase, scope),
    ])
    return {
      can_undo: Boolean(undoCandidate),
      can_redo: Boolean(redoCandidate),
      undo_change_set_id: (undoCandidate as { id?: string } | null)?.id ?? null,
      redo_change_set_id: (redoCandidate as { id?: string } | null)?.id ?? null,
    }
  }

  async recordFileChange(supabase: SupabaseClient, input: RecordFileChangeInput) {
    if (snapshotsEqual(input.beforeSnapshot, input.afterSnapshot)) return null
    return this.recordChangeSet(supabase, {
      funnelId: input.funnelId,
      funnelPageId: normalizePageId(input.funnelPageId),
      userId: input.userId,
      orgId: input.orgId,
      source: input.source,
      action: input.action,
      label: input.label,
      items: [
        {
          entity_type: 'funnel_file',
          entity_id: String(input.afterSnapshot?.id ?? input.beforeSnapshot?.id ?? '') || null,
          path: String(input.afterSnapshot?.path ?? input.beforeSnapshot?.path ?? '') || null,
          operation: fileOperation(input.beforeSnapshot, input.afterSnapshot),
          before_snapshot: input.beforeSnapshot,
          after_snapshot: input.afterSnapshot,
          funnel_page_id: normalizePageId(
            (input.afterSnapshot?.funnel_page_id as string | null | undefined) ??
              (input.beforeSnapshot?.funnel_page_id as string | null | undefined) ??
              input.funnelPageId,
          ),
        },
      ],
    })
  }

  async recordChangeSet(supabase: SupabaseClient, input: FunnelChangeSetInput) {
    const items = input.items.filter(
      (item) => !snapshotsEqual(item.before_snapshot, item.after_snapshot),
    )
    if (items.length === 0) return null
    await this.historyRepo.supersedeRedo(supabase, {
      funnelId: input.funnelId,
      funnelPageId: normalizePageId(input.funnelPageId),
    })
    return this.historyRepo.createChangeSet(supabase, { ...input, items })
  }

  async undo(supabase: SupabaseClient, input: HistoryScope) {
    const scope = { funnelId: input.funnelId, funnelPageId: normalizePageId(input.funnelPageId) }
    const changeSet = (await this.historyRepo.findLatestApplied(supabase, scope)) as
      | { id: string }
      | null
    if (!changeSet) {
      return { success: true, changed: false, ...(await this.getState(supabase, input)) }
    }
    const items = (await this.historyRepo.listChangeItems(supabase, changeSet.id)) as Array<
      FunnelChangeItemInput & { funnel_page_id?: string | null }
    >
    await this.restoreItems(supabase, scope, items, 'before_snapshot')
    await this.historyRepo.markChangeSetStatus(supabase, changeSet.id, 'undone')
    return { success: true, changed: true, change_set_id: changeSet.id, ...(await this.getState(supabase, input)) }
  }

  async redo(supabase: SupabaseClient, input: HistoryScope) {
    const scope = { funnelId: input.funnelId, funnelPageId: normalizePageId(input.funnelPageId) }
    const changeSet = (await this.historyRepo.findLatestUndone(supabase, scope)) as
      | { id: string }
      | null
    if (!changeSet) {
      return { success: true, changed: false, ...(await this.getState(supabase, input)) }
    }
    const items = (await this.historyRepo.listChangeItems(supabase, changeSet.id)) as Array<
      FunnelChangeItemInput & { funnel_page_id?: string | null }
    >
    await this.restoreItems(supabase, scope, items, 'after_snapshot')
    await this.historyRepo.markChangeSetStatus(supabase, changeSet.id, 'applied')
    return { success: true, changed: true, change_set_id: changeSet.id, ...(await this.getState(supabase, input)) }
  }

  private async restoreItems(
    supabase: SupabaseClient,
    scope: { funnelId: string; funnelPageId: string | null },
    items: Array<FunnelChangeItemInput & { funnel_page_id?: string | null }>,
    snapshotKey: 'before_snapshot' | 'after_snapshot',
  ) {
    const pageIds = new Set<string>()
    for (const item of [...items].reverse()) {
      if (item.entity_type !== 'funnel_file') continue
      const snapshot = item[snapshotKey] as Snapshot
      const itemPageId = normalizePageId(
        (snapshot?.funnel_page_id as string | null | undefined) ?? item.funnel_page_id ?? null,
      )
      if (itemPageId) pageIds.add(itemPageId)
      else if (scope.funnelPageId) pageIds.add(scope.funnelPageId)
      await this.historyRepo.restoreFileSnapshot(supabase, {
        funnelId: scope.funnelId,
        funnelPageId: itemPageId,
        path: item.path,
        entityId: item.entity_id,
        snapshot,
      })
    }
    await this.historyRepo.touchPages(supabase, Array.from(pageIds))
  }
}
