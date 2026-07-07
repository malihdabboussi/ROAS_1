import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ArtifactFunnelHistoryRepository } from '../repositories/artifact-funnel-history.repository'

type Snapshot = Record<string, unknown> | null
type Source = 'agent' | 'studio'
type Operation = 'insert' | 'update' | 'delete'

interface ChangeItem {
  entity_type: 'funnel_file'
  entity_id: string | null
  path: string | null
  operation: Operation
  before_snapshot: Snapshot
  after_snapshot: Snapshot
  funnel_page_id?: string | null
}

interface ChangeSetInput {
  funnel: Record<string, unknown>
  funnelPageId: string | null
  source?: Source
  action: string
  label?: string | null
  metadata?: Record<string, unknown>
  items: ChangeItem[]
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

function operationFor(beforeSnapshot: Snapshot, afterSnapshot: Snapshot): Operation {
  if (!beforeSnapshot && afterSnapshot) return 'insert'
  if (beforeSnapshot && !afterSnapshot) return 'delete'
  return 'update'
}

@Injectable()
export class ArtifactFunnelHistoryService {
  constructor(
    private readonly repository: ArtifactFunnelHistoryRepository = new ArtifactFunnelHistoryRepository(),
  ) {}

  async readFileSnapshot(
    supabase: SupabaseClient,
    input: { funnelId: string; funnelPageId: string | null; path: string },
  ): Promise<Snapshot> {
    const { data, error } = await this.repository.readFileSnapshot(supabase, input)
    if (error) throw error
    return data
  }

  buildFileItem(input: {
    beforeSnapshot: Snapshot
    afterSnapshot: Snapshot
    funnelPageId: string | null
  }): ChangeItem | null {
    if (snapshotsEqual(input.beforeSnapshot, input.afterSnapshot)) return null
    return {
      entity_type: 'funnel_file',
      entity_id: String(input.afterSnapshot?.id ?? input.beforeSnapshot?.id ?? '') || null,
      path: String(input.afterSnapshot?.path ?? input.beforeSnapshot?.path ?? '') || null,
      operation: operationFor(input.beforeSnapshot, input.afterSnapshot),
      before_snapshot: input.beforeSnapshot,
      after_snapshot: input.afterSnapshot,
      funnel_page_id: normalizePageId(
        (input.afterSnapshot?.funnel_page_id as string | null | undefined) ??
          (input.beforeSnapshot?.funnel_page_id as string | null | undefined) ??
          input.funnelPageId,
      ),
    }
  }

  async recordFileChange(
    supabase: SupabaseClient,
    input: Omit<ChangeSetInput, 'items'> & { beforeSnapshot: Snapshot; afterSnapshot: Snapshot },
  ) {
    const item = this.buildFileItem({
      beforeSnapshot: input.beforeSnapshot,
      afterSnapshot: input.afterSnapshot,
      funnelPageId: input.funnelPageId,
    })
    if (!item) return null
    return this.recordChangeSet(supabase, { ...input, items: [item] })
  }

  async recordChangeSet(supabase: SupabaseClient, input: ChangeSetInput) {
    const items = input.items.filter((item) => !snapshotsEqual(item.before_snapshot, item.after_snapshot))
    if (items.length === 0) return null

    await this.supersedeRedo(supabase, {
      funnelId: String(input.funnel.id),
      funnelPageId: normalizePageId(input.funnelPageId),
    })

    const { data: changeSet, error } = await this.repository.createChangeSet(supabase, {
      funnel_id: input.funnel.id,
      funnel_page_id: normalizePageId(input.funnelPageId),
      user_id: input.funnel.user_id,
      org_id: (input.funnel.org_id as string | null | undefined) ?? null,
      source: input.source ?? 'agent',
      action: input.action,
      label: input.label ?? null,
      status: 'applied',
      metadata: input.metadata ?? {},
    })
    if (error) throw error
    if (!changeSet?.id) throw new Error('Funnel change set was not created')

    const rows = items.map((item) => ({
      change_set_id: (changeSet as { id: string }).id,
      funnel_id: input.funnel.id,
      funnel_page_id: item.funnel_page_id ?? normalizePageId(input.funnelPageId),
      entity_type: item.entity_type,
      entity_id: item.entity_id,
      path: item.path,
      operation: item.operation,
      before_snapshot: item.before_snapshot,
      after_snapshot: item.after_snapshot,
    }))
    const { error: itemsError } = await this.repository.insertChangeItems(supabase, rows)
    if (itemsError) throw itemsError
    return changeSet
  }

  private async supersedeRedo(
    supabase: SupabaseClient,
    input: { funnelId: string; funnelPageId: string | null },
  ) {
    const { error } = await this.repository.supersedeRedo(supabase, input)
    if (error) throw error
  }
}
