import { describe, expect, it } from 'vitest'
import {
  buildContractCorrectionContext,
  extractToolDeliverableReceipt,
  prepareExecutionStateForContractCorrection,
} from './mission-execute-helpers'

describe('mission execute helpers', () => {
  it('extracts a deliverable receipt from an MCP text result', () => {
    const result = {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            deliverable_id: 'e964cf26-41fd-45d3-b1cd-25138480cfd9',
            title: 'Static Ads — Impact Elite Coaching',
            file_url: null,
          }),
        },
      ],
    }

    expect(extractToolDeliverableReceipt(result)).toEqual({
      deliverable_id: 'e964cf26-41fd-45d3-b1cd-25138480cfd9',
      title: 'Static Ads — Impact Elite Coaching',
      file_url: null,
      file_name: null,
    })
  })

  it('does not treat unrelated ids as deliverable receipts', () => {
    expect(extractToolDeliverableReceipt({ success: true, id: 'campaign-id' })).toBeNull()
  })

  it('removes only the invalid contract action before a corrective run', () => {
    const executionState = {
      completed_actions: [
        { action: 'campaign_capability', toolAction: 'read_space_document', title: 'Read context' },
        {
          action: 'campaign_capability',
          toolAction: 'save_document',
          title: 'Invalid report',
          deliverable_id: 'deliverable-invalid',
        },
      ],
      partial_output: 'The invalid report is already complete.',
      execution_status: 'complete',
    }

    expect(
      prepareExecutionStateForContractCorrection(executionState, 'save_document', {
        ok: false,
        reason: 'Document contains 95 em dash characters; expected zero',
        recovery: 'corrective_run',
      }),
    ).toEqual({
      completed_actions: [
        { action: 'campaign_capability', toolAction: 'read_space_document', title: 'Read context' },
      ],
      execution_status: 'pending_correction',
      contract_correction: {
        required_action: 'save_document',
        reason: 'Document contains 95 em dash characters; expected zero',
      },
    })
  })

  it('requires a fresh artifact instead of reusing the invalid deliverable', () => {
    expect(
      buildContractCorrectionContext({
        contract_correction: {
          required_action: 'save_document',
          reason: 'Document contains 66 em dash characters; expected zero',
        },
      }),
    ).toContain('Do not reuse, cite, or return the previously failed artifact')
  })
})
