import { describe, expect, it } from 'vitest'
import type { MissionDeliverable, MissionLog, MissionSubtask } from '../../types'
import {
  buildSubtaskScopedMessage,
  filterSubtaskDeliverables,
  filterSubtaskLogs,
  getSubtaskLiveOutput,
  getSubtaskLiveStatusLabel,
} from './subtask-detail'

const subtask = {
  id: 'subtask-1',
  title: 'Draft launch copy',
  deliverable_id: 'deliverable-1',
  output: {
    artifact_manifest: [{ deliverable_id: 'deliverable-2' }],
  },
} as unknown as MissionSubtask

describe('subtask detail helpers', () => {
  it('scopes guidance to the selected subtask', () => {
    expect(buildSubtaskScopedMessage(subtask, 'Tighten the opening.')).toBe(
      'Guidance for subtask "Draft launch copy" (subtask-1):\nTighten the opening.',
    )
  })

  it('filters activity and deliverables to the selected subtask', () => {
    const logs = [
      { id: 'direct', event_type: 'subtask.updated', payload: { subtask_id: 'subtask-1' } },
      {
        id: 'comment',
        event_type: 'user.comment',
        payload: { message: 'Guidance for Draft launch copy' },
      },
      { id: 'other', event_type: 'subtask.updated', payload: { subtask_id: 'subtask-2' } },
    ] as unknown as MissionLog[]
    const deliverables = [
      { id: 'deliverable-1' },
      { id: 'deliverable-2' },
      { id: 'deliverable-3' },
    ] as unknown as MissionDeliverable[]

    expect(filterSubtaskLogs(logs, subtask).map((log) => log.id)).toEqual(['direct', 'comment'])
    expect(filterSubtaskDeliverables(deliverables, subtask).map((item) => item.id)).toEqual([
      'deliverable-1',
      'deliverable-2',
    ])
  })

  it('includes all upstream deliverables when reviewing a human gate', () => {
    const subtasks = [
      {
        id: 'pre-call',
        title: 'Pre-call strategy',
        status: 'done',
        depends_on: [],
        deliverable_id: 'deliverable-pre-call',
      },
      {
        id: 'strategy-v2',
        title: 'Strategy v2',
        status: 'done',
        depends_on: ['pre-call'],
        deliverable_id: 'deliverable-strategy',
      },
      {
        id: 'gate-1',
        title: 'Approve strategy package',
        status: 'awaiting_human',
        assignee_type: 'human',
        depends_on: ['strategy-v2'],
        deliverable_id: null,
      },
    ] as unknown as MissionSubtask[]
    const deliverables = [
      { id: 'deliverable-pre-call' },
      { id: 'deliverable-strategy' },
      { id: 'unrelated' },
    ] as unknown as MissionDeliverable[]

    const gate = subtasks[2]
    expect(gate).toBeDefined()
    expect(filterSubtaskDeliverables(deliverables, gate!, subtasks).map((item) => item.id)).toEqual(
      ['deliverable-pre-call', 'deliverable-strategy'],
    )
  })

  it('shows an in-progress deliverable before final subtask linkage when its agent and title match', () => {
    const activeSubtask = {
      id: 'copy-package',
      title: 'Copy Package (roas-webinar-copy-package)',
      status: 'in_progress',
      assigned_agent_key: 'ivy',
      deliverable_id: null,
      output: {},
    } as unknown as MissionSubtask
    const deliverables = [
      { id: 'copy-doc', title: 'Copy Package', agent_key: 'ivy', metadata: {} },
      { id: 'other-doc', title: 'Landing Page', agent_key: 'ivy', metadata: {} },
      { id: 'wrong-agent', title: 'Copy Package', agent_key: 'blaze', metadata: {} },
    ] as unknown as MissionDeliverable[]

    expect(filterSubtaskDeliverables(deliverables, activeSubtask).map((item) => item.id)).toEqual([
      'copy-doc',
    ])
  })

  it('uses persisted partial output for live progress and labels saved work as finalizing', () => {
    const activeSubtask = {
      status: 'in_progress',
      execution_state: {
        execution_status: 'streaming',
        partial_output: 'Drafting the email sequence now.',
      },
    } as unknown as MissionSubtask

    expect(getSubtaskLiveOutput(activeSubtask)).toBe('Drafting the email sequence now.')
    expect(getSubtaskLiveStatusLabel(activeSubtask, false)).toBe('Working')
    expect(getSubtaskLiveStatusLabel(activeSubtask, true)).toBe('Finalizing')
  })
})
