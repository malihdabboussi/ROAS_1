export declare const MISSION_SUBTASK_FEEDBACK_BUCKET_KEYS: readonly ["tool_error", "gateway_connection", "openclaw_5xx", "openclaw_gateway_error", "retryable_json", "fetch_failed", "timed_out", "plan_creation_api_failed", "invalid_json_response", "blocked_not_executable", "subtask_not_found", "permission_denied", "sandbox_path_mkdir_users", "unclassified_feedback"];
export type MissionSubtaskFeedbackBucketKey = (typeof MISSION_SUBTASK_FEEDBACK_BUCKET_KEYS)[number];
export declare function emptyMissionFeedbackCounts(): Record<MissionSubtaskFeedbackBucketKey, number>;
export declare function classifyMissionSubtaskFeedback(feedback: string): MissionSubtaskFeedbackBucketKey;
