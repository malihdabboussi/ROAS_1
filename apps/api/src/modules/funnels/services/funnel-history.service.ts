import { Injectable, NotFoundException } from '@nestjs/common'
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

interface RestoreHistoryScope extends HistoryScope {
  changeSetId: string
}

interface BookmarkHistoryInput {
  funnelId: string
  changeSetId: string
  bookmarked: boolean
}

export interface RestorableChangeSet {
  id: string
  status: 'applied' | 'undone'
  source: FunnelChangeSource
  action: string
  label: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  is_bookmarked?: boolean
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
      this.historyRepo.findNextUndone(supabase, scope),
    ])
    return {
      can_undo: Boolean(undoCandidate),
      can_redo: Boolean(redoCandidate),
      undo_change_set_id: (undoCandidate as { id?: string } | null)?.id ?? null,
      redo_change_set_id: (redoCandidate as { id?: string } | null)?.id ?? null,
    }
  }

  async listHistory(supabase: SupabaseClient, input: HistoryScope) {
    const scope = { funnelId: input.funnelId, funnelPageId: normalizePageId(input.funnelPageId) }
    const entries = (await this.historyRepo.listRestorableChangeSets(supabase, {
      ...scope,
      ascending: false,
      limit: 50,
    })) as RestorableChangeSet[]
    return {
      entries,
      current_change_set_id: entries.find((entry) => entry.status === 'applied')?.id ?? null,
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
    const changeSet = (await this.historyRepo.findLatestApplied(supabase, scope)) as {
      id: string
    } | null
    if (!changeSet) {
      return { success: true, changed: false, ...(await this.getState(supabase, input)) }
    }
    await this.applyChangeSet(supabase, scope, changeSet.id, 'before_snapshot', 'undone')
    return {
      success: true,
      changed: true,
      change_set_id: changeSet.id,
      ...(await this.getState(supabase, input)),
    }
  }

  async redo(supabase: SupabaseClient, input: HistoryScope) {
    const scope = { funnelId: input.funnelId, funnelPageId: normalizePageId(input.funnelPageId) }
    const changeSet = (await this.historyRepo.findNextUndone(supabase, scope)) as {
      id: string
    } | null
    if (!changeSet) {
      return { success: true, changed: false, ...(await this.getState(supabase, input)) }
    }
    await this.applyChangeSet(supabase, scope, changeSet.id, 'after_snapshot', 'applied')
    return {
      success: true,
      changed: true,
      change_set_id: changeSet.id,
      ...(await this.getState(supabase, input)),
    }
  }

  async restore(supabase: SupabaseClient, input: RestoreHistoryScope) {
    const scope = { funnelId: input.funnelId, funnelPageId: normalizePageId(input.funnelPageId) }
    const entries = (await this.historyRepo.listRestorableChangeSets(supabase, {
      ...scope,
      ascending: true,
    })) as RestorableChangeSet[]
    const targetIndex = entries.findIndex((entry) => entry.id === input.changeSetId)
    if (targetIndex === -1) throw new NotFoundException('Funnel version not found')

    const target = entries[targetIndex]!
    const changes =
      target.status === 'applied'
        ? entries
            .slice(targetIndex + 1)
            .filter((entry) => entry.status === 'applied')
            .reverse()
            .map((entry) => ({
              ...entry,
              snapshotKey: 'before_snapshot' as const,
              status: 'undone' as const,
            }))
        : entries
            .slice(0, targetIndex + 1)
            .filter((entry) => entry.status === 'undone')
            .map((entry) => ({
              ...entry,
              snapshotKey: 'after_snapshot' as const,
              status: 'applied' as const,
            }))

    for (const change of changes) {
      await this.applyChangeSet(supabase, scope, change.id, change.snapshotKey, change.status)
    }

    return {
      success: true,
      changed: changes.length > 0,
      restored_change_set_id: target.id,
      ...(await this.getState(supabase, input)),
    }
  }

  async setBookmark(supabase: SupabaseClient, input: BookmarkHistoryInput) {
    const changeSet = await this.historyRepo.setBookmarked(supabase, input)
    if (!changeSet) throw new NotFoundException('Funnel version not found')
    return {
      success: true,
      change_set_id: input.changeSetId,
      bookmarked: input.bookmarked,
    }
  }

  private async applyChangeSet(
    supabase: SupabaseClient,
    scope: { funnelId: string; funnelPageId: string | null },
    changeSetId: string,
    snapshotKey: 'before_snapshot' | 'after_snapshot',
    status: 'applied' | 'undone',
  ) {
    const items = (await this.historyRepo.listChangeItems(supabase, changeSetId)) as Array<
      FunnelChangeItemInput & { funnel_page_id?: string | null }
    >
    await this.restoreItems(supabase, scope, items, snapshotKey)
    await this.historyRepo.markChangeSetStatus(supabase, changeSetId, status)
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
