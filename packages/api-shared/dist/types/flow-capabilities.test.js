"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const flow_capabilities_1 = require("./flow-capabilities");
(0, vitest_1.describe)('flow capabilities catalog', () => {
    (0, vitest_1.it)('returns bounded, paginated results instead of a flat full catalog', () => {
        const result = (0, flow_capabilities_1.searchFlowCapabilities)({ limit: 5 });
        (0, vitest_1.expect)(result.results).toHaveLength(5);
        (0, vitest_1.expect)(result.total).toBeGreaterThan(5);
        (0, vitest_1.expect)(result.limit).toBe(5);
        (0, vitest_1.expect)(result.next_cursor).toBe('5');
    });
    (0, vitest_1.it)('filters by query, kind, and category', () => {
        const result = (0, flow_capabilities_1.searchFlowCapabilities)({
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
    (0, vitest_1.it)('looks up a capability by stable id and exposes required fields', () => {
        const capability = (0, flow_capabilities_1.getFlowCapability)('action.add_comment');
        (0, vitest_1.expect)(capability).toMatchObject({
            id: 'action.add_comment',
            kind: 'action',
            type: 'add_comment',
            requiredFields: ['message_template'],
        });
        (0, vitest_1.expect)((0, flow_capabilities_1.getFlowCapability)('action.custom_reusable_step')).toBeNull();
        (0, vitest_1.expect)(flow_capabilities_1.FLOW_CAPABILITY_CATALOG.some((item) => item.id.includes('custom_reusable'))).toBe(false);
    });
    (0, vitest_1.it)('exposes agent output and completion controls for agent-run flow steps', () => {
        const capability = (0, flow_capabilities_1.getFlowCapability)('action.send_to_agent');
        (0, vitest_1.expect)(capability).toMatchObject({
            id: 'action.send_to_agent',
            requiredFields: ['agent_key', 'prompt_template'],
        });
        (0, vitest_1.expect)(capability?.optionalFields).toEqual(vitest_1.expect.arrayContaining(['output_type', 'completed_status', 'continuation']));
        (0, vitest_1.expect)(capability?.example).toMatchObject({
            type: 'send_to_agent',
            output_type: 'document_artifact',
            continuation: 'after_task_completes',
            completed_status: 'in_review',
        });
    });
    (0, vitest_1.it)('exposes first-party webhook triggers with the endpoint id contract', () => {
        const capability = (0, flow_capabilities_1.getFlowCapability)('trigger.webhook_received');
        (0, vitest_1.expect)(capability).toMatchObject({
            id: 'trigger.webhook_received',
            kind: 'trigger',
            type: 'webhook_received',
            category: 'Webhooks',
            requiredFields: ['webhook_endpoint_id'],
            example: {
                type: 'webhook_received',
                webhook_endpoint_id: 'webhook_endpoint_id',
            },
        });
    });
    (0, vitest_1.it)('describes Slack sender analysis separately from recipient and Person Brain scope', () => {
        const capability = (0, flow_capabilities_1.getFlowCapability)('action.observe_slack_team');
        (0, vitest_1.expect)(capability?.description).toContain('every non-Ignored sender');
        (0, vitest_1.expect)(capability?.description).toContain('person_ids restricts Active delivery');
    });
});
//# sourceMappingURL=flow-capabilities.test.js.map