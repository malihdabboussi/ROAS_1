import { describe, expect, it } from 'vitest'
import { PlanSubtaskSchema } from '../../dto'
import {
  assertTrackActionAvailable,
  buildPostCallStrategySubtasks,
  hasPostCallStrategySteps,
  isClientStrategyTrack,
  listAvailableTrackActions,
  POST_CALL_STRATEGY_ACTION,
  POST_CALL_STRATEGY_TITLE,
  POST_CALL_TRANSCRIPT_TITLE,
  resolveTrackAgentKeys,
} from '../mission-track-extensions'

describe('mission-track-extensions', () => {
  it('treats client-strategy playbooks and pre-call titles as the same track', () => {
    expect(
      isClientStrategyTrack({ input: { playbook_id: 'client-strategy' }, title: 'Any' }, []),
    ).toBe(true)
    expect(
      isClientStrategyTrack({ title: 'Claude Club Pre-Call Strategy Map', input: {} }, []),
    ).toBe(true)
    expect(
      isClientStrategyTrack({ title: 'Freeform', input: {} }, [
        { title: 'Task 2 — Pre-call strategy map' },
      ]),
    ).toBe(true)
  })

  it('does not offer post-call on webinar fulfillment or already-extended tracks', () => {
    expect(
      isClientStrategyTrack({ input: { playbook_id: 'webinar-fulfillment' }, title: 'WF' }, [
        { title: 'Task 2 — Pre-call strategy map' },
      ]),
    ).toBe(false)
    expect(
      listAvailableTrackActions({ input: { playbook_id: 'client-strategy' } }, [
        { title: POST_CALL_STRATEGY_TITLE },
      ]),
    ).toEqual([])
    expect(hasPostCallStrategySteps([{ title: 'Task 4 — Post-call strategy map' }])).toBe(true)
  })

  it('builds two valid post-call subtasks assigned to Atlas then the strategist', () => {
    const subtasks = buildPostCallStrategySubtasks({
      atlas: 'atlas',
      strategist: 'reed',
      missionInput: { playbook_kickoff: { client_context: 'Claude Club' } },
    })
    expect(subtasks.map((row) => row.title)).toEqual([
      POST_CALL_TRANSCRIPT_TITLE,
      POST_CALL_STRATEGY_TITLE,
    ])
    expect(subtasks[0]?.assignTo).toBe('atlas')
    expect(subtasks[1]?.assignTo).toBe('reed')
    expect(subtasks[1]?.dependsOn).toEqual(['st-atlas-transcript'])
    expect(subtasks.map((row) => PlanSubtaskSchema.parse(row))).toHaveLength(2)
  })

  it('resolves Nate or Reed as the strategist and rejects missing Atlas', () => {
    expect(
      resolveTrackAgentKeys([
        { agent_key: 'atlas', name: 'Atlas' },
        { agent_key: 'nate', name: 'Nate · Agency Strategist', role: 'Agency Strategist' },
      ]),
    ).toEqual({ atlas: 'atlas', strategist: 'nate' })
    expect(() => resolveTrackAgentKeys([{ agent_key: 'nate' }])).toThrow(/Atlas/)
  })

  it('rejects unknown or already-applied extend actions', () => {
    expect(() =>
      assertTrackActionAvailable({ input: { playbook_id: 'client-strategy' } }, [], 'nope'),
    ).toThrow(/not available/)
    expect(() =>
      assertTrackActionAvailable(
        { input: { playbook_id: 'client-strategy' } },
        [],
        POST_CALL_STRATEGY_ACTION,
      ),
    ).not.toThrow()
    expect(() =>
      assertTrackActionAvailable(
        { input: { playbook_id: 'client-strategy' } },
        [{ title: POST_CALL_STRATEGY_TITLE }],
        POST_CALL_STRATEGY_ACTION,
      ),
    ).toThrow(/already/)
  })
})
