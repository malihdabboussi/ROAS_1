export interface NormalizedAgentToolFailureFields {
    error_code?: string;
    error_class?: string;
    workflow_class?: string;
    effect_state?: string;
    retry_policy?: string;
    observability?: {
        fingerprint?: string;
        report_level?: string;
    };
    reliability?: string;
    user_explanation?: string;
    message?: string;
    error?: string;
}
export declare function normalizeAgentToolFailureFields(value: unknown): NormalizedAgentToolFailureFields;
