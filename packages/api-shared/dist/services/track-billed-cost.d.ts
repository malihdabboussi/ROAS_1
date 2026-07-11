export type BilledServiceType = 'text' | 'image' | 'video' | 'audio' | 'fixed';
export interface TokenUsageData {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
    totalTokens: number;
}
export type CostData = {
    type: 'text';
    usage: TokenUsageData;
    providerCost?: number;
    generationIds?: string[];
} | {
    type: 'image';
    fixedCostUsd?: number;
} | {
    type: 'video';
    fixedCostUsd: number;
} | {
    type: 'audio';
    durationMinutes: number;
} | {
    type: 'fixed';
    fixedCostUsd: number;
};
export interface TrackBilledCostOptions {
    feature: string;
    action: string;
    serviceType: BilledServiceType;
    userId: string;
    orgId?: string | null;
    modelName: string;
    provider?: string;
    campaignId?: string;
    conversationId?: string;
    costSource?: string;
    metadata?: Record<string, unknown>;
}
export interface BilledCostResult<T> {
    result: T;
    billingStatus: 'billed' | 'billing_failed' | 'no_cost_data';
    apiCost?: number;
    creditsCharged?: number;
}
export interface CreditsBillingAdapter {
    processDirectTextUsage(params: {
        userId: string;
        orgId?: string | null;
        campaignId?: string;
        conversationId?: string;
        feature: string;
        action?: string;
        modelName: string;
        usage: TokenUsageData;
        costSource?: string;
        metadata?: Record<string, unknown>;
        preComputedCost?: number;
        generationIds?: string[];
    }): Promise<{
        credits: number;
        balance: unknown;
        apiCost: number;
    } | null>;
    processImageUsage?(params: {
        userId: string;
        orgId?: string | null;
        campaignId?: string;
        modelName?: string;
    }): Promise<{
        credits: number;
        balance: unknown;
        apiCost: number;
    } | null>;
    processFixedCostUsage?(params: {
        userId: string;
        orgId?: string | null;
        campaignId?: string;
        conversationId?: string;
        feature: string;
        action: string;
        provider: string;
        modelName: string;
        serviceType: 'image' | 'video';
        apiCostUsd: number;
        costSource?: string;
        metadata?: Record<string, unknown>;
    }): Promise<{
        credits: number;
        balance: unknown;
        apiCost: number;
    }>;
    processTranscribeUsage?(params: {
        userId: string;
        orgId?: string | null;
        durationMinutes: number;
        modelName?: string;
    }): Promise<{
        credits: number;
        balance: unknown;
        apiCost: number;
    } | null>;
}
export interface HealthLogWriter {
    from(table: 'billing_health_log'): {
        insert(row: Record<string, unknown>): {
            then?: unknown;
        };
    };
}
export declare function trackBilledCost<T>(opts: TrackBilledCostOptions, fn: () => Promise<{
    result: T;
    costData?: CostData;
}>, credits: CreditsBillingAdapter, healthLog?: HealthLogWriter): Promise<BilledCostResult<T>>;
