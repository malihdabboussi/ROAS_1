import { describe, expect, it } from 'vitest'
import type { MissionDeliverable, MissionLog, MissionSubtask } from '../../types'
import {
  buildSubtaskScopedMessage,
  filterMissionDeliverables,
  filterSubtaskDeliverables,
  filterSubtaskLogs,
  numberDeliverablesByTask,
  resolveSubtaskOutputDisplay,
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

  it('keeps work visible when an execution receipt links it before final completion', () => {
    const blockedSubtask = {
      id: 'static-ads',
      title: 'Static ads (roas-ad-design)',
      status: 'blocked',
      assigned_agent_key: 'blaze',
      deliverable_id: null,
      output: { kind: 'blocked' },
      execution_state: {
        completed_actions: [
          {
            action: 'campaign_capability',
            result_summary: JSON.stringify({
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: true,
                    deliverable_id: 'static-ads-draft',
                  }),
                },
              ],
            }),
          },
        ],
      },
    } as unknown as MissionSubtask
    const deliverables = [
      { id: 'static-ads-draft', title: 'Static Ads — Impact Elite Coaching', metadata: {} },
      { id: 'unrelated', title: 'Other work', metadata: {} },
    ] as unknown as MissionDeliverable[]

    expect(filterSubtaskDeliverables(deliverables, blockedSubtask).map((item) => item.id)).toEqual([
      'static-ads-draft',
    ])
  })

  it('numbers deliverables by their non-human task order', () => {
    const subtasks = [
      {
        id: 'strategy',
        assignee_type: 'agent',
        sort_order: 1,
        deliverable_id: 'strategy-doc',
        output: { artifact_manifest: [{ deliverable_id: 'strategy-pdf' }] },
        execution_state: {},
      },
      {
        id: 'gate',
        assignee_type: 'human',
        sort_order: 2,
        deliverable_id: null,
        output: {},
        execution_state: {},
      },
      {
        id: 'static-ads',
        assignee_type: 'agent',
        sort_order: 3,
        deliverable_id: null,
        output: {},
        execution_state: {
          completed_actions: [{ deliverable_id: 'static-ads-draft' }],
        },
      },
    ] as unknown as MissionSubtask[]
    const deliverables = [
      { id: 'static-ads-draft', title: 'Static Ads — Impact Elite Coaching', metadata: {} },
      { id: 'strategy-pdf', title: 'Strategy v2', metadata: {} },
      { id: 'strategy-doc', title: 'Task 99 — Strategy v2', metadata: {} },
    ] as unknown as MissionDeliverable[]

    expect(numberDeliverablesByTask(deliverables, subtasks).map((item) => item.title)).toEqual([
      'Task 2 — Static Ads — Impact Elite Coaching',
      'Task 1 — Strategy v2',
      'Task 1 — Strategy v2',
    ])
  })

  it('links every artifact in a multi-output task when manifests contain entity ids', () => {
    const subtasks = [
      {
        id: 'static-ads',
        title: 'Task 8A — Static Meta ads',
        assignee_type: 'agent',
        sort_order: 10,
        deliverable_id: 'deliverable-last',
        output: {
          artifact_manifest: [
            { deliverable_id: 'ad-entity-1' },
            { deliverable_id: 'ad-entity-2' },
            { deliverable_id: 'ad-entity-3' },
          ],
        },
        execution_state: {},
      },
    ] as unknown as MissionSubtask[]
    const deliverables = [
      { id: 'deliverable-1', entity_id: 'ad-entity-1', title: 'Ad one', metadata: {} },
      {
        id: 'deliverable-2',
        entity_id: 'ad-entity-2',
        title: 'Task 8A — Ad two',
        metadata: {},
      },
      { id: 'deliverable-last', entity_id: 'ad-entity-3', title: 'Ad three', metadata: {} },
    ] as unknown as MissionDeliverable[]

    expect(filterSubtaskDeliverables(deliverables, subtasks[0]!, subtasks)).toHaveLength(3)
    expect(numberDeliverablesByTask(deliverables, subtasks).map((item) => item.title)).toEqual([
      'Task 8A — Ad one',
      'Task 8A — Ad two',
      'Task 8A — Ad three',
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

  it('hides human gate approval receipts from deliverable lists', () => {
    const deliverables = [
      {
        id: 'real-doc',
        type: 'doc',
        title: 'WEB#3 — THE PLAN — Launch Brief',
        metadata: {},
      },
      {
        id: 'gate-receipt',
        type: 'doc',
        title: 'Gate 1 — approve strategy package',
        metadata: { source: 'human', files: [], links: [] },
      },
      {
        id: 'human-file',
        type: 'file',
        title: 'Uploaded brief',
        file_url: 'https://example.com/brief.pdf',
        metadata: { source: 'human', files: [{ url: 'https://example.com/brief.pdf' }] },
      },
    ] as unknown as MissionDeliverable[]

    expect(filterMissionDeliverables(deliverables).map((item) => item.id)).toEqual([
      'real-doc',
      'human-file',
    ])
  })

  it('renders human gate output as a plain note, never raw JSON metadata', () => {
    expect(
      resolveSubtaskOutputDisplay({
        summary: 'Approved Gate 2 — approve Copy Package. Ready to continue.',
        deliverable_id: '80422e40-c28f-49cf-b060-2de3afe383ae',
        artifact_manifest: [],
        completed_by_human: true,
        completed_by_user_id: 'user-1',
      }),
    ).toEqual({
      titleKey: 'human',
      body: 'Approved Gate 2 — approve Copy Package. Ready to continue.',
    })

    expect(
      resolveSubtaskOutputDisplay({
        deliverable_id: 'x',
        artifact_manifest: [],
        completed_by_human: true,
      }),
    ).toBeNull()

    expect(
      resolveSubtaskOutputDisplay({
        content: '## Draft\n\nReady for review.',
        artifact_manifest: [{ deliverable_id: 'd1' }],
      }),
    ).toEqual({
      titleKey: 'agent',
      body: '## Draft\n\nReady for review.',
    })
  })
})
