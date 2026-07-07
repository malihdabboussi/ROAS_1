import { describe, expect, it } from 'vitest'
import {
  agentTurnFeedbackChipsForThumb,
  filterAgentTurnFeedbackTagsForThumb,
} from './types'

describe('agent turn feedback chip groups', () => {
  it('returns positive chips for thumbs up', () => {
    expect(agentTurnFeedbackChipsForThumb(true).map((chip) => chip.value)).toEqual([
      'helpful',
      'clear',
    ])
  })

  it('returns negative chips for thumbs down', () => {
    expect(agentTurnFeedbackChipsForThumb(false).map((chip) => chip.value)).toEqual([
      'wrong',
      'missed_context',
      'tool_problem',
      'too_slow',
      'tone_issue',
    ])
  })

  it('drops incompatible tags when the thumb direction changes', () => {
    expect(filterAgentTurnFeedbackTagsForThumb(['helpful', 'tool_problem'], true)).toEqual([
      'helpful',
    ])
    expect(filterAgentTurnFeedbackTagsForThumb(['helpful', 'tool_problem'], false)).toEqual([
      'tool_problem',
    ])
  })
})
