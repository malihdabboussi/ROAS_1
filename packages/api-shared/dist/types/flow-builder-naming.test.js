"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const flow_builder_1 = require("./flow-builder");
function basePlan(overrides = {}) {
    return {
        name: 'Untitled flow draft',
        intent: 'Build a flow',
        status: 'planned',
        trigger: null,
        actions: [],
        trace_events: [],
        validation_errors: [],
        ...overrides,
    };
}
(0, vitest_1.describe)('isPlaceholderFlowDraftName', () => {
    (0, vitest_1.it)('treats default draft labels as placeholders', () => {
        (0, vitest_1.expect)((0, flow_builder_1.isPlaceholderFlowDraftName)('Untitled flow draft')).toBe(true);
        (0, vitest_1.expect)((0, flow_builder_1.isPlaceholderFlowDraftName)('New flow build')).toBe(true);
        (0, vitest_1.expect)((0, flow_builder_1.isPlaceholderFlowDraftName)('')).toBe(true);
    });
    (0, vitest_1.it)('keeps real names', () => {
        (0, vitest_1.expect)((0, flow_builder_1.isPlaceholderFlowDraftName)('Fathom Recording: Summarize and Notify')).toBe(false);
    });
});
(0, vitest_1.describe)('resolveFlowDraftNameFromPlan', () => {
    (0, vitest_1.it)('uses plan name when it is not a placeholder', () => {
        const plan = basePlan({
            name: 'Fathom Recording: Summarize and Notify',
            trigger: {
                id: 'trigger-1',
                kind: 'trigger',
                title: 'Fathom recording ready',
                description: '',
                source: 'premade',
                payload: { type: 'external_fathom_recording_ready' },
                missing_fields: [],
                compatibility_warnings: [],
            },
        });
        (0, vitest_1.expect)((0, flow_builder_1.resolveFlowDraftNameFromPlan)(plan)).toBe('Fathom Recording: Summarize and Notify');
    });
    (0, vitest_1.it)('derives a name from trigger and action titles when the draft is still untitled', () => {
        const plan = basePlan({
            trigger: {
                id: 'trigger-1',
                kind: 'trigger',
                title: 'Fathom recording ready',
                description: '',
                source: 'premade',
                payload: { type: 'external_fathom_recording_ready' },
                missing_fields: [],
                compatibility_warnings: [],
            },
            actions: [
                {
                    id: 'action-1',
                    kind: 'action',
                    title: 'Summarize call',
                    description: '',
                    source: 'premade',
                    payload: { type: 'send_to_agent' },
                    missing_fields: [],
                    compatibility_warnings: [],
                },
                {
                    id: 'action-2',
                    kind: 'action',
                    title: 'Notify Slack',
                    description: '',
                    source: 'premade',
                    payload: { type: 'send_slack_message' },
                    missing_fields: [],
                    compatibility_warnings: [],
                },
            ],
        });
        (0, vitest_1.expect)((0, flow_builder_1.resolveFlowDraftNameFromPlan)(plan)).toBe('Fathom recording ready: Summarize call → Notify Slack');
    });
    (0, vitest_1.it)('does not rename when there are no steps yet', () => {
        (0, vitest_1.expect)((0, flow_builder_1.resolveFlowDraftNameFromPlan)(basePlan())).toBeNull();
    });
});
//# sourceMappingURL=flow-builder-naming.test.js.map