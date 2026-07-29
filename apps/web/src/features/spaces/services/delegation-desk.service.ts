import type { Space } from '../types'
import { instantiateSpaceTemplate } from './space-templates.service'

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
