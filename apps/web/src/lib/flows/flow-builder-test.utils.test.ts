import { describe, expect, it } from 'vitest'
import {
  buildFlowBuilderSampleTask,
  buildTriggerSampleOutputLines,
  filterSpaceItemsForTrigger,
  FLOW_BUILDER_SAMPLE_TASK_ID,
  isFlowBuilderSampleTask,
  previewAutomationActionOutput,
} from './flow-builder-test.utils'
import { buildFlowTestTemplateContext } from './flow-builder-test.utils'
import type { SpaceItem } from '@/lib/spaces/space-item-types'

const sampleItem = {
  id: 'task-1',
  space_id: 'space-1',
  org_id: 'org-1',
  user_id: 'user-1',
  title: 'Research brief',
  status: 'research',
  priority: 'high',
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
  is_private: false,
  share_link_enabled: false,
  share_token: null,
  sort_order: 0,
  custom_data: {},
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
} satisfies SpaceItem

describe('flow-builder-test.utils', () => {
  it('filters tasks by trigger status configuration', () => {
    const items = [
      sampleItem,
      { ...sampleItem, id: 'task-2', status: 'todo', title: 'Other' },
    ]
    expect(
      filterSpaceItemsForTrigger(items, { type: 'task_created', in_status: 'research' }),
    ).toHaveLength(1)
  })

  it('builds trigger sample output lines with task link', () => {
    const lines = buildTriggerSampleOutputLines({ item: sampleItem, spaceId: 'space-1' })
    expect(lines[0]?.href).toBe('/spaces/space-1/task-1')
  })

  it('builds a preview-only sample task when no real tasks exist', () => {
    const sample = buildFlowBuilderSampleTask({
      spaceId: 'space-1',
      trigger: { type: 'task_created', in_status: 'research' },
    })
    expect(sample.id).toBe(FLOW_BUILDER_SAMPLE_TASK_ID)
    expect(sample.status).toBe('research')
    expect(isFlowBuilderSampleTask(sample)).toBe(true)
  })

  it('omits task link for sample records', () => {
    const sample = buildFlowBuilderSampleTask({
      spaceId: 'space-1',
      trigger: { type: 'task_created' },
    })
    const lines = buildTriggerSampleOutputLines({ item: sample, spaceId: 'space-1' })
    expect(lines[0]?.href).toBeUndefined()
    expect(lines[3]?.value).toBe('Sample (preview only)')
  })

  it('previews send_to_agent prompt from sample task', () => {
    const ctx = buildFlowTestTemplateContext({
      item: sampleItem,
      spaceTitle: 'Marketing',
      roster: [],
      trigger: { type: 'task_created' },
    })
    const lines = previewAutomationActionOutput(
      {
        type: 'send_to_agent',
        agent_key: 'vibey',
        prompt_template: 'Use {{task.title}}',
      },
      ctx,
    )
    expect(lines[1]?.value).toBe('Use Research brief')
  })
})
