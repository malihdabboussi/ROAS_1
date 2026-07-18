import { describe, expect, it } from 'vitest'
import { buildErrorEnvelope, classifyArtifactError } from './artifact-error-classifier'

describe('artifact wrong-action-family guidance', () => {
  it('classifies brain actions used for artifact work as wrong_action_family', () => {
    const error =
      'Action "create_brain_page" is restricted. This is an Atlas brain/page action. For decks use create_presentation.'

    expect(classifyArtifactError(error)).toBe('wrong_action_family')
  })

  it('tells the agent not to retry the same wrong action', () => {
    const envelope = buildErrorEnvelope(
      'create_strategy_node creates a strategy model node, not a presentation artifact.',
    )

    expect(envelope).toMatchObject({
      success: false,
      error_code: 'ARTIFACT_WRONG_ACTION_FAMILY',
      error_class: 'wrong_action_family',
      reliability: 'probable',
      effect_state: 'failed_before_effect',
      retry_policy: {
        mode: 'retry_with_corrected_payload',
        max_attempts: 1,
        stop_after_same_error: true,
      },
      correction: {
        summary: 'Switch to the correct action family instead of repeating this call.',
      },
      user_explanation: {
        intent: 'reroute_work',
      },
      retryable: false,
    })
    expect(envelope.agent_instruction).toBe(envelope.agent_guidance)
    expect(envelope.forbidden_user_framing).toContain('platform error')
    expect(envelope.agent_guidance.toLowerCase()).toContain('do not retry')
    expect(envelope.agent_guidance).toContain('correct action family')
  })

  it('routes protected owner mistakes toward Atlas or HR', () => {
    expect(buildErrorEnvelope('ingest_user_document must be delegated to Atlas.')).toMatchObject({
      error_class: 'wrong_action_family',
      retryable: false,
    })
    expect(buildErrorEnvelope('create_agent must be delegated to HR.')).toMatchObject({
      error_class: 'wrong_action_family',
      retryable: false,
    })
  })

  it('classifies PostgREST bad requests as platform data query failures', () => {
    const envelope = buildErrorEnvelope('Bad Request code=PGRST100')

    expect(envelope).toMatchObject({
      success: false,
      error_class: 'platform_data_query_failed',
      retryable: false,
    })
    expect(envelope.agent_guidance).toContain('document_id')
    expect(envelope.agent_guidance).toContain('narrower list_documents')
  })

  it('treats missing PostgREST columns as terminal schema contract failures', () => {
    const envelope = buildErrorEnvelope(
      "Could not find the 'space_id' column of 'funnels' in the schema cache code=PGRST204",
    )

    expect(envelope).toMatchObject({
      success: false,
      error_code: 'ARTIFACT_SCHEMA_CONTRACT_MISMATCH',
      error_class: 'platform_schema_contract_mismatch',
      effect_state: 'failed_before_effect',
      retry_policy: {
        mode: 'do_not_retry_terminal',
        max_attempts: 0,
        stop_after_same_error: true,
      },
      correction: {
        summary: 'Apply the missing database migration and reload the PostgREST schema cache.',
      },
      user_explanation: {
        intent: 'needs_schema_repair',
      },
      retryable: false,
    })
    expect(envelope.agent_guidance).toContain('Do NOT retry')
    expect(envelope.agent_guidance).toContain('database migration')
    expect(envelope.agent_guidance).not.toContain('document_id')
    expect(envelope.agent_guidance).not.toContain('list_documents')
  })

  it('keeps unclassified failures away from platform-problem user wording', () => {
    const envelope = buildErrorEnvelope('renderer connection reset')

    expect(envelope).toMatchObject({
      error_code: 'ARTIFACT_SYSTEM_FAULT',
      error_class: 'system_fault',
      reliability: 'raw_unclassified',
      retry_policy: {
        mode: 'do_not_retry_use_fallback',
        max_attempts: 0,
      },
      user_explanation: {
        intent: 'use_alternate_approach',
        sentence: 'I was not able to do that just now. Let me try a different approach.',
      },
    })
    expect(envelope.forbidden_user_framing).toEqual(
      expect.arrayContaining(['platform error', 'platform rendering issue', 'internal issue']),
    )
    expect(envelope.user_hint.toLowerCase()).not.toContain('platform')
  })

  it('does not classify bare bad requests as platform data query failures', () => {
    const envelope = buildErrorEnvelope('Bad Request')

    expect(envelope.error_class).not.toBe('platform_data_query_failed')
    expect(envelope.agent_guidance).not.toContain('get_document')
    expect(envelope.agent_guidance).not.toContain('list_documents')
  })

  it('classifies integration action parameter failures with integration recovery guidance', () => {
    const envelope = buildErrorEnvelope(
      'Integration action failed for service "social_analysis" action "youtube_search" params [limit]: query is required',
    )

    expect(envelope).toMatchObject({
      success: false,
      error_class: 'integration_validation',
      retryable: true,
    })
    expect(envelope.agent_guidance).toContain('get_integration')
    expect(envelope.agent_guidance).toContain('use_integration')
    expect(envelope.agent_guidance).not.toContain('get_document')
    expect(envelope.agent_guidance).not.toContain('list_documents')
  })

  it('classifies HR agent update access denials as permission_denied', () => {
    const envelope = buildErrorEnvelope(
      'Only admins or members of this agent’s team can update it.',
    )

    expect(envelope).toMatchObject({
      success: false,
      error_class: 'permission_denied',
      retryable: false,
      user_hint: 'You do not have access to do that. An admin or agent team member can help.',
    })
    expect(envelope.agent_guidance).toContain('does not have access')
    expect(envelope.agent_guidance).toContain('required role or team membership')
  })

  it('classifies agent creation role denials as permission_denied', () => {
    expect(
      buildErrorEnvelope('Only creators, admins, or owners can create agents in this workspace.'),
    ).toMatchObject({
      error_class: 'permission_denied',
      retryable: false,
    })

    expect(buildErrorEnvelope('Only admins can create manager agents.')).toMatchObject({
      error_class: 'permission_denied',
      retryable: false,
    })
  })
})
