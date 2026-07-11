export type FlowCapabilityKind = 'trigger' | 'action';
export type FlowCapability = {
    id: string;
    kind: FlowCapabilityKind;
    type: string;
    label: string;
    category: string;
    description: string;
    requiredFields: string[];
    optionalFields: string[];
    compatibleTriggerTypes?: string[];
    example: Record<string, unknown>;
};
export type FlowCapabilitySearchInput = {
    query?: string | null;
    kind?: FlowCapabilityKind | null;
    category?: string | null;
    limit?: number | null;
    cursor?: string | null;
};
export type FlowCapabilitySearchResult = {
    results: FlowCapability[];
    total: number;
    limit: number;
    next_cursor: string | null;
};
export declare const FLOW_CAPABILITY_CATALOG: readonly FlowCapability[];
export declare function searchFlowCapabilities(input?: FlowCapabilitySearchInput): FlowCapabilitySearchResult;
export declare function getFlowCapability(capabilityId: string): FlowCapability | null;
