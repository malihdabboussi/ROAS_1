"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const flow_capabilities_1 = require("./flow-capabilities");
const workflow_capabilities_1 = require("./workflow-capabilities");
(0, vitest_1.describe)('workflow capabilities catalog', () => {
    (0, vitest_1.it)('wraps every current flow capability without changing stable ids', () => {
        (0, vitest_1.expect)(workflow_capabilities_1.FLOW_WORKFLOW_CAPABILITIES).toHaveLength(flow_capabilities_1.FLOW_CAPABILITY_CATALOG.length);
        (0, vitest_1.expect)((0, workflow_capabilities_1.getWorkflowCapability)('action.add_comment')).toMatchObject({
            id: 'action.add_comment',
            source_capability_id: 'action.add_comment',
            contract_quality: 'catalog_fields_only',
            input_schema: {
                source: 'flow_capability_catalog',
                required_fields: ['message_template'],
            },
            ui_schema: {
                source: 'derived_default',
            },
        });
    });
    (0, vitest_1.it)('returns bounded, paginated workflow capabilities', () => {
        const result = (0, workflow_capabilities_1.searchWorkflowCapabilities)({ limit: 5 });
        (0, vitest_1.expect)(result.results).toHaveLength(5);
        (0, vitest_1.expect)(result.total).toBeGreaterThan(5);
        (0, vitest_1.expect)(result.limit).toBe(5);
        (0, vitest_1.expect)(result.next_cursor).toBe('5');
    });
    (0, vitest_1.it)('marks schedule triggers as event sources with schedule UI controls', () => {
        const capability = (0, workflow_capabilities_1.getWorkflowCapability)('trigger.schedule');
        (0, vitest_1.expect)(capability).toMatchObject({
            kind: 'trigger',
            side_effect: 'event_source',
            approval_policy: 'none',
        });
        (0, vitest_1.expect)(capability?.ui_schema.fields).toContainEqual({
            field: 'schedule',
            label: 'Schedule',
            required: true,
            control: 'schedule_builder',
        });
    });
    (0, vitest_1.it)('marks webhook triggers as compile-ready event sources with endpoint picker UI', () => {
        const capability = (0, workflow_capabilities_1.getWorkflowCapability)('trigger.webhook_received');
        (0, vitest_1.expect)(capability).toMatchObject({
            kind: 'trigger',
            type: 'webhook_received',
            execution: {
                executor: 'space_automation',
                status: 'available',
            },
            side_effect: 'event_source',
            approval_policy: 'none',
        });
        (0, vitest_1.expect)(capability?.ui_schema.fields).toContainEqual({
            field: 'webhook_endpoint_id',
            label: 'Webhook Endpoint Id',
            required: true,
            control: 'resource_picker',
        });
    });
    (0, vitest_1.it)('marks external communication actions for user review', () => {
        const capability = (0, workflow_capabilities_1.getWorkflowCapability)('action.send_email');
        (0, vitest_1.expect)(capability).toMatchObject({
            kind: 'action',
            side_effect: 'external_communication',
            approval_policy: 'user_review',
            input_schema: {
                required_fields: ['tool_slug', 'connected_account_id', 'to'],
                optional_fields: vitest_1.expect.arrayContaining(['subject_template', 'body_template']),
            },
        });
        (0, vitest_1.expect)(capability?.ui_schema.fields).toContainEqual({
            field: 'to',
            label: 'To',
            required: true,
            control: 'text',
        });
    });
    (0, vitest_1.it)('filters by query, kind, and category', () => {
        const result = (0, workflow_capabilities_1.searchWorkflowCapabilities)({
            query: 'status',
            kind: 'trigger',
            category: 'Tasks',
            limit: 10,
        });
        (0, vitest_1.expect)(result.results.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(result.results.every((capability) => capability.kind === 'trigger')).toBe(true);
        (0, vitest_1.expect)(result.results.every((capability) => capability.category === 'Tasks')).toBe(true);
        (0, vitest_1.expect)(result.results.some((capability) => capability.id === 'trigger.status_change')).toBe(true);
    });
    (0, vitest_1.it)('returns null for unknown workflow capabilities', () => {
        (0, vitest_1.expect)((0, workflow_capabilities_1.getWorkflowCapability)('action.custom_reusable_step')).toBeNull();
    });
});
//# sourceMappingURL=workflow-capabilities.test.js.map