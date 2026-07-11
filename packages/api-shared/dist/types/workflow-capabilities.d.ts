import { type FlowCapability, type FlowCapabilityKind } from './flow-capabilities';
export type WorkflowCapabilityKind = FlowCapabilityKind | 'blueprint' | 'context_reader' | 'control';
export type WorkflowCapabilitySchemaSource = 'flow_capability_catalog' | 'agent_action_schema' | 'authored_contract';
export type WorkflowCapabilityUiSchemaSource = 'derived_default' | 'authored_contract';
export type WorkflowCapabilityContractQuality = 'catalog_fields_only' | 'schema_backed' | 'authored_contract' | 'runtime_verified';
export type WorkflowCapabilitySideEffect = 'event_source' | 'read_only' | 'platform_write' | 'knowledge_write' | 'external_communication' | 'public_publish' | 'integration_write' | 'destructive' | 'derived_unknown';
export type WorkflowCapabilityApprovalPolicy = 'none' | 'user_review' | 'admin_review' | 'unknown';
export type WorkflowCapabilityUiControl = 'text' | 'textarea' | 'template_text' | 'number' | 'email' | 'select' | 'agent_picker' | 'connected_account_picker' | 'field_picker' | 'resource_picker' | 'schedule_builder' | 'timezone_picker';
export type WorkflowCapabilityUiField = {
    field: string;
    label: string;
    required: boolean;
    control: WorkflowCapabilityUiControl;
    required_group?: string[];
};
export type WorkflowCapabilityUiSchema = {
    source: WorkflowCapabilityUiSchemaSource;
    display: 'form';
    fields: WorkflowCapabilityUiField[];
    summary_template: string;
};
export type WorkflowCapabilityInputSchema = {
    source: WorkflowCapabilitySchemaSource;
    required_fields: Array<string | string[]>;
    optional_fields: string[];
    example: Record<string, unknown>;
};
export type WorkflowCapabilityExecution = {
    executor: 'space_automation' | 'agent_action' | 'manual_blueprint' | 'unknown';
    status: 'available' | 'needs_executor' | 'on_hold';
};
export type WorkflowCapability = {
    id: string;
    source_capability_id: string;
    kind: WorkflowCapabilityKind;
    type: string;
    label: string;
    category: string;
    description: string;
    contract_quality: WorkflowCapabilityContractQuality;
    input_schema: WorkflowCapabilityInputSchema;
    ui_schema: WorkflowCapabilityUiSchema;
    execution: WorkflowCapabilityExecution;
    side_effect: WorkflowCapabilitySideEffect;
    approval_policy: WorkflowCapabilityApprovalPolicy;
    compatible_trigger_types?: string[];
    contract_gaps: string[];
};
export type WorkflowCapabilitySearchInput = {
    query?: string | null;
    kind?: WorkflowCapabilityKind | null;
    category?: string | null;
    limit?: number | null;
    cursor?: string | null;
};
export type WorkflowCapabilitySearchResult = {
    results: WorkflowCapability[];
    total: number;
    limit: number;
    next_cursor: string | null;
};
export declare const FLOW_WORKFLOW_CAPABILITIES: WorkflowCapability[];
export declare function workflowCapabilityFromFlowCapability(capability: FlowCapability): WorkflowCapability;
export declare function searchWorkflowCapabilities(input?: WorkflowCapabilitySearchInput): WorkflowCapabilitySearchResult;
export declare function getWorkflowCapability(capabilityId: string): WorkflowCapability | null;
export declare function buildDefaultWorkflowUiSchema(capability: FlowCapability): WorkflowCapabilityUiSchema;
