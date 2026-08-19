import { describe, expect, it } from 'vitest'
import {
  interpretAtlasImportJobStatus,
  isEmptySlackIngestReason,
  isSlackPeriodImportContent,
  SLACK_EMPTY_PERIOD_SKIP_REASON,
} from './brain-import-job-status'

describe('interpretAtlasImportJobStatus', () => {
  it('skips Slack empty-ingest failures instead of failing the job', () => {
    expect(
      interpretAtlasImportJobStatus(
        'JOB_STATUS:failed — The Slack period contains no message content to ingest',
        'slack_period',
      ),
    ).toEqual({
      status: 'skipped',
      reason: SLACK_EMPTY_PERIOD_SKIP_REASON,
    })
    expect(
      interpretAtlasImportJobStatus(
        'JOB_STATUS:failed — could not ingest',
        'slack_period_customer',
      ),
    ).toEqual({
      status: 'skipped',
      reason: SLACK_EMPTY_PERIOD_SKIP_REASON,
    })
  })

  it('keeps document empty-content failures fail-closed', () => {
    expect(interpretAtlasImportJobStatus('JOB_STATUS:failed — no content', 'document')).toEqual({
      status: 'failed',
      reason: 'no content',
    })
    expect(
      interpretAtlasImportJobStatus(
        'JOB_STATUS:failed — campaign capability rejected the save',
        'slack_period',
      ),
    ).toEqual({
      status: 'failed',
      reason: 'campaign capability rejected the save',
    })
  })

  it('treats Slack skipped markers as the empty-period no-op', () => {
    expect(
      interpretAtlasImportJobStatus(
        'JOB_STATUS:skipped — no significant knowledge found',
        'slack_period',
      ),
    ).toEqual({
      status: 'skipped',
      reason: SLACK_EMPTY_PERIOD_SKIP_REASON,
    })
  })
})

describe('isEmptySlackIngestReason', () => {
  it('matches Atlas empty-ingest phrasing', () => {
    expect(isEmptySlackIngestReason('Atlas could not process: could not ingest')).toBe(true)
    expect(
      isEmptySlackIngestReason(
        'Atlas could not process: Campaign knowledge could not be saved at this time.',
      ),
    ).toBe(true)
    expect(isEmptySlackIngestReason('campaign brain save was rejected')).toBe(false)
    expect(isEmptySlackIngestReason('campaign capability rejected the save')).toBe(false)
    expect(isSlackPeriodImportContent('slack_period')).toBe(true)
    expect(isSlackPeriodImportContent('campaign_file')).toBe(false)
  })

  it('skips Slack campaign-knowledge no-op failures', () => {
    expect(
      interpretAtlasImportJobStatus(
        'JOB_STATUS:failed — Campaign knowledge could not be saved at this time.',
        'slack_period',
      ),
    ).toEqual({
      status: 'skipped',
      reason: SLACK_EMPTY_PERIOD_SKIP_REASON,
    })
  })
})
