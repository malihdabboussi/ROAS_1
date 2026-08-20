"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const brain_import_job_status_1 = require("./brain-import-job-status");
(0, vitest_1.describe)('interpretAtlasImportJobStatus', () => {
    (0, vitest_1.it)('skips Slack empty-ingest failures instead of failing the job', () => {
        (0, vitest_1.expect)((0, brain_import_job_status_1.interpretAtlasImportJobStatus)('JOB_STATUS:failed — The Slack period contains no message content to ingest', 'slack_period')).toEqual({
            status: 'skipped',
            reason: brain_import_job_status_1.SLACK_EMPTY_PERIOD_SKIP_REASON,
        });
        (0, vitest_1.expect)((0, brain_import_job_status_1.interpretAtlasImportJobStatus)('JOB_STATUS:failed — could not ingest', 'slack_period_customer')).toEqual({
            status: 'skipped',
            reason: brain_import_job_status_1.SLACK_EMPTY_PERIOD_SKIP_REASON,
        });
    });
    (0, vitest_1.it)('keeps document empty-content failures fail-closed', () => {
        (0, vitest_1.expect)((0, brain_import_job_status_1.interpretAtlasImportJobStatus)('JOB_STATUS:failed — no content', 'document')).toEqual({
            status: 'failed',
            reason: 'no content',
        });
        (0, vitest_1.expect)((0, brain_import_job_status_1.interpretAtlasImportJobStatus)('JOB_STATUS:failed — campaign capability rejected the save', 'slack_period')).toEqual({
            status: 'failed',
            reason: 'campaign capability rejected the save',
        });
    });
    (0, vitest_1.it)('treats Slack skipped markers as the empty-period no-op', () => {
        (0, vitest_1.expect)((0, brain_import_job_status_1.interpretAtlasImportJobStatus)('JOB_STATUS:skipped — no significant knowledge found', 'slack_period')).toEqual({
            status: 'skipped',
            reason: brain_import_job_status_1.SLACK_EMPTY_PERIOD_SKIP_REASON,
        });
    });
});
(0, vitest_1.describe)('isEmptySlackIngestReason', () => {
    (0, vitest_1.it)('matches Atlas empty-ingest phrasing', () => {
        (0, vitest_1.expect)((0, brain_import_job_status_1.isEmptySlackIngestReason)('Atlas could not process: could not ingest')).toBe(true);
        (0, vitest_1.expect)((0, brain_import_job_status_1.isEmptySlackIngestReason)('Atlas could not process: Campaign knowledge could not be saved at this time.')).toBe(true);
        (0, vitest_1.expect)((0, brain_import_job_status_1.isEmptySlackIngestReason)('campaign brain save was rejected')).toBe(false);
        (0, vitest_1.expect)((0, brain_import_job_status_1.isEmptySlackIngestReason)('campaign capability rejected the save')).toBe(false);
        (0, vitest_1.expect)((0, brain_import_job_status_1.isSlackPeriodImportContent)('slack_period')).toBe(true);
        (0, vitest_1.expect)((0, brain_import_job_status_1.isSlackPeriodImportContent)('campaign_file')).toBe(false);
    });
    (0, vitest_1.it)('skips Slack campaign-knowledge no-op failures', () => {
        (0, vitest_1.expect)((0, brain_import_job_status_1.interpretAtlasImportJobStatus)('JOB_STATUS:failed — Campaign knowledge could not be saved at this time.', 'slack_period')).toEqual({
            status: 'skipped',
            reason: brain_import_job_status_1.SLACK_EMPTY_PERIOD_SKIP_REASON,
        });
    });
});
//# sourceMappingURL=brain-import-job-status.test.js.map