import { describe, expect, it } from 'vitest'
import {
  CLIENT_STRATEGY_PLAYBOOK_ID,
  expandClientStrategyPlaybook,
} from '../client-strategy.playbook'

describe('client strategy playbook', () => {
  it('runs only the proven context and pre-call strategy stages', () => {
    const plan = expandClientStrategyPlaybook({
      playbookId: CLIENT_STRATEGY_PLAYBOOK_ID,
      mission: {
        id: 'mission-1',
        title: 'Client Strategy',
        user_id: 'user-1',
        input: { playbook_kickoff: { client_context: 'Acme launch' } },
      },
      workerAgentKeys: ['atlas', 'reed'],
      managerKey: 'vibey',
    })

    expect(plan.title).toBe('Client Strategy')
    expect(plan.subtasks.map((task) => task.id)).toEqual(['st-atlas-context', 'st-precall'])
    expect(plan.subtasks[1]?.outputContract?.expected).toEqual({ title: 'Client Strategy Map' })
  })
})
