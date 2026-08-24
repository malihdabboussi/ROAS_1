import { describe, expect, it } from 'vitest'
import { ACTION_TO_DOMAIN, ACTIONS, MCP_V1_TOOL_CATALOG } from '@vibey/agent-policy'
import { VALID_ACTIONS } from '../dtos/artifact-action.dto'
import { getPromptModeActionLifecycle } from './artifact-action-lifecycle'
import { ACTION_PREFLIGHT_COVERAGE } from './artifact-action-preflight'
import { describeActionContract, validateActionData } from './artifact-action-schemas'

describe('User Brain topic synthesis capability', () => {
  it('is registered as an active personal-Brain MCP read action', () => {
    expect(ACTIONS).toContain('synthesize_user_brain_topic')
    expect(VALID_ACTIONS).toContain('synthesize_user_brain_topic')
    expect(ACTION_TO_DOMAIN.synthesize_user_brain_topic).toBe('read_brain_personal')
    expect(
      MCP_V1_TOOL_CATALOG.find((tool) => tool.toolName === 'synthesize_user_brain_topic'),
    ).toMatchObject({
      action: 'synthesize_user_brain_topic',
      requiredScopes: ['mcp:tools', 'read_brain_personal'],
    })
    expect(getPromptModeActionLifecycle('synthesize_user_brain_topic')).toMatchObject({
      status: 'active',
      agent_available: true,
    })
  })

  it('has a hard schema, schema-only preflight, and describe-action guidance', () => {
    expect(validateActionData('synthesize_user_brain_topic', {})).toMatch(/topic.*required/i)
    expect(
      validateActionData('synthesize_user_brain_topic', {
        topic: 'webinars',
        question: 'What do I think about webinars?',
        evidence_limit: 24,
      }),
    ).toBeNull()
    expect(ACTION_PREFLIGHT_COVERAGE.synthesize_user_brain_topic).toMatchObject({
      mode: 'schema_only',
    })
    expect(describeActionContract('synthesize_user_brain_topic')).toMatchObject({
      action: 'synthesize_user_brain_topic',
      required: ['topic'],
      optional: expect.arrayContaining(['question', 'evidence_limit']),
      lifecycle: { status: 'active', agent_available: true },
      preflight: expect.objectContaining({ mode: 'schema_only' }),
    })
  })
})
