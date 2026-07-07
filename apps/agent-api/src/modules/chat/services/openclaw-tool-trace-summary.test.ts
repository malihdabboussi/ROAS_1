import { describe, expect, it } from 'vitest'
import { buildToolTraceSummary } from './openclaw-tool-trace-summary'

describe('buildToolTraceSummary', () => {
  it('captures safe action, input keys, data keys, and result contract details', () => {
    expect(
      buildToolTraceSummary({
        name: 'campaign_capability',
        toolCallId: 'call-1',
        args: {
          action: 'create_docx',
          label: 'Creating docx',
          data: {
            title: 'Ledger mistakes',
            content: 'large private document content',
            source_types: ['brain', 'files'],
          },
        },
        result: {
          success: false,
          details: {
            error_code: 'VALIDATION_FAILED',
            error_class: 'bad_request',
            workflow_class: 'document_generation',
            effect_state: 'no_effect',
            retry_policy: { mode: 'do_not_retry_needs_user_action' },
            observability: { fingerprint: 'tool:validation:content' },
            user_explanation: { sentence: 'The document payload was missing content.' },
          },
        },
      }),
    ).toEqual({
      action: 'create_docx',
      tool_call_id: 'call-1',
      error_code: 'VALIDATION_FAILED',
      error_class: 'bad_request',
      workflow_class: 'document_generation',
      effect_state: 'no_effect',
      retry_policy: 'do_not_retry_needs_user_action',
      observability: { fingerprint: 'tool:validation:content' },
      input: {
        keys: ['action', 'data', 'label'],
        fields: { action: 'create_docx', label: 'Creating docx' },
        data_keys: ['content', 'source_types', 'title'],
        data_counts: { source_types: 2 },
        data_fields: { title: 'Ledger mistakes' },
      },
      result: {
        keys: ['details', 'success'],
        fields: { success: false },
        error_code: 'VALIDATION_FAILED',
        error_class: 'bad_request',
        workflow_class: 'document_generation',
        effect_state: 'no_effect',
        retry_policy: 'do_not_retry_needs_user_action',
        observability: { fingerprint: 'tool:validation:content' },
        user_explanation: 'The document payload was missing content.',
      },
    })
  })

  it('summarizes JSON text envelopes without storing raw text content', () => {
    const summary = buildToolTraceSummary({
      name: 'vibey_backend',
      result: {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              document_id: 'doc-1',
              file_url: 'https://signed.example.com/private',
              ui_blocks: [{ type: 'document_card' }],
            }),
          },
        ],
      },
    })

    expect(summary.result).toEqual({
      keys: ['content'],
      counts: { content: 1 },
      envelope_keys: ['document_id', 'file_url', 'success', 'ui_blocks'],
      envelope_counts: { ui_blocks: 1 },
      envelope_fields: { document_id: 'doc-1', success: true },
    })
  })
})
