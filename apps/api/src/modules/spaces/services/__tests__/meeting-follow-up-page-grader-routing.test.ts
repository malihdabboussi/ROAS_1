import { describe, expect, it } from 'vitest'
import {
  resolvePageGraderAssigneeForFollowUp,
  resolvePageGraderClientForFollowUp,
} from '../meeting-follow-up-page-grader-routing'

const clients = [
  { id: 'christian', name: 'Multifamily Strategy - Christian Osgood' },
  { id: 'adam', name: 'Adam Lamb' },
  { id: 'assura', name: 'Assura Group' },
]

describe('meeting follow-up Page Grader routing', () => {
  it('uses a unique client name in the action item before the meeting scope', () => {
    expect(
      resolvePageGraderClientForFollowUp({
        item: { title: 'Review Christian ad rejections' },
        clients,
        scopeMap: { adam: { campaign_id: 'campaign-adam', space_id: 'space-1' } },
        spaceId: 'space-1',
      }),
    ).toEqual(clients[0])
  })

  it('falls back to the mapped space when no client name is present', () => {
    expect(
      resolvePageGraderClientForFollowUp({
        item: { title: 'Reformat webinar page and move timer down' },
        clients,
        scopeMap: { adam: { campaign_id: 'campaign-adam', space_id: 'space-1' } },
        spaceId: 'space-1',
      }),
    ).toEqual(clients[1])
  })

  it('does not guess when a distinctive client token is ambiguous', () => {
    expect(
      resolvePageGraderClientForFollowUp({
        item: { title: 'Update the strategy page' },
        clients: [
          { id: 'one', name: 'North Strategy' },
          { id: 'two', name: 'South Strategy' },
        ],
        scopeMap: {},
        spaceId: 'space-1',
      }),
    ).toBeNull()
  })

  it('resolves an exact or uniquely matching assignee name', () => {
    const assignees = [
      { id: 'nefi', name: 'Nefi Blanco', email: 'nefi@example.com' },
      { id: 'james', name: 'James Smith', email: 'james@example.com' },
    ]
    expect(resolvePageGraderAssigneeForFollowUp('Nefi Blanco', assignees)).toEqual(assignees[0])
    expect(resolvePageGraderAssigneeForFollowUp('James', assignees)).toEqual(assignees[1])
  })
})
