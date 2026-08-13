import { describe, expect, it } from 'vitest'
import type { SpaceItem } from '../../types'
import {
  canMergeMeetingSelection,
  meetingHasRecording,
  rankMergeSurvivorId,
} from '../meeting-merge'

function item(input: Pick<SpaceItem, 'id'> & Partial<SpaceItem>): SpaceItem {
  return {
    space_id: 'space-1',
    org_id: 'org-1',
    user_id: 'user-1',
    title: 'Meeting: sync',
    description: null,
    status: 'inbox',
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
    custom_data: { entry_type: 'call' },
    is_private: false,
    share_link_enabled: false,
    share_token: null,
    created_at: '2026-08-10T00:00:00.000Z',
    updated_at: '2026-08-10T00:00:00.000Z',
    ...input,
  }
}

describe('canMergeMeetingSelection', () => {
  it('requires at least two items', () => {
    expect(canMergeMeetingSelection([item({ id: 'a' })])).toBe(false)
  })

  it('accepts a selection where every item resolves to a call', () => {
    expect(
      canMergeMeetingSelection([
        item({ id: 'a' }),
        item({ id: 'b', custom_data: {}, source: 'fathom' }),
      ]),
    ).toBe(true)
  })

  it('rejects selections containing non-call items', () => {
    expect(
      canMergeMeetingSelection([
        item({ id: 'a' }),
        item({ id: 'b', title: 'Write proposal', custom_data: {} }),
      ]),
    ).toBe(false)
  })
})

describe('meetingHasRecording', () => {
  it('detects recording evidence in custom_data', () => {
    expect(meetingHasRecording(item({ id: 'a' }))).toBe(false)
    expect(
      meetingHasRecording(
        item({ id: 'b', custom_data: { entry_type: 'call', recording_url: 'https://r' } }),
      ),
    ).toBe(true)
    expect(
      meetingHasRecording(
        item({ id: 'c', custom_data: { entry_type: 'call', fathom_url: 'https://f' } }),
      ),
    ).toBe(true)
  })
})

describe('rankMergeSurvivorId', () => {
  it('prefers the item with a recording', () => {
    const survivor = rankMergeSurvivorId([
      item({ id: 'plain' }),
      item({ id: 'recorded', custom_data: { entry_type: 'call', recording_url: 'https://r' } }),
    ])
    expect(survivor).toBe('recorded')
  })

  it('falls back to the most-filled item when recordings tie', () => {
    const survivor = rankMergeSurvivorId([
      item({ id: 'sparse' }),
      item({
        id: 'filled',
        custom_data: {
          entry_type: 'call',
          attendees: ['Dylan'],
          summary: 'Recap',
          location: 'Zoom',
        },
      }),
    ])
    expect(survivor).toBe('filled')
  })

  it('breaks remaining ties by oldest created_at', () => {
    const survivor = rankMergeSurvivorId([
      item({ id: 'newer', created_at: '2026-08-12T00:00:00.000Z' }),
      item({ id: 'older', created_at: '2026-08-09T00:00:00.000Z' }),
    ])
    expect(survivor).toBe('older')
  })

  it('returns null for an empty selection', () => {
    expect(rankMergeSurvivorId([])).toBeNull()
  })
})
