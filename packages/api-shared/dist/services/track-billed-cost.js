"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackBilledCost = trackBilledCost;
async function writeHealthLog(healthLog, opts, reason, errorMessage, usageJson) {
    if (!healthLog)
        return;
    try {
        await healthLog.from('billing_health_log').insert({
            feature: opts.feature,
            action: opts.action,
            user_id: opts.userId,
            model_name: opts.modelName,
            reason,
            error_message: errorMessage ?? null,
            usage_json: usageJson ?? null,
            metadata: {
                service_type: opts.serviceType,
                org_id: opts.orgId ?? null,
                campaign_id: opts.campaignId ?? null,
                conversation_id: opts.conversationId ?? null,
                ...(opts.metadata ?? {}),
            },
        });
    }
    catch {
    }
}
async function trackBilledCost(opts, fn, credits, healthLog) {
    const { result, costData } = await fn();
    if (!costData) {
        await writeHealthLog(healthLog, opts, 'no_cost_data', 'Provider returned no usage/cost data');
        return { result, billingStatus: 'no_cost_data' };
    }
    try {
        let billingResult = null;
        switch (costData.type) {
            case 'text': {
                billingResult = await credits.processDirectTextUsage({
                    userId: opts.userId,
                    orgId: opts.orgId ?? undefined,
                    campaignId: opts.campaignId,
                    conversationId: opts.conversationId,
                    feature: opts.feature,
                    action: opts.action,
                    modelName: opts.modelName,
                    usage: costData.usage,
                    costSource: opts.costSource ??
                        (costData.providerCost !== undefined ? 'provider_direct' : 'gateway_tokens'),
                    preComputedCost: costData.providerCost,
                    generationIds: costData.generationIds,
                    metadata: opts.metadata,
                });
                break;
            }
            case 'image': {
                if (costData.fixedCostUsd !== undefined && credits.processFixedCostUsage) {
                    billingResult = await credits.processFixedCostUsage({
                        userId: opts.userId,
                        orgId: opts.orgId ?? undefined,
                        campaignId: opts.campaignId,
                        feature: opts.feature,
                        action: opts.action,
                        provider: opts.provider ?? 'google',
                        modelName: opts.modelName,
                        serviceType: 'image',
                        apiCostUsd: costData.fixedCostUsd,
                        costSource: opts.costSource ?? 'fixed_pricing',
                        metadata: opts.metadata,
                    });
                }
                else if (credits.processImageUsage) {
                    billingResult = await credits.processImageUsage({
                        userId: opts.userId,
                        orgId: opts.orgId ?? undefined,
                        campaignId: opts.campaignId,
                        modelName: opts.modelName,
                    });
                }
                break;
            }
            case 'video': {
                if (credits.processFixedCostUsage) {
                    billingResult = await credits.processFixedCostUsage({
                        userId: opts.userId,
                        orgId: opts.orgId ?? undefined,
                        campaignId: opts.campaignId,
                        feature: opts.feature,
                        action: opts.action,
                        provider: opts.provider ?? 'google',
                        modelName: opts.modelName,
                        serviceType: 'video',
                        apiCostUsd: costData.fixedCostUsd,
                        costSource: opts.costSource ?? 'fixed_pricing',
                        metadata: opts.metadata,
                    });
                }
                break;
            }
            case 'audio': {
                if (credits.processTranscribeUsage) {
                    billingResult = await credits.processTranscribeUsage({
                        userId: opts.userId,
                        orgId: opts.orgId ?? undefined,
                        durationMinutes: costData.durationMinutes,
                        modelName: opts.modelName,
                    });
                }
                break;
            }
            case 'fixed': {
                if (credits.processFixedCostUsage) {
                    billingResult = await credits.processFixedCostUsage({
                        userId: opts.userId,
                        orgId: opts.orgId ?? undefined,
                        campaignId: opts.campaignId,
                        feature: opts.feature,
                        action: opts.action,
                        provider: opts.provider ?? 'unknown',
                        modelName: opts.modelName,
                        serviceType: 'image',
                        apiCostUsd: costData.fixedCostUsd,
                        costSource: opts.costSource ?? 'fixed_pricing',
                        metadata: opts.metadata,
                    });
                }
                break;
            }
        }
        if (!billingResult) {
            await writeHealthLog(healthLog, opts, 'billing_returned_null', `processUsage returned null for ${costData.type}`, costData);
            return { result, billingStatus: 'billing_failed' };
        }
        return {
            result,
            billingStatus: 'billed',
            apiCost: billingResult.apiCost,
            creditsCharged: billingResult.credits,
        };
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await writeHealthLog(healthLog, opts, 'billing_failed', msg, costData);
        return { result, billingStatus: 'billing_failed' };
    }
}
//# sourceMappingURL=track-billed-cost.js.map