"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SLACK_EMPTY_PERIOD_SKIP_REASON = void 0;
exports.isSlackPeriodImportContent = isSlackPeriodImportContent;
exports.isEmptySlackIngestReason = isEmptySlackIngestReason;
exports.isNoOpCampaignKnowledgeSaveReason = isNoOpCampaignKnowledgeSaveReason;
exports.interpretAtlasImportJobStatus = interpretAtlasImportJobStatus;
exports.SLACK_EMPTY_PERIOD_SKIP_REASON = 'Nothing to save from that Slack period.';
function isSlackPeriodImportContent(contentType) {
    return contentType.startsWith('slack_period');
}
function isEmptySlackIngestReason(reason) {
    const normalized = reason.toLowerCase();
    return (normalized.includes('no content') ||
        normalized.includes('nothing to ingest') ||
        normalized.includes('could not ingest') ||
        normalized.includes('processable content') ||
        normalized.includes('no message content') ||
        normalized.includes('no significant knowledge') ||
        isNoOpCampaignKnowledgeSaveReason(normalized));
}
function isNoOpCampaignKnowledgeSaveReason(reason) {
    const normalized = reason.toLowerCase();
    if (normalized.includes('campaign capability rejected'))
        return false;
    return (normalized.includes('campaign knowledge could not be saved') ||
        (normalized.includes('campaign knowledge') &&
            normalized.includes('could not be saved at this time')));
}
function interpretAtlasImportJobStatus(text, contentType) {
    const match = text.match(/^\s*JOB_STATUS:(completed|failed|skipped)\b([^\r\n]*)/m);
    if (match) {
        const status = match[1];
        const reason = match[2].replace(/^[\s—–-]+/, '').trim();
        const fallbackReason = status === 'completed'
            ? 'Processed successfully'
            : status === 'failed'
                ? 'Unknown failure'
                : 'Skipped';
        return coerceSlackEmptyIngestStatus({ status, reason: reason || fallbackReason }, contentType);
    }
    const lower = text.toLowerCase();
    const looksEmpty = lower.includes('nothing to ingest') ||
        lower.includes('no content') ||
        lower.includes('transcript is null') ||
        lower.includes('no transcript') ||
        lower.includes('skip this') ||
        lower.includes('could not ingest');
    if (looksEmpty && isSlackPeriodImportContent(contentType)) {
        return { status: 'skipped', reason: exports.SLACK_EMPTY_PERIOD_SKIP_REASON };
    }
    if (looksEmpty) {
        return { status: 'failed', reason: 'Atlas could not find processable content' };
    }
    return { status: 'failed', reason: 'Missing required JOB_STATUS terminal marker' };
}
function coerceSlackEmptyIngestStatus(parsed, contentType) {
    if (parsed.status === 'failed' &&
        isSlackPeriodImportContent(contentType) &&
        isEmptySlackIngestReason(parsed.reason)) {
        return { status: 'skipped', reason: exports.SLACK_EMPTY_PERIOD_SKIP_REASON };
    }
    if (parsed.status === 'skipped' && isSlackPeriodImportContent(contentType)) {
        return { status: 'skipped', reason: exports.SLACK_EMPTY_PERIOD_SKIP_REASON };
    }
    return parsed;
}
//# sourceMappingURL=brain-import-job-status.js.map