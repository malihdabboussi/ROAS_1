"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FLOW_BUILDER_TEMPLATE_TOKENS = void 0;
exports.resolveFlowBuildRequiredNextAction = resolveFlowBuildRequiredNextAction;
exports.resolveFlowBuildInspectorStage = resolveFlowBuildInspectorStage;
exports.createFlowBuildContextHash = createFlowBuildContextHash;
exports.isPlaceholderFlowDraftName = isPlaceholderFlowDraftName;
exports.planHasExecutableSteps = planHasExecutableSteps;
exports.resolveFlowDraftNameFromPlan = resolveFlowDraftNameFromPlan;
exports.evaluateFlowBuild = evaluateFlowBuild;
function resolveFlowBuildRequiredNextAction(input) {
    const sessionStatus = input.sessionStatus ?? input.plan?.status ?? 'intake';
    if (sessionStatus === 'blocked')
        return 'blocked';
    if (sessionStatus === 'clarifying' || (input.openClarifications ?? 0) > 0) {
        return 'answer_clarification';
    }
    if (sessionStatus === 'intake' || sessionStatus === 'planning' || !input.plan) {
        return 'draft_flow_plan';
    }
    const validationFailed = input.plan.validation_errors.length > 0;
    const hasDraftedSteps = !!input.plan.trigger || input.plan.actions.length > 0;
    if (!hasDraftedSteps && !validationFailed)
        return 'draft_flow_plan';
    if (validationFailed)
        return 'update_flow_plan_or_clarify';
    if (input.plan.status === 'planned')
        return 'validate_flow_plan';
    if (input.plan.status === 'validated')
        return 'compile_flow_plan';
    if (input.plan.status === 'compiled') {
        return input.evaluation ? 'ready_for_user_review' : 'evaluate_flow_plan';
    }
    return 'validate_flow_plan';
}
function resolveFlowBuildInspectorStage(input) {
    const sessionStatus = input.sessionStatus ?? input.plan?.status ?? 'intake';
    if (sessionStatus === 'blocked')
        return 'blocked';
    if (sessionStatus === 'clarifying' || (input.openClarifications ?? 0) > 0) {
        return 'needs_clarification';
    }
    if (!input.plan)
        return 'target_selected';
    const hasDraftedSteps = !!input.plan.trigger || input.plan.actions.length > 0;
    if (!hasDraftedSteps && input.plan.validation_errors.length === 0)
        return 'target_selected';
    if (input.plan.validation_errors.length > 0)
        return 'validation_failed';
    if (input.plan.status === 'validated')
        return 'validated';
    if (input.plan.status === 'compiled')
        return input.evaluation ? 'evaluated' : 'compiled';
    return 'plan_ready';
}
exports.FLOW_BUILDER_TEMPLATE_TOKENS = [
    {
        token: '{{task.title}}',
        label: 'Task title',
        source: 'space',
        description: 'Title of the triggering or created task.',
    },
    {
        token: '{{task.description}}',
        label: 'Task description',
        source: 'space',
        description: 'Description or notes for the task in context.',
    },
    {
        token: '{{contact.email}}',
        label: 'Contact email',
        source: 'space',
        description: 'Email for the contact in context.',
    },
    {
        token: '{{trigger.payload}}',
        label: 'Trigger payload',
        source: 'integration',
        description: 'Raw payload from an external connected-app trigger.',
    },
    {
        token: '{{steps.1.output}}',
        label: 'Previous step output',
        source: 'platform',
        description: 'Output from the prior flow step (use Step 1, Step 2, … in the editor).',
    },
];
function createFlowBuildContextHash(input) {
    return [
        input.space_id,
        input.view_count,
        input.field_count,
        input.capability_total,
        input.blueprint_count,
    ].join(':');
}
const PLACEHOLDER_FLOW_DRAFT_NAMES = new Set([
    'untitled flow draft',
    'untitled flow',
    'untitled',
    'new flow build',
]);
function isPlaceholderFlowDraftName(name) {
    const normalized = typeof name === 'string' ? name.trim().toLowerCase() : '';
    return normalized.length === 0 || PLACEHOLDER_FLOW_DRAFT_NAMES.has(normalized);
}
function planHasExecutableSteps(plan) {
    return !!plan.trigger || plan.actions.length > 0;
}
function resolveFlowDraftNameFromPlan(plan) {
    if (!planHasExecutableSteps(plan))
        return null;
    const explicitName = plan.name?.trim();
    if (explicitName && !isPlaceholderFlowDraftName(explicitName)) {
        return explicitName.slice(0, 200);
    }
    const triggerTitle = plan.trigger?.title?.trim();
    const actionTitles = plan.actions
        .map((step) => step.title?.trim())
        .filter((title) => Boolean(title));
    if (triggerTitle && actionTitles.length > 0) {
        return `${triggerTitle}: ${actionTitles.join(' → ')}`.slice(0, 200);
    }
    if (triggerTitle)
        return triggerTitle.slice(0, 200);
    if (actionTitles.length > 0)
        return actionTitles.join(' → ').slice(0, 200);
    const intent = plan.intent?.trim();
    if (intent && intent.length >= 4 && !isPlaceholderFlowDraftName(intent)) {
        return intent.slice(0, 80);
    }
    return null;
}
function evaluateFlowBuild(input) {
    const traceEvents = input.trace_events ?? input.plan.trace_events ?? [];
    const planSteps = [input.plan.trigger, ...input.plan.actions].filter((step) => !!step);
    const capabilitySearches = traceEvents.filter((event) => event.type === 'capabilities_searched').length;
    const premadeSteps = planSteps.filter((step) => step.source === 'premade').length;
    const customSteps = input.plan.actions.filter((step) => step.source === 'custom_blueprint').length;
    const unsupportedSteps = planSteps.filter((step) => step.source === 'unsupported_candidate').length;
    const missingFields = planSteps.reduce((count, step) => count + step.missing_fields.length, 0);
    const requiredClarifications = input.required_clarifications ?? 0;
    const unresolvedMissingFields = Math.max(0, missingFields - requiredClarifications);
    const unsupportedActionAttempts = input.unsupported_action_attempts ??
        unsupportedSteps +
            traceEvents.filter((event) => event.type === 'unsupported_request_detected').length;
    const schemaValidationErrors = input.schema_validation_errors ??
        input.plan.validation_errors.length +
            traceEvents.filter((event) => event.type === 'schema_validation_failed').length;
    const hallucinatedCapabilityIds = input.hallucinated_capability_ids ?? 0;
    const clarificationQuestions = requiredClarifications;
    const totalSteps = (input.plan.trigger ? 1 : 0) + input.plan.actions.length;
    const premadeReuseRate = totalSteps === 0 ? 0 : premadeSteps / totalSteps;
    let score = 100;
    if (capabilitySearches === 0)
        score -= 25;
    if (premadeSteps === 0 && totalSteps > 0)
        score -= 15;
    if (premadeReuseRate < 0.5 && totalSteps > 1)
        score -= 10;
    score -= Math.min(customSteps * 15, 30);
    if (requiredClarifications > 0 && clarificationQuestions === 0)
        score -= 20;
    if (input.compiled_without_validation)
        score -= 20;
    score -= Math.min(unresolvedMissingFields * 8, 32);
    score -= Math.min(schemaValidationErrors * 8, 32);
    score -= Math.min(unsupportedActionAttempts * 15, 45);
    score -= Math.min(hallucinatedCapabilityIds * 25, 50);
    score = Math.max(0, Math.min(100, score));
    const strengths = [];
    const risks = [];
    if (capabilitySearches > 0)
        strengths.push('searched capabilities before planning');
    else
        risks.push('planned without capability search evidence');
    if (premadeReuseRate >= 0.5)
        strengths.push('reused premade capabilities first');
    else
        risks.push('low premade reuse rate');
    if (clarificationQuestions > 0)
        strengths.push('asked clarifying questions for missing inputs');
    if (missingFields > 0 && unresolvedMissingFields === 0) {
        strengths.push('tracked missing fields with clarifications');
    }
    if (unresolvedMissingFields > 0)
        risks.push('missing fields were not fully clarified');
    if (customSteps > 0)
        risks.push('custom blueprint steps need stricter validation than premade steps');
    if (schemaValidationErrors > 0)
        risks.push('schema validation errors need repair');
    if (unsupportedActionAttempts > 0)
        risks.push('unsupported requests were attempted or detected');
    if (hallucinatedCapabilityIds > 0)
        risks.push('referenced capabilities outside the catalog');
    return {
        score,
        rank: rankFlowBuildScore(score),
        capability_searches: capabilitySearches,
        premade_steps: premadeSteps,
        custom_steps: customSteps,
        unsupported_action_attempts: unsupportedActionAttempts,
        schema_validation_errors: schemaValidationErrors,
        hallucinated_capability_ids: hallucinatedCapabilityIds,
        clarification_questions: clarificationQuestions,
        missing_fields: missingFields,
        unresolved_missing_fields: unresolvedMissingFields,
        premade_reuse_rate: Number(premadeReuseRate.toFixed(2)),
        strengths,
        risks,
    };
}
function rankFlowBuildScore(score) {
    if (score >= 90)
        return 'A';
    if (score >= 80)
        return 'B';
    if (score >= 65)
        return 'C';
    if (score >= 50)
        return 'D';
    return 'F';
}
//# sourceMappingURL=flow-builder.js.map