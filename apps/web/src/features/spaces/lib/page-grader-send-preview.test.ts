import { describe, expect, it } from 'vitest'
import {
  buildPageGraderSendPreviews,
  resolvePageGraderAssigneeSuggestion,
  resolveSharedPageGraderDueDate,
} from './page-grader-send-preview'
import type { SpaceItem } from '../types'

function item(partial: Partial<SpaceItem> & Pick<SpaceItem, 'id' | 'title'>): SpaceItem {
  return {
    space_id: 's1',
    org_id: 'o1',
    user_id: 'u1',
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
    description: null,
    notes: null,
    doc_body: null,
    source: 'manual',
    linked_mission_id: null,
    form_id: null,
    task_execution_status: null,
    custom_data: {},
    created_at: '',
    updated_at: '',
    ...partial,
  } as SpaceItem
}

describe('page-grader-send-preview', () => {
  it('suggests assignee from Space human assignee email', () => {
    const id = resolvePageGraderAssigneeSuggestion({
      selectedItems: [
        item({
          id: 'i1',
          title: 'Slides',
          assignees: [{ type: 'human', id: 'user-1' }],
        }),
      ],
      roster: [
        {
          participant_id: 'p1',
          kind: 'human',
          org_id: null,
          user_id: 'user-1',
          agent_key: null,
          display_name: 'Nouman Raza',
          avatar_url: null,
          role_label: null,
          specialties: [],
          accepts_assignments: true,
          delegation_notes: null,
          timezone: null,
          working_hours: null,
          out_of_office_until: null,
          current_load: 0,
          is_ready: true,
          agent_level: null,
          org_role: null,
          email: 'nouman@roas.co',
          created_at: '',
          updated_at: null,
        },
      ],
      assignees: [{ id: 'pg-1', name: 'Nouman Raza', email: 'nouman@roas.co' }],
    })
    expect(id).toBe('pg-1')
  })

  it('suggests assignee from attendees label when no Space assignee', () => {
    const id = resolvePageGraderAssigneeSuggestion({
      selectedItems: [
        item({
          id: 'i1',
          title: 'Slides',
          custom_data: { attendees: ['att_nouman'] },
        }),
      ],
      roster: [],
      attendeesField: {
        id: 'attendees',
        name: 'Attendees',
        type: 'multi_select',
        options: [{ id: 'att_nouman', label: 'Nouman Raza' }],
      },
      assignees: [{ id: 'pg-1', name: 'Nouman Raza', email: 'nouman@roas.co' }],
    })
    expect(id).toBe('pg-1')
  })

  it('builds preview rows with title and description', () => {
    const rows = buildPageGraderSendPreviews(
      [
        item({
          id: 'i1',
          title: 'Update slides',
          notes: 'Add logo',
          due_date: '2026-07-20',
          priority: 'high',
        }),
      ],
      'Please prioritize',
    )
    expect(rows[0]?.title).toBe('Update slides')
    expect(rows[0]?.description).toContain('Add logo')
    expect(rows[0]?.description).toContain('Operator note: Please prioritize')
    expect(rows[0]?.dueDate).toBe('2026-07-20')
  })

  it('uses shared due date and preview override', () => {
    expect(
      resolveSharedPageGraderDueDate([
        item({ id: 'i1', title: 'A', due_date: '2026-07-20' }),
        item({ id: 'i2', title: 'B', due_date: '2026-07-20T12:00:00.000Z' }),
      ]),
    ).toBe('2026-07-20')
    expect(
      resolveSharedPageGraderDueDate([
        item({ id: 'i1', title: 'A', due_date: '2026-07-20' }),
        item({ id: 'i2', title: 'B', due_date: '2026-07-21' }),
      ]),
    ).toBe('')
    expect(
      buildPageGraderSendPreviews(
        [item({ id: 'i1', title: 'A', due_date: '2026-07-20' })],
        undefined,
        '2026-07-28',
      )[0]?.dueDate,
    ).toBe('2026-07-28')
  })
})
