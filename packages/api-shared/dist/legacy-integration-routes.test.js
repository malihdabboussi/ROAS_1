"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const legacy_integration_routes_1 = require("./legacy-integration-routes");
(0, vitest_1.describe)('buildLegacyIntegrationHttpRoute', () => {
    (0, vitest_1.it)('resolves camelCase path params from normalized snake_case keys', () => {
        const route = (0, legacy_integration_routes_1.buildLegacyIntegrationHttpRoute)({
            method: 'GET',
            path: '/api/integrations/fathom/recordings/:recordingId/transcript',
        }, { recording_id: '149415442' });
        (0, vitest_1.expect)(route).toEqual({
            method: 'GET',
            path: '/api/integrations/fathom/recordings/149415442/transcript',
        });
    });
    (0, vitest_1.it)('exposes Fathom recording transcript and summary routes', () => {
        (0, vitest_1.expect)((0, legacy_integration_routes_1.getLegacyIntegrationRouteConfig)('fathom', 'get_transcript')).toEqual({
            method: 'GET',
            path: '/api/integrations/fathom/recordings/:recordingId/transcript',
        });
        (0, vitest_1.expect)((0, legacy_integration_routes_1.getLegacyIntegrationRouteConfig)('fathom', 'get_summary')).toEqual({
            method: 'GET',
            path: '/api/integrations/fathom/recordings/:recordingId/summary',
        });
    });
    (0, vitest_1.it)('does not repeat consumed snake_case path params as query params', () => {
        const route = (0, legacy_integration_routes_1.buildLegacyIntegrationHttpRoute)({
            method: 'GET',
            path: '/api/integrations/stripe/products/:productId',
            query_remainder: true,
        }, { product_id: 'prod_123', expand: 'prices' });
        (0, vitest_1.expect)(route).toEqual({
            method: 'GET',
            path: '/api/integrations/stripe/products/prod_123?expand=prices',
        });
    });
    (0, vitest_1.it)('throws an agent-action guidance error when a path param is missing', () => {
        (0, vitest_1.expect)(() => (0, legacy_integration_routes_1.buildLegacyIntegrationHttpRoute)({
            method: 'GET',
            path: '/api/integrations/fathom/recordings/:recordingId/transcript',
        }, {})).toThrow(/data\.params/);
    });
    (0, vitest_1.it)('builds WordPress list routes with query remainder', () => {
        const config = (0, legacy_integration_routes_1.getLegacyIntegrationRouteConfig)('wordpress', 'list_posts');
        (0, vitest_1.expect)(config).toEqual({
            method: 'GET',
            path: '/api/integrations/wordpress/posts',
            query_remainder: true,
        });
        const route = (0, legacy_integration_routes_1.buildLegacyIntegrationHttpRoute)(config, {
            search: 'launch',
            status: 'draft',
            per_page: 20,
        });
        (0, vitest_1.expect)(route).toEqual({
            method: 'GET',
            path: '/api/integrations/wordpress/posts?search=launch&status=draft&per_page=20',
        });
    });
    (0, vitest_1.it)('builds WordPress update routes from post id params', () => {
        const config = (0, legacy_integration_routes_1.getLegacyIntegrationRouteConfig)('wordpress', 'update_post');
        (0, vitest_1.expect)(config).toEqual({
            method: 'PATCH',
            path: '/api/integrations/wordpress/posts/:postId',
        });
        const route = (0, legacy_integration_routes_1.buildLegacyIntegrationHttpRoute)(config, {
            post_id: '123',
            title: 'Updated title',
        });
        (0, vitest_1.expect)(route).toEqual({
            method: 'PATCH',
            path: '/api/integrations/wordpress/posts/123',
            body: { title: 'Updated title' },
        });
    });
    (0, vitest_1.it)('builds SEO Research POST routes with params as request body', () => {
        const config = (0, legacy_integration_routes_1.getLegacyIntegrationRouteConfig)('dataforseo', 'google_serp');
        (0, vitest_1.expect)(config).toEqual({
            method: 'POST',
            path: '/api/integrations/dataforseo/serp/google/organic',
        });
        const route = (0, legacy_integration_routes_1.buildLegacyIntegrationHttpRoute)(config, {
            keyword: 'ai landing page builder',
            location_code: 2840,
            language_code: 'en',
        });
        (0, vitest_1.expect)(route).toEqual({
            method: 'POST',
            path: '/api/integrations/dataforseo/serp/google/organic',
            body: {
                keyword: 'ai landing page builder',
                location_code: 2840,
                language_code: 'en',
            },
        });
    });
});
//# sourceMappingURL=legacy-integration-routes.test.js.map