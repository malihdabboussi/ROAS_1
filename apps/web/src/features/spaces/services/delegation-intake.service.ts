import type { Space, SpaceItem } from '../types'
import { ensureDelegationDesk } from './delegation-desk.service'
import { createSpaceItem } from './spaces.service'

export type DelegationDispatchMode = 'batch' | 'review' | 'urgent'

export type DelegationIntakeInput = {
  spaces: Space[]
  sourceSpaceId: string
  sourceSpaceTitle: string
  selectedItems: SpaceItem[]
  mode: DelegationDispatchMode
  note?: string
}

export async function createDelegationIntake(input: DelegationIntakeInput): Promise<{
  deskId: string
  intakeItemId: string
  createdDesk: boolean
}> {
  if (input.selectedItems.length === 0) {
    throw new Error('Select at least one task to delegate.')
  }
  if (input.selectedItems.length > 50) {
    throw new Error('Delegate up to 50 tasks at a time.')
  }

  const persistedItems = input.selectedItems.filter(
    (item) => !item.id.startsWith('temp:') && !item.id.startsWith('cdoc:'),
  )
  if (persistedItems.length !== input.selectedItems.length) {
    throw new Error('Wait for the selected tasks to finish saving, then delegate them.')
  }

  const { desk, createdDesk } = await ensureDelegationDesk(input.spaces)
  const sourceItems = [...persistedItems]
    .map((item) => ({ id: item.id, title: item.title }))
    .sort((left, right) => left.id.localeCompare(right.id))
  const sourceItemIds = sourceItems.map((item) => item.id)
  const itemCount = sourceItems.length
  const firstTitle = persistedItems[0]?.title ?? 'Selected work'
  const title =
    itemCount === 1 ? firstTitle : `${input.sourceSpaceTitle} work group — ${itemCount} items`
  const note = input.note?.trim() ?? ''

  const intake = await createSpaceItem(desk.id, {
    title,
    status: 'inbox',
    priority: input.mode === 'urgent' ? 'urgent' : 'high',
    description:
      note || `Consolidate and route ${itemCount} selected task${itemCount === 1 ? '' : 's'}.`,
    custom_data: {
      intake_type: itemCount === 1 ? 'work_item' : 'work_group',
      dispatch_mode: input.mode,
      delegation: {
        version: 1,
        mode: input.mode,
        source_space_id: input.sourceSpaceId,
        source_space_title: input.sourceSpaceTitle,
        source_item_ids: sourceItemIds,
        source_items: sourceItems,
        source_fingerprint: `${input.sourceSpaceId}:${sourceItemIds.join(',')}`,
        note,
        captured_at: new Date().toISOString(),
      },
    },
  })

  return {
    deskId: desk.id,
    intakeItemId: intake.id,
    createdDesk,
  }
}
