import { describe, expect, it } from 'vitest'
import { BRAIN_TOAST_ERRORS } from '../config/brain-toast-errors.config'
import {
  planBrainImportNotificationToasts,
  resolveBrainImportToast,
} from './brain-import-job-toast'

describe('resolveBrainImportToast', () => {
  it('does not toast skipped Slack periods', () => {
    expect(
      resolveBrainImportToast({
        id: 'job-1',
        job_type: 'slack_period_import',
        title: 'Slack #sales daily',
        status: 'succeeded',
        result: { status: 'skipped', reason: BRAIN_TOAST_ERRORS.SLACK_PERIOD_EMPTY.userMessage },
      }),
    ).toBeNull()
  })

  it('does not toast Atlas empty-ingest Slack failures', () => {
    expect(
      resolveBrainImportToast({
        id: 'job-2',
        job_type: 'slack_period_import',
        title: 'Slack #sales daily',
        status: 'failed',
        last_error:
          'Atlas could not process: The Slack period contains no message content to ingest',
      }),
    ).toBeNull()
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

describe('planBrainImportNotificationToasts', () => {
  it('acks empty Slack skips without stacking info toasts', () => {
    expect(
      planBrainImportNotificationToasts([
        {
          id: 'job-a',
          job_type: 'slack_period_import',
          title: 'Slack #sales daily',
          status: 'succeeded',
          result: { status: 'skipped', reason: BRAIN_TOAST_ERRORS.SLACK_PERIOD_EMPTY.userMessage },
        },
        {
          id: 'job-b',
          job_type: 'campaign_slack_import',
          title: 'Slack #ops daily',
          status: 'succeeded',
          result: { status: 'skipped', reason: BRAIN_TOAST_ERRORS.SLACK_PERIOD_EMPTY.userMessage },
        },
        {
          id: 'job-c',
          job_type: 'slack_period_import',
          title: 'Slack #general daily',
          status: 'failed',
          last_error: 'Atlas could not process: no message content',
        },
      ]),
    ).toEqual({
      acknowledgedIds: ['job-a', 'job-b', 'job-c'],
      successMessages: [],
      infoMessages: [],
      errorMessages: [],
    })
  })
})
