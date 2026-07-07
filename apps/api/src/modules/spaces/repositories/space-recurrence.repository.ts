import { Injectable } from '@nestjs/common'
import { SupabaseServiceClient } from '@vibey/api-shared'

export type RecurringSpaceItemRow = {
  id: string
  space_id: string
  org_id: string
  user_id: string
  title: string
  status: string
  priority: string
  assignee_type: string
  assignee_id: string | null
  assignees: Array<{ type: 'human' | 'agent'; id: string }> | null
  start_date: string | null
  due_date: string | null
  description: string | null
  notes: string | null
  source: string
  sort_order: number
  linked_mission_id: string | null
  recurrence: unknown
  recurrence_parent_id: string | null
  updated_at: string | null
  custom_data: unknown
  parent_item_id: string | null
}

const RECURRENCE_ITEM_SELECT =
  'id,space_id,org_id,user_id,title,status,priority,assignee_type,assignee_id,assignees,start_date,due_date,description,notes,source,sort_order,linked_mission_id,recurrence,recurrence_parent_id,updated_at,custom_data,parent_item_id'

@Injectable()
export class SpaceRecurrenceRepository {
  constructor(private readonly svc: SupabaseServiceClient) {}

  async tryAcquireLock(): Promise<{ acquired: boolean; errorMessage: string | null }> {
    const { data, error } = await this.svc.client.rpc('try_acquire_space_items_recurrence_lock')
    return { acquired: !!data, errorMessage: error?.message ?? null }
  }

  async releaseLock(): Promise<string | null> {
    const { error } = await this.svc.client.rpc('release_space_items_recurrence_lock')
    return error?.message ?? null
  }

  async listRecurringItems(): Promise<{
    rows: RecurringSpaceItemRow[]
    errorMessage: string | null
  }> {
    const { data, error } = await this.svc.client
      .from('space_items')
      .select(RECURRENCE_ITEM_SELECT)
      .not('recurrence', 'is', null)
    return {
      rows: (data ?? []) as RecurringSpaceItemRow[],
      errorMessage: error?.message ?? null,
    }
  }

  async findMaterializedInstance(
    seriesParentId: string,
    dueDateIso: string,
  ): Promise<{ id: string } | null> {
    const { data } = await this.svc.client
      .from('space_items')
      .select('id')
      .eq('recurrence_parent_id', seriesParentId)
      .eq('due_date', dueDateIso)
      .limit(1)
      .maybeSingle()
    return (data ?? null) as { id: string } | null
  }

  async createMaterializedInstance(payload: Record<string, unknown>): Promise<string | null> {
    const { error } = await this.svc.client.from('space_items').insert(payload)
    return error?.message ?? null
  }

  async updateRecurringItem(
    itemId: string,
    patch: Record<string, unknown>,
  ): Promise<string | null> {
    const { error } = await this.svc.client.from('space_items').update(patch).eq('id', itemId)
    return error?.message ?? null
  }
}
