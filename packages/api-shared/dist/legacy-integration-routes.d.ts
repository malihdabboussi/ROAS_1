export type LegacyHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type GhlProxyRouteTarget = {
    gh_method: LegacyHttpMethod;
    gh_path: string;
    gh_version?: string;
};
export type IntegrationLegacyRouteConfig = {
    method: LegacyHttpMethod;
    path: string;
    query_params?: Record<string, string>;
    fixed_query?: Record<string, string>;
    alt_path?: string;
    alt_when?: string;
    query_remainder?: boolean;
    ghl_proxy?: GhlProxyRouteTarget;
};
export declare function buildLegacyIntegrationHttpRoute(config: IntegrationLegacyRouteConfig, params: Record<string, unknown>): {
    method: LegacyHttpMethod;
    path: string;
    body?: Record<string, unknown>;
};
export declare const LEGACY_INTEGRATION_ROUTE_MAP: Record<string, Record<string, IntegrationLegacyRouteConfig>>;
export declare function getLegacyIntegrationRouteConfig(integrationId: string, actionSlug: string): IntegrationLegacyRouteConfig | null;
export declare function listLegacyIntegrationRouteRows(): Array<{
    integration_id: string;
    action_slug: string;
    route_config: IntegrationLegacyRouteConfig;
}>;
