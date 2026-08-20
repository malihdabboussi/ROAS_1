export declare const SLACK_EMPTY_PERIOD_SKIP_REASON = "Nothing to save from that Slack period.";
export type AtlasImportJobStatus = 'completed' | 'failed' | 'skipped';
export type AtlasImportJobStatusResult = {
    status: AtlasImportJobStatus;
    reason: string;
};
export declare function isSlackPeriodImportContent(contentType: string): boolean;
export declare function isEmptySlackIngestReason(reason: string): boolean;
export declare function isNoOpCampaignKnowledgeSaveReason(reason: string): boolean;
export declare function interpretAtlasImportJobStatus(text: string, contentType: string): AtlasImportJobStatusResult;
