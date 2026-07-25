import { describe, expect, it } from 'vitest'
import {
  detectProgramShareConflicts,
  type ProgramForCompat,
  type SpaceShareForCompat,
} from '../program-share-compat'

function program(partial: Partial<ProgramForCompat> & Pick<ProgramForCompat, 'id' | 'visibility'>) {
  return { name: 'Program', created_by: null, ...partial } as ProgramForCompat
}

describe('detectProgramShareConflicts', () => {
  const shares: SpaceShareForCompat[] = [
    { space_id: 's1', space_title: 'Locked space', user_id: 'u-outsider', campaign_id: 'c-locked' },
    { space_id: 's1', space_title: 'Locked space', user_id: 'u-acl', campaign_id: 'c-locked' },
    { space_id: 's2', space_title: 'Open space', user_id: 'u-outsider', campaign_id: 'c-open' },
    { space_id: 's3', space_title: 'No campaign', user_id: 'u-outsider', campaign_id: null },
  ]
  const programByCampaign = new Map<string, string | null>([
    ['c-locked', 'p-locked'],
    ['c-open', 'p-open'],
  ])
  const programsById = new Map<string, ProgramForCompat>([
    ['p-locked', program({ id: 'p-locked', visibility: 'private', created_by: 'owner-1' })],
    ['p-open', program({ id: 'p-open', visibility: 'workspace' })],
  ])

  it('flags shares whose program is private and the user has no ACL', () => {
    const conflicts = detectProgramShareConflicts({
      shares,
      programByCampaign,
      programsById,
      programAclUserIds: new Map([['p-locked', new Set(['u-acl'])]]),
      adminUserIds: new Set(),
    })
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0]).toMatchObject({
      space_id: 's1',
      user_id: 'u-outsider',
      program_id: 'p-locked',
      program_visibility: 'private',
    })
  })

  it('does not flag org admins, program owners, or workspace programs', () => {
    const conflicts = detectProgramShareConflicts({
      shares,
      programByCampaign,
      programsById,
      programAclUserIds: new Map(),
      adminUserIds: new Set(['u-outsider', 'u-acl']),
    })
    expect(conflicts).toHaveLength(0)
  })
})
