import { describe, expect, it } from 'vitest'
import { COPYWRITER_MODEL_ID, resolveDefaultAgentModel } from './agent-model-defaults'

describe('resolveDefaultAgentModel', () => {
  it('pins copywriter hires to Claude Opus 4.8', () => {
    expect(
      resolveDefaultAgentModel({
        agentKey: 'ivy',
        role: 'Senior Conversion Copywriter',
        skillSeedKey: 'copywriter',
      }),
    ).toBe(COPYWRITER_MODEL_ID)
  })

  it('keeps non-copywriting hires on automatic model selection', () => {
    expect(
      resolveDefaultAgentModel({
        agentKey: 'lux',
        role: 'Creative Director & Visual Designer',
        skillSeedKey: 'designer',
      }),
    ).toBe('auto')
  })
})
