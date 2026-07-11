"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FLOW_WORKFLOW_CAPABILITIES = void 0;
exports.workflowCapabilityFromFlowCapability = workflowCapabilityFromFlowCapability;
exports.searchWorkflowCapabilities = searchWorkflowCapabilities;
exports.getWorkflowCapability = getWorkflowCapability;
exports.buildDefaultWorkflowUiSchema = buildDefaultWorkflowUiSchema;
const flow_capabilities_1 = require("./flow-capabilities");
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 50;
const TEXTAREA_FIELD_PATTERNS = [
    'instructions',
    'prompt',
    'description',
    'body',
    'content',
    'notes',
];
const TEMPLATE_FIELD_PATTERNS = ['template', 'message', 'title', 'query', 'text'];
const RESOURCE_ID_FIELDS = new Set([
    'artifact_id',
    'automation_id',
    'channel_id',
    'contact_id',
    'form_id',
    'tag_id',
    'task_id',
    'view_id',
    'webhook_endpoint_id',
]);
exports.FLOW_WORKFLOW_CAPABILITIES = flow_capabilities_1.FLOW_CAPABILITY_CATALOG.map((capability) => workflowCapabilityFromFlowCapability(capability));
function workflowCapabilityFromFlowCapability(capability) {
    const sideEffect = resolveWorkflowSideEffect(capability);
    return {
        id: capability.id,
        source_capability_id: capability.id,
        kind: capability.kind,
        type: capability.type,
        label: capability.label,
        category: capability.category,
        description: capability.description,
        contract_quality: 'catalog_fields_only',
        input_schema: {
            source: 'flow_capability_catalog',
            required_fields: [...capability.requiredFields],
            optional_fields: [...capability.optionalFields],
            example: { ...capability.example },
        },
        ui_schema: buildDefaultWorkflowUiSchema(capability),
        execution: {
            executor: 'space_automation',
            status: 'available',
        },
        side_effect: sideEffect,
        approval_policy: resolveWorkflowApprovalPolicy(sideEffect),
        compatible_trigger_types: capability.compatibleTriggerTypes
            ? [...capability.compatibleTriggerTypes]
            : undefined,
        contract_gaps: resolveWorkflowContractGaps(capability),
    };
}
function searchWorkflowCapabilities(input = {}) {
    const normalizedQuery = input.query?.trim().toLowerCase() ?? '';
    const limit = Math.min(Math.max(input.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
    const offset = parseCursor(input.cursor);
    const filtered = exports.FLOW_WORKFLOW_CAPABILITIES.filter((capability) => {
        if (input.kind && capability.kind !== input.kind)
            return false;
        if (input.category && capability.category !== input.category)
            return false;
        if (!normalizedQuery)
            return true;
        const searchable = [
            capability.id,
            capability.type,
            capability.label,
            capability.category,
            capability.description,
        ]
            .join(' ')
            .toLowerCase();
        return searchable.includes(normalizedQuery);
    });
    const results = filtered.slice(offset, offset + limit);
    const nextOffset = offset + results.length;
    return {
        results,
        total: filtered.length,
        limit,
        next_cursor: nextOffset < filtered.length ? String(nextOffset) : null,
    };
}
function getWorkflowCapability(capabilityId) {
    return exports.FLOW_WORKFLOW_CAPABILITIES.find((capability) => capability.id === capabilityId) ?? null;
}
function buildDefaultWorkflowUiSchema(capability) {
    const fields = [
        ...capability.requiredFields.map((field) => buildWorkflowUiField(field, true)),
        ...capability.optionalFields.map((field) => buildWorkflowUiField(field, false)),
    ];
    return {
        source: 'derived_default',
        display: 'form',
        fields,
        summary_template: buildWorkflowSummaryTemplate(capability),
    };
}
function buildWorkflowUiField(field, required) {
    return {
        field,
        label: humanizeFieldName(field),
        required,
        control: resolveWorkflowUiControl(field),
    };
}
function resolveWorkflowUiControl(field) {
    if (field === 'schedule')
        return 'schedule_builder';
    if (field === 'timezone')
        return 'timezone_picker';
    if (field === 'agent_key')
        return 'agent_picker';
    if (field === 'connected_account_id')
        return 'connected_account_picker';
    if (field === 'field_id')
        return 'field_picker';
    if (RESOURCE_ID_FIELDS.has(field))
        return 'resource_picker';
    if (field.endsWith('_email') || field === 'email')
        return 'email';
    if (field === 'limit' || field.endsWith('_count') || field.endsWith('_days'))
        return 'number';
    if (field === 'platform' || field === 'provider' || field.endsWith('_status'))
        return 'select';
    if (TEMPLATE_FIELD_PATTERNS.some((pattern) => field.includes(pattern)))
        return 'template_text';
    if (TEXTAREA_FIELD_PATTERNS.some((pattern) => field.includes(pattern)))
        return 'textarea';
    return 'text';
}
function resolveWorkflowSideEffect(capability) {
    if (capability.kind === 'trigger')
        return 'event_source';
    if (['send_email', 'send_slack_message', 'send_channel_message'].includes(capability.type)) {
        return 'external_communication';
    }
    if (['publish_artifact', 'unpublish_artifact', 'create_social_post'].includes(capability.type)) {
        return 'public_publish';
    }
    if (['ingest_youtube_channel_to_agent_brain', 'add_brain_context_to_task'].includes(capability.type)) {
        return 'knowledge_write';
    }
    if (capability.category === 'Connected Apps')
        return 'integration_write';
    if (['scrape_website', 'summarize_brain_context'].includes(capability.type))
        return 'read_only';
    return 'platform_write';
}
function resolveWorkflowApprovalPolicy(sideEffect) {
    if (sideEffect === 'external_communication' ||
        sideEffect === 'public_publish' ||
        sideEffect === 'integration_write' ||
        sideEffect === 'knowledge_write') {
        return 'user_review';
    }
    return 'none';
}
function resolveWorkflowContractGaps(capability) {
    const gaps = ['output_context_contract', 'idempotency_contract', 'runtime_preflight_contract'];
    if (capability.kind === 'trigger') {
        gaps.push('event_payload_contract');
    }
    return gaps;
}
function buildWorkflowSummaryTemplate(capability) {
    const firstRequiredField = capability.requiredFields[0];
    if (!firstRequiredField)
        return capability.label;
    return `${capability.label}: {{${firstRequiredField}}}`;
}
function humanizeFieldName(field) {
    return field
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}
function parseCursor(cursor) {
    if (!cursor)
        return 0;
    const parsed = Number.parseInt(cursor, 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}
//# sourceMappingURL=workflow-capabilities.js.map