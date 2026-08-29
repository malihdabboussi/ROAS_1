import { describe, expect, it } from 'vitest'
import {
  CLIENT_LIFECYCLE_PLAYBOOK_ID,
  expandClientLifecyclePlaybook,
} from '../client-lifecycle.playbook'

describe('client lifecycle playbook', () => {
  it('creates a gated lifecycle from source-of-truth review through optimization', () => {
    const plan = expandClientLifecyclePlaybook({
      playbookId: CLIENT_LIFECYCLE_PLAYBOOK_ID,
      mission: {
        id: 'mission-1',
        title: 'Client Lifecycle',
        user_id: 'user-1',
        input: {
          playbook_kickoff: {
            client_context: 'Power Circle',
            transcript_url: 'https://fathom.video/share/call',
          },
        },
      },
      workerAgentKeys: ['atlas', 'reed'],
      managerKey: 'vibey',
    })

    expect(plan.title).toBe('Client Lifecycle')
    expect(plan.subtasks.map((task) => task.id)).toEqual([
      'st-lifecycle-context',
      'st-gate-context',
      'st-lifecycle-fundamentals',
      'st-gate-fundamentals',
      'st-lifecycle-bind-fundamentals',
      'st-lifecycle-strategy',
      'st-gate-strategy',
      'st-lifecycle-campaign-plan',
      'st-gate-production',
      'st-lifecycle-sync-canvas',
      'st-lifecycle-launch-readiness',
      'st-gate-launch',
      'st-lifecycle-optimization',
    ])
    expect(plan.subtasks.filter((task) => task.assignTo === 'human:user-1')).toHaveLength(5)
    expect(plan.subtasks[2]?.intent.ecology).toMatch(/reuse existing Offer and Avatar records/i)
    expect(plan.subtasks[4]?.intent.ecology).toMatch(/update_campaign_context/i)
    expect(plan.subtasks[7]?.intent.ecology).toMatch(/extend this lifecycle mission/i)
    expect(plan.subtasks[9]?.intent.ecology).toMatch(/get_canvas_board/i)
    expect(plan.subtasks[9]?.intent.ecology).toMatch(/build_campaign_blueprint/i)
    expect(plan.subtasks[10]?.dependsOn).toEqual(['st-lifecycle-sync-canvas'])
    expect(plan.subtasks[10]?.intent.ecology).toMatch(/list_tasks/i)
    expect(plan.subtasks[10]?.intent.ecology).toMatch(/Page Grader MCP/i)
    expect(plan.subtasks.at(-1)?.outputContract?.expected).toEqual({
      title: 'Client Optimization Cadence',
    })
  })
})
