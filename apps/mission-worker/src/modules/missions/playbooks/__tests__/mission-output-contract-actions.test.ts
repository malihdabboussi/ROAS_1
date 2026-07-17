import { describe, expect, it } from 'vitest'
import { CONTRACT_ACTION_DOMAINS } from '../../services/phases/mission-execute-helpers'
import {
  expandWebinarFulfillmentPlaybook,
  WEBINAR_FULFILLMENT_PLAYBOOK_ID,
} from '../webinar-fulfillment.playbook'

describe('mission output contract preflight actions', () => {
  it('recognizes every required action emitted by the Webinar Fulfillment playbook', () => {
    const plan = expandWebinarFulfillmentPlaybook({
      playbookId: WEBINAR_FULFILLMENT_PLAYBOOK_ID,
      mission: {
        id: '11111111-1111-1111-1111-111111111111',
        title: 'Impact webinar package',
        brief: 'Fulfill Impact webinar',
        user_id: '22222222-2222-2222-2222-222222222222',
        org_id: '33333333-3333-3333-3333-333333333333',
        input: {
          playbook_id: WEBINAR_FULFILLMENT_PLAYBOOK_ID,
          playbook_kickoff: { start_at: 'pre_call' },
        },
      },
      workerAgentKeys: ['strategist', 'copywriter', 'ads_manager', 'designer'],
      managerKey: 'vibey',
    })

    const unknownActions = plan.subtasks
      .map((subtask) => subtask.outputContract?.required_action)
      .filter((action): action is string => Boolean(action))
      .filter((action) => !CONTRACT_ACTION_DOMAINS[action])

    expect(unknownActions).toEqual([])
  })
})
