import type { Space, SpaceItem } from '../types'
import { instantiateSpaceTemplate } from './space-templates.service'
import { createSpaceItem } from './spaces.service'

type DelegationDeskSchema = {
  delegation_desk?: boolean
}

export function findDelegationDesk(spaces: Space[]): Space | null {
  return (
    spaces.find(
      (space) => (space.schema as typeof space.schema & DelegationDeskSchema).delegation_desk,
    ) ?? null
  )
}

export async function ensureDelegationDesk(spaces: Space[]): Promise<{
  desk: Space
  createdDesk: boolean
}> {
  const existing = findDelegationDesk(spaces)
  if (existing) return { desk: existing, createdDesk: false }

  const desk = await instantiateSpaceTemplate('delegation-desk', {
    visibility: 'private',
    include_tasks: true,
    include_docs: true,
    include_channel: false,
    include_automations: true,
  })
  return { desk, createdDesk: true }
}

export async function captureDelegationThought(
  deskId: string,
  thought: string,
): Promise<SpaceItem> {
  const text = thought.trim()
  if (!text) throw new Error('Add something to the Delegation Desk.')

  return createSpaceItem(deskId, {
    title: text,
    description: text,
    status: 'inbox',
    priority: null,
    custom_data: {
      intake_type: 'work_item',
      dispatch_mode: 'review',
      delegation: {
        version: 1,
        mode: 'review',
        source: 'manual',
        captured_at: new Date().toISOString(),
      },
    },
  })
}
