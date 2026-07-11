"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MISSION_SUBTASK_FEEDBACK_BUCKET_KEYS = void 0;
exports.emptyMissionFeedbackCounts = emptyMissionFeedbackCounts;
exports.classifyMissionSubtaskFeedback = classifyMissionSubtaskFeedback;
exports.MISSION_SUBTASK_FEEDBACK_BUCKET_KEYS = [
    'tool_error',
    'gateway_connection',
    'openclaw_5xx',
    'openclaw_gateway_error',
    'retryable_json',
    'fetch_failed',
    'timed_out',
    'plan_creation_api_failed',
    'invalid_json_response',
    'blocked_not_executable',
    'subtask_not_found',
    'permission_denied',
    'sandbox_path_mkdir_users',
    'unclassified_feedback',
];
function emptyMissionFeedbackCounts() {
    const o = {};
    for (const k of exports.MISSION_SUBTASK_FEEDBACK_BUCKET_KEYS) {
        o[k] = 0;
    }
    return o;
}
function classifyMissionSubtaskFeedback(feedback) {
    const f = String(feedback ?? '');
    if (!f.trim())
        return 'unclassified_feedback';
    if (/^tool error:/i.test(f))
        return 'tool_error';
    if (/Gateway connection error/i.test(f))
        return 'gateway_connection';
    if (/(openclaw|agent) request failed \(5\d{2}\)/i.test(f))
        return 'openclaw_5xx';
    if (/(OpenClaw|Agent) gateway error \(\d{3}\)/i.test(f))
        return 'openclaw_gateway_error';
    if (/"retryable":\s*true/i.test(f))
        return 'retryable_json';
    if (/(fetch failed|econnreset|econnrefused)/i.test(f))
        return 'fetch_failed';
    if (/timed out/i.test(f))
        return 'timed_out';
    if (/plan creation api failed/i.test(f))
        return 'plan_creation_api_failed';
    if (/invalid json response/i.test(f))
        return 'invalid_json_response';
    if (/not executable from status ['"]blocked['"]/i.test(f))
        return 'blocked_not_executable';
    if (/subtask .* not found/i.test(f))
        return 'subtask_not_found';
    if (/(EACCES|permission denied)/i.test(f))
        return 'permission_denied';
    if (/mkdir\s*['"]?\/Users/i.test(f))
        return 'sandbox_path_mkdir_users';
    return 'unclassified_feedback';
}
//# sourceMappingURL=mission-subtask-feedback-bucket.js.map