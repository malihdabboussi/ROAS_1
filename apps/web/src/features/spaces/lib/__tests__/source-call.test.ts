import { describe, expect, it } from 'vitest'
import { cleanMeetingTitle, readSourceCallMeta } from '../source-call'
import type { SpaceItem } from '../../types'

function item(partial: Partial<SpaceItem> & Pick<SpaceItem, 'id' | 'title'>): SpaceItem {
  return {
    space_id: 's1',
    org_id: null,
    user_id: 'u1',
    description: null,
    status: 'logged',
    priority: 'medium',
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
    source: 'agent_suggested',
    linked_mission_id: null,
    form_id: null,
    task_execution_status: null,
    sort_order: 0,
    custom_data: {},
    is_private: false,
    share_link_enabled: false,
    share_token: null,
    created_at: '2026-07-15T00:00:00.000Z',
    updated_at: '2026-07-15T00:00:00.000Z',
    ...partial,
  }
}

describe('source-call', () => {
  it('cleans Fathom meeting title prefixes', () => {
    expect(cleanMeetingTitle('Fathom meeting: Sales call')).toBe('Sales call')
    expect(cleanMeetingTitle('Meeting: Weekly')).toBe('Weekly')
  })

  it('reads denormalized source call and falls back to suggestion_origin', () => {
    const direct = item({
      id: 'fu-1',
      title: 'Send recap',
      custom_data: {
        source_call: 'ROAS - Yasir Khan',
        source_call_item_id: 'call-1',
      },
    })
    expect(readSourceCallMeta(direct)).toEqual({
      itemId: 'call-1',
      title: 'ROAS - Yasir Khan',
    })

    const viaOrigin = item({
      id: 'fu-2',
      title: 'Draft proposal',
      custom_data: {
        suggestion_origin: { rule_trigger_item_id: 'call-9' },
      },
    })
    expect(readSourceCallMeta(viaOrigin, 'Custom label')).toEqual({
      itemId: 'call-9',
      title: 'Custom label',
    })
  })
})
