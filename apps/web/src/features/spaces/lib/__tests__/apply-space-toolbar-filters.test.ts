import { describe, expect, it } from 'vitest'
import {
  applySpaceToolbarFilters,
  buildDocToolbarSearchHaystack,
  filterItemsByToolbarSearch,
  itemMatchesFieldValueFilters,
  resolveViewFieldValueFilters,
  viewPromotesFollowUpSubtasks,
} from '../apply-space-toolbar-filters'
import type { SpaceItem } from '../../types'
import type { ViewDef } from '../../types/space-schema'

function item(input: Pick<SpaceItem, 'id' | 'title'> & Partial<SpaceItem>): SpaceItem {
  return {
    space_id: 'space-1',
    org_id: 'org-1',
    user_id: 'user-1',
    description: null,
    status: 'todo',
    priority: null,
    assignee_type: 'unassigned',
    assignee_id: null,
    assignees: [],
    start_date: null,
    due_date: null,
    recurrence: null,
    parent_item_id: null,
    recurrence_parent_id: null,
    notes: null,
    doc_body: null,
    source: 'manual',
    linked_mission_id: null,
    form_id: null,
    task_execution_status: null,
    sort_order: 0,
    custom_data: { _view_type: 'doc' },
    is_private: false,
    share_link_enabled: false,
    share_token: null,
    created_at: '2026-06-24T00:00:00.000Z',
    updated_at: '2026-06-24T00:00:00.000Z',
    ...input,
  }
}

describe('docs toolbar search', () => {
  it('filters docs by visible title instead of broad document body text', () => {
    const docs = [
      item({
        id: 'doc-1',
        title: 'Hadash Cyprus - Longevity Department',
        doc_body: '<p>Services overview and operational notes.</p>',
      }),
      item({
        id: 'doc-2',
        title: 'Hadash Cyprus - Services & Treatments',
        doc_body: '<p>Clinical services and treatments.</p>',
      }),
    ]
    const haystacks = new Map(docs.map((doc) => [doc.id, buildDocToolbarSearchHaystack(doc)]))

    const matches = filterItemsByToolbarSearch(docs, 'services', haystacks)

    expect(matches.map((doc) => doc.id)).toEqual(['doc-2'])
  })
})

describe('field_value_filters', () => {
  it('keeps All Meetings to calls only and Action items to follow-ups only', () => {
    const callLegacy = item({
      id: 'call-1',
      title: 'Legacy call',
      custom_data: { recording_url: 'https://fathom.video/x' },
    })
    const callTagged = item({
      id: 'call-2',
      title: 'Tagged call',
      custom_data: { entry_type: 'call' },
    })
    const callByTitle = item({
      id: 'call-3',
      title: 'Meeting: ROAS - Yasir Khan',
      source: 'fathom',
      custom_data: {},
    })
    const followUp = item({
      id: 'fu-1',
      title: 'Send recap',
      custom_data: { entry_type: 'follow_up' },
    })
    const bareTask = item({
      id: 'bare-1',
      title: 'Random todo',
      source: 'manual',
      custom_data: {},
    })

    expect(itemMatchesFieldValueFilters(callLegacy, { entry_type: 'call' })).toBe(true)
    expect(itemMatchesFieldValueFilters(callTagged, { entry_type: 'call' })).toBe(true)
    expect(itemMatchesFieldValueFilters(followUp, { entry_type: 'call' })).toBe(false)
    expect(itemMatchesFieldValueFilters(bareTask, { entry_type: 'call' })).toBe(false)
    expect(itemMatchesFieldValueFilters(followUp, { entry_type: 'follow_up' })).toBe(true)
    expect(itemMatchesFieldValueFilters(callByTitle, { entry_type: 'follow_up' })).toBe(false)

    const allMeetings = {
      id: 'all-meetings',
      type: 'list',
      name: 'All Meetings',
      show_closed_tasks: true,
      // filters omitted — view id fallback must still apply
    } as ViewDef
    expect(resolveViewFieldValueFilters(allMeetings)).toEqual({ entry_type: 'call' })
    const meetingsOnly = applySpaceToolbarFilters(
      [callLegacy, callTagged, callByTitle, followUp, bareTask],
      allMeetings,
      undefined,
      [],
      null,
      '',
    )
    expect(meetingsOnly.map((row) => row.id)).toEqual(['call-1', 'call-2', 'call-3'])

    const nestedFollowUp = item({
      id: 'fu-nested',
      title: 'Nested action',
      parent_item_id: 'call-2',
      custom_data: { entry_type: 'follow_up', source_call_item_id: 'call-2' },
    })
    const orphanFollowUp = item({
      id: 'fu-orphan',
      title: 'Orphan action',
      custom_data: { entry_type: 'follow_up', source_call_item_id: 'missing' },
    })
    const withNested = applySpaceToolbarFilters(
      [callTagged, nestedFollowUp, orphanFollowUp, followUp],
      allMeetings,
      undefined,
      [],
      null,
      '',
    )
    expect(withNested.map((row) => row.id)).toEqual(['call-2', 'fu-nested'])

    const actionItems = {
      id: 'action-items',
      type: 'list',
      name: 'Action items',
      field_value_filters: { entry_type: 'follow_up' },
      show_closed_tasks: true,
    } as ViewDef
    expect(viewPromotesFollowUpSubtasks(actionItems)).toBe(true)
    expect(viewPromotesFollowUpSubtasks(allMeetings)).toBe(false)
    const filtered = applySpaceToolbarFilters(
      [callLegacy, callTagged, callByTitle, followUp, bareTask],
      actionItems,
      undefined,
      [],
      null,
      '',
    )
    expect(filtered.map((row) => row.id)).toEqual(['fu-1'])
  })
})
