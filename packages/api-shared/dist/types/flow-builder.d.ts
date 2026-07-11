import type { FlowCapability, FlowCapabilityKind } from './flow-capabilities';
import type { WorkflowCapabilitySearchResult } from './workflow-capabilities';
export type FlowBuilderScopeKind = 'brain' | 'agent' | 'space' | 'integration' | 'platform';
export type FlowBuilderFieldOptionRef = {
    id: string;
    label: string;
    value?: string | null;
    key?: string | null;
    color?: string | null;
};
export type FlowBuilderFieldRef = {
    id: string;
    key: string;
    label: string;
    type: string;
    view_id?: string | null;
    required?: boolean;
    custom?: boolean;
    options?: string[];
    option_refs?: FlowBuilderFieldOptionRef[];
};
export type FlowBuilderViewRef = {
    id: string;
    title: string;
    type: string;
    fields: FlowBuilderFieldRef[];
};
export type FlowBuilderTemplateToken = {
    token: string;
    label: string;
    source: FlowBuilderScopeKind;
    description: string;
};
export type FlowBuilderCapabilityBucket = {
    category: string;
    triggers: number;
    actions: number;
};
export type FlowBuilderExistingFlowRef = {
    id: string;
    name: string;
    enabled: boolean;
    is_draft: boolean;
    trigger_type: string | null;
    action_types: string[];
    updated_at?: string | null;
};
export type FlowActionBlueprintStatus = 'draft' | 'active' | 'archived';
export type FlowActionBlueprint = {
    id: string;
    org_id?: string | null;
    space_id?: string | null;
    created_by?: string | null;
    name: string;
    description?: string | null;
    category: string;
    status: FlowActionBlueprintStatus;
    input_schema: Record<string, unknown>;
    action_template: Record<string, unknown>;
    required_contexts: string[];
    output_contexts: string[];
    promotion_score?: number | null;
    created_at?: string | null;
    updated_at?: string | null;
};
export type FlowBuilderContext = {
    space: {
        id: string;
        title: string;
        org_id?: string | null;
    };
    views: FlowBuilderViewRef[];
    fields: FlowBuilderFieldRef[];
    capabilities: {
        buckets: FlowBuilderCapabilityBucket[];
        sample: FlowCapability[];
        total: number;
    };
    workflow_capabilities?: WorkflowCapabilitySearchResult & {
        flow_capability_total?: number;
        agent_action_total?: number;
    };
    existing_flows: FlowBuilderExistingFlowRef[];
    blueprints: FlowActionBlueprint[];
    template_tokens: FlowBuilderTemplateToken[];
    context_hash: string;
};
export type FlowBuildStepSource = 'premade' | 'custom_blueprint' | 'unsupported_candidate';
export type FlowBuildStepKind = FlowCapabilityKind | 'custom_blueprint';
export type FlowBuildPlanStep = {
    id: string;
    kind: FlowBuildStepKind;
    title: string;
    description: string;
    source: FlowBuildStepSource;
    capability_id?: string | null;
    blueprint_id?: string | null;
    action_type?: string | null;
    payload: Record<string, unknown>;
    missing_fields: string[];
    compatibility_warnings: string[];
};
export type FlowClarificationTarget = {
    kind: FlowBuildStepKind | 'field' | 'integration' | 'plan';
    step_id?: string | null;
    field_key?: string | null;
};
export type FlowClarificationQuestion = {
    id: string;
    text: string;
    type: 'single_choice' | 'multiple_choice';
    options: Array<{
        id: string;
        label: string;
        description?: string;
    }>;
    required: boolean;
    target?: FlowClarificationTarget;
    label?: string;
    question?: string;
    suggested_answers?: string[];
};
export type FlowBuildClarificationStatus = 'open' | 'answered' | 'dismissed';
export type FlowBuildClarification = {
    id: string;
    session_id: string;
    org_id?: string | null;
    space_id: string;
    created_by?: string | null;
    question: FlowClarificationQuestion;
    answer?: Record<string, unknown> | null;
    status: FlowBuildClarificationStatus;
    created_at?: string | null;
    updated_at?: string | null;
};
export type FlowBuildTraceEventType = 'context_loaded' | 'capabilities_searched' | 'premade_capability_selected' | 'custom_blueprint_selected' | 'custom_blueprint_drafted' | 'clarification_required' | 'clarification_answered' | 'schema_validation_failed' | 'schema_validation_passed' | 'unsupported_request_detected' | 'flow_draft_compiled' | 'publish_validation_passed' | 'publish_validation_failed';
export type FlowBuildTraceEvent = {
    type: FlowBuildTraceEventType;
    message: string;
    at?: string;
    data?: Record<string, unknown>;
};
export type FlowBuildSessionStatus = 'intake' | 'clarifying' | 'planning' | 'planned' | 'validated' | 'compiled' | 'blocked';
export type FlowBuildPlanStatus = 'planned' | 'validated' | 'compiled' | 'blocked';
export type FlowBuildPlan = {
    id?: string;
    name: string;
    description?: string | null;
    intent: string;
    status: FlowBuildPlanStatus;
    trigger: FlowBuildPlanStep | null;
    actions: FlowBuildPlanStep[];
    trace_events: FlowBuildTraceEvent[];
    validation_errors: string[];
    context_hash?: string | null;
    automation_id?: string | null;
    target_automation_id?: string | null;
};
export type FlowBuildEvaluationRank = 'A' | 'B' | 'C' | 'D' | 'F';
export type FlowBuildEvaluationInput = {
    plan: FlowBuildPlan;
    trace_events?: FlowBuildTraceEvent[];
    required_clarifications?: number;
    schema_validation_errors?: number;
    unsupported_action_attempts?: number;
    hallucinated_capability_ids?: number;
    compiled_without_validation?: boolean;
};
export type FlowBuildEvaluationSummary = {
    score: number;
    rank: FlowBuildEvaluationRank;
    capability_searches: number;
    premade_steps: number;
    custom_steps: number;
    unsupported_action_attempts: number;
    schema_validation_errors: number;
    hallucinated_capability_ids: number;
    clarification_questions: number;
    missing_fields: number;
    unresolved_missing_fields: number;
    premade_reuse_rate: number;
    strengths: string[];
    risks: string[];
};
export type FlowBuildRequiredNextAction = 'draft_flow_plan' | 'answer_clarification' | 'validate_flow_plan' | 'update_flow_plan_or_clarify' | 'compile_flow_plan' | 'evaluate_flow_plan' | 'ready_for_user_review' | 'blocked';
export type FlowBuildInspectorStage = 'target_selected' | 'needs_clarification' | 'plan_ready' | 'validation_failed' | 'validated' | 'compiled' | 'evaluated' | 'blocked';
export type FlowBuildSessionSummary = {
    session: Record<string, unknown> & {
        status?: FlowBuildSessionStatus;
    };
    plan: FlowBuildPlan | null;
    clarifications: FlowBuildClarification[];
    evaluation?: FlowBuildEvaluationSummary | null;
    required_next_action: FlowBuildRequiredNextAction;
    inspector_stage: FlowBuildInspectorStage;
};
export declare function resolveFlowBuildRequiredNextAction(input: {
    plan: FlowBuildPlan | null;
    sessionStatus?: FlowBuildSessionStatus | null;
    evaluation?: FlowBuildEvaluationSummary | null;
    openClarifications?: number;
}): FlowBuildRequiredNextAction;
export declare function resolveFlowBuildInspectorStage(input: {
    plan: FlowBuildPlan | null;
    sessionStatus?: FlowBuildSessionStatus | null;
    evaluation?: FlowBuildEvaluationSummary | null;
    openClarifications?: number;
}): FlowBuildInspectorStage;
export declare const FLOW_BUILDER_TEMPLATE_TOKENS: FlowBuilderTemplateToken[];
export declare function createFlowBuildContextHash(input: {
    space_id: string;
    view_count: number;
    field_count: number;
    capability_total: number;
    blueprint_count: number;
}): string;
export declare function isPlaceholderFlowDraftName(name: unknown): boolean;
export declare function planHasExecutableSteps(plan: FlowBuildPlan): boolean;
export declare function resolveFlowDraftNameFromPlan(plan: FlowBuildPlan): string | null;
export declare function evaluateFlowBuild(input: FlowBuildEvaluationInput): FlowBuildEvaluationSummary;
