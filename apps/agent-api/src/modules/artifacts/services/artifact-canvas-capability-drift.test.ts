import { getActionContract, isPromptModeActionOnHold } from '@vibey/agent-policy'
import { describe, expect, it } from 'vitest'
import { VIBEY_API_ACTION_DOCS } from '../../agent-sync/data/vibey-api-action-docs'
import { VALID_ACTIONS } from '../dtos/artifact-action.dto'
import { ACTION_METHOD_MAP } from './artifact-action.registry'
import {
  ACTION_PREFLIGHT_COVERAGE,
  ACTION_PREFLIGHTS,
} from './artifact-action-preflight'
import { ACTION_SCHEMAS } from './artifact-action-schemas'
import { isArtifactActionAllowed, resolveCapabilityPolicy } from './artifact-capability.policy'

const PIXEL_ACTIONS = ['get_canvas_board', 'apply_canvas_operations'] as const
const pixelProfile = {
  agent_key: 'pixel',
  role: 'Designer',
  level: 'employee',
  config: { capability_profile: 'managed_domain', capability_domain: 'marketing' },
}
const pixelPolicy = resolveCapabilityPolicy(pixelProfile)!
const defaultPixelPolicy = resolveCapabilityPolicy({
  agent_key: 'vibey',
  role: 'CEO',
  level: 'system',
  config: { capability_profile: 'vibey_ceo' },
})!

describe('Pixel Canvas capability drift guardrail', () => {
  it.each(PIXEL_ACTIONS)('%s is exposed through every governed action surface', (action) => {
    expect(VALID_ACTIONS).toContain(action)
    expect(ACTION_SCHEMAS[action]).toBeDefined()
    expect(ACTION_METHOD_MAP[action]).toBeDefined()
    expect(VIBEY_API_ACTION_DOCS[action]).toBeDefined()
    expect(isPromptModeActionOnHold(action)).toBe(false)
    expect(getActionContract(action)).toMatchObject({ family: 'artifact.canvas' })
    expect(isArtifactActionAllowed(pixelPolicy, action).allowed).toBe(true)
    expect(isArtifactActionAllowed(defaultPixelPolicy, action).allowed).toBe(true)
    expect(ACTION_PREFLIGHT_COVERAGE[action]).toBeDefined()
  })

  it('uses semantic preflight validation for Canvas mutation batches', () => {
    expect(ACTION_PREFLIGHT_COVERAGE.apply_canvas_operations.mode).toBe('static_preflight')
    expect(ACTION_PREFLIGHTS.apply_canvas_operations).toBeTypeOf('function')
  })
})
