import { describe, expect, it } from 'vitest'
import {
  buildDocToolbarSearchHaystack,
  filterItemsByToolbarSearch,
} from '../apply-space-toolbar-filters'
import type { SpaceItem } from '../../types'

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
