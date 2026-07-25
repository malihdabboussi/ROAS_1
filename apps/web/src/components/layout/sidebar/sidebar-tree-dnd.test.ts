import { describe, expect, it } from 'vitest'
import { resolveSidebarDrop } from './sidebar-tree-dnd'

describe('resolveSidebarDrop', () => {
  it('moves a space into a different campaign', () => {
    expect(
      resolveSidebarDrop(
        { dndType: 'space', spaceId: 's1', campaignId: 'c1' },
        { dndType: 'campaign-drop', campaignId: 'c2' },
      ),
    ).toEqual({ kind: 'space', spaceId: 's1', toCampaignId: 'c2' })
  })

  it('ignores a space dropped on its own campaign', () => {
    expect(
      resolveSidebarDrop(
        { dndType: 'space', spaceId: 's1', campaignId: 'c1' },
        { dndType: 'campaign-drop', campaignId: 'c1' },
      ),
    ).toBeNull()
  })

  it('moves a campaign into a different program', () => {
    expect(
      resolveSidebarDrop(
        { dndType: 'campaign', campaignId: 'c1', programId: 'p1' },
        { dndType: 'program', programId: 'p2' },
      ),
    ).toEqual({ kind: 'campaign', campaignId: 'c1', toProgramId: 'p2' })
  })

  it('moves a campaign out to no program (ungrouped)', () => {
    expect(
      resolveSidebarDrop(
        { dndType: 'campaign', campaignId: 'c1', programId: 'p1' },
        { dndType: 'program', programId: null },
      ),
    ).toEqual({ kind: 'campaign', campaignId: 'c1', toProgramId: null })
  })

  it('ignores a campaign dropped on its current program', () => {
    expect(
      resolveSidebarDrop(
        { dndType: 'campaign', campaignId: 'c1', programId: 'p1' },
        { dndType: 'program', programId: 'p1' },
      ),
    ).toBeNull()
  })

  it('ignores cross-type or missing drops', () => {
    expect(
      resolveSidebarDrop(
        { dndType: 'space', spaceId: 's1', campaignId: 'c1' },
        { dndType: 'program', programId: 'p1' },
      ),
    ).toBeNull()
    expect(resolveSidebarDrop(null, { dndType: 'program', programId: 'p1' })).toBeNull()
    expect(
      resolveSidebarDrop({ dndType: 'campaign', campaignId: 'c1', programId: 'p1' }, undefined),
    ).toBeNull()
  })
})
