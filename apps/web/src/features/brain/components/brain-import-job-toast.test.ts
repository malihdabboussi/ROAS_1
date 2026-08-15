import { describe, expect, it } from 'vitest'
import { BRAIN_TOAST_ERRORS } from '../config/brain-toast-errors.config'
import { resolveBrainImportToast } from './brain-import-job-toast'

describe('resolveBrainImportToast', () => {
  it('uses an info toast for skipped Slack periods', () => {
    expect(
      resolveBrainImportToast({
        id: 'job-1',
        job_type: 'slack_period_import',
        title: 'Analyze Slack #sales',
        status: 'succeeded',
        result: { status: 'skipped', reason: BRAIN_TOAST_ERRORS.SLACK_PERIOD_EMPTY.userMessage },
      }),
    ).toEqual({
      kind: 'info',
      message: BRAIN_TOAST_ERRORS.SLACK_PERIOD_EMPTY.userMessage,
    })
  })

  it('does not show Atlas empty-ingest failures as import errors', () => {
    expect(
      resolveBrainImportToast({
        id: 'job-2',
        job_type: 'slack_period_import',
        title: 'Analyze Slack #sales',
        status: 'failed',
        last_error: 'Atlas could not process: The Slack period contains no message content to ingest',
      }),
    ).toEqual({
      kind: 'info',
      message: BRAIN_TOAST_ERRORS.SLACK_PERIOD_EMPTY.userMessage,
    })
  })

  it('keeps document empty-content failures as errors', () => {
    expect(
      resolveBrainImportToast({
        id: 'job-4',
        job_type: 'document_remember',
        title: 'Doc',
        status: 'failed',
        last_error: 'Atlas could not process: no content',
      }),
    ).toEqual({
      kind: 'error',
      message: 'Import failed: Atlas could not process: no content',
    })
  })

  it('keeps real Atlas save failures as errors', () => {
    expect(
      resolveBrainImportToast({
        id: 'job-3',
        job_type: 'campaign_slack_import',
        title: 'Analyze Slack #sales',
        status: 'failed',
        last_error: 'Atlas could not process: campaign capability rejected the save',
      }),
    ).toEqual({
      kind: 'error',
      message: 'Import failed: Atlas could not process: campaign capability rejected the save',
    })
  })
})
