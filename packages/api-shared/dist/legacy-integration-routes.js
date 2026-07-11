"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEGACY_INTEGRATION_ROUTE_MAP = void 0;
exports.buildLegacyIntegrationHttpRoute = buildLegacyIntegrationHttpRoute;
exports.getLegacyIntegrationRouteConfig = getLegacyIntegrationRouteConfig;
exports.listLegacyIntegrationRouteRows = listLegacyIntegrationRouteRows;
function toSnakeCaseKey(key) {
    return key
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
        .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
        .replace(/[-\s]+/g, '_')
        .toLowerCase();
}
function resolvePathParamValue(params, name) {
    if (params[name] !== undefined && params[name] !== null && String(params[name]).trim() !== '') {
        return { value: params[name], usedKey: name };
    }
    const snakeName = toSnakeCaseKey(name);
    if (snakeName !== name &&
        params[snakeName] !== undefined &&
        params[snakeName] !== null &&
        String(params[snakeName]).trim() !== '') {
        return { value: params[snakeName], usedKey: snakeName };
    }
    throw new Error(`Integration path parameter "${name}" is required. Pass integration action inputs inside data.params using the exact parameter names returned by get_integration or search_available_integrations.`);
}
function buildLegacyIntegrationHttpRoute(config, params) {
    if (config.ghl_proxy) {
        const { gh_method, gh_path: ghPathTemplate, gh_version } = config.ghl_proxy;
        const pathParamNames = [];
        const pathParamKeys = [];
        const resolvedGhPath = ghPathTemplate.replace(/:([a-zA-Z0-9_]+)/g, (_, name) => {
            pathParamNames.push(name);
            const resolved = resolvePathParamValue(params, name);
            pathParamKeys.push(resolved.usedKey);
            return encodeURIComponent(String(resolved.value));
        });
        const ghPathNormalized = resolvedGhPath.startsWith('/') ? resolvedGhPath : `/${resolvedGhPath}`;
        const gh_query = {};
        for (const [k, v] of Object.entries(config.fixed_query ?? {})) {
            gh_query[k] = v;
        }
        const usedKeys = new Set([...pathParamNames, ...pathParamKeys]);
        for (const [paramKey, queryKey] of Object.entries(config.query_params ?? {})) {
            if (params[paramKey] === undefined || params[paramKey] === null)
                continue;
            gh_query[queryKey] = String(params[paramKey]);
            usedKeys.add(paramKey);
        }
        if (config.query_remainder && (gh_method === 'GET' || gh_method === 'DELETE')) {
            for (const [k, v] of Object.entries(params)) {
                if (usedKeys.has(k))
                    continue;
                if (v === undefined || v === null)
                    continue;
                if (typeof v === 'object' && !Array.isArray(v))
                    continue;
                gh_query[k] = String(v);
                usedKeys.add(k);
            }
        }
        const proxyBody = {
            gh_method,
            gh_path: ghPathNormalized,
        };
        if (Object.keys(gh_query).length > 0)
            proxyBody.gh_query = gh_query;
        if (gh_version)
            proxyBody.gh_version = gh_version;
        if (gh_method === 'POST' || gh_method === 'PUT' || gh_method === 'PATCH') {
            const gh_body = { ...params };
            for (const pk of pathParamNames) {
                delete gh_body[pk];
            }
            for (const qk of Object.keys(config.query_params ?? {})) {
                delete gh_body[qk];
            }
            for (const fk of Object.keys(config.fixed_query ?? {})) {
                delete gh_body[fk];
            }
            if (Object.keys(gh_body).length > 0)
                proxyBody.gh_body = gh_body;
        }
        return { method: 'POST', path: config.path, body: proxyBody };
    }
    let pathTemplate = config.path;
    if (config.alt_when &&
        config.alt_path &&
        params[config.alt_when] != null &&
        String(params[config.alt_when]).trim() !== '') {
        pathTemplate = config.alt_path;
    }
    const pathParamNames = [];
    const pathParamKeys = [];
    const resolvedPath = pathTemplate.replace(/:([a-zA-Z0-9_]+)/g, (_, name) => {
        pathParamNames.push(name);
        const resolved = resolvePathParamValue(params, name);
        pathParamKeys.push(resolved.usedKey);
        return encodeURIComponent(String(resolved.value));
    });
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(config.fixed_query ?? {})) {
        qs.set(k, v);
    }
    const usedKeys = new Set([...pathParamNames, ...pathParamKeys]);
    for (const [paramKey, queryKey] of Object.entries(config.query_params ?? {})) {
        if (params[paramKey] === undefined || params[paramKey] === null)
            continue;
        qs.set(queryKey, String(params[paramKey]));
        usedKeys.add(paramKey);
    }
    if (config.query_remainder && config.method === 'GET') {
        for (const [k, v] of Object.entries(params)) {
            if (usedKeys.has(k))
                continue;
            if (v === undefined || v === null)
                continue;
            if (typeof v === 'object' && !Array.isArray(v))
                continue;
            qs.set(k, String(v));
            usedKeys.add(k);
        }
    }
    const q = qs.toString();
    const fullPath = q ? `${resolvedPath}?${q}` : resolvedPath;
    if (config.method === 'GET' || config.method === 'DELETE') {
        return { method: config.method, path: fullPath };
    }
    const body = { ...params };
    for (const pk of pathParamNames) {
        delete body[pk];
    }
    for (const pk of pathParamKeys) {
        delete body[pk];
    }
    for (const qk of Object.keys(config.query_params ?? {})) {
        delete body[qk];
    }
    return { method: config.method, path: fullPath, body };
}
const FB = '/api/integrations/fanbasis';
const CAL = '/api/integrations/calendly';
const STR = '/api/integrations/stripe';
const PP = '/api/integrations/paypal';
const FATH = '/api/integrations/fathom';
const FF = '/api/integrations/fireflies';
const LHG = '/api/integrations/lhg';
const DBX = '/api/integrations/dropbox';
const AC = '/api/integrations/active-campaign';
const SC = '/api/integrations/scrapecreators';
const DFS = '/api/integrations/dataforseo';
const SLK = '/api/integrations/slack';
const WP = '/api/integrations/wordpress';
const CALENDLY_ROUTES = {
    list_event_types: { method: 'GET', path: `${CAL}/event-types` },
    get_event_type: { method: 'GET', path: `${CAL}/event-types/:uuid` },
    create_event_type: { method: 'POST', path: `${CAL}/event-types` },
    update_event_type: { method: 'PATCH', path: `${CAL}/event-types/:uuid` },
    create_one_off_event_type: { method: 'POST', path: `${CAL}/one-off-event-types` },
    list_scheduled_events: {
        method: 'GET',
        path: `${CAL}/scheduled-events`,
        query_remainder: true,
    },
    cancel_scheduled_event: { method: 'POST', path: `${CAL}/scheduled-events/:uuid/cancel` },
    list_available_times: {
        method: 'GET',
        path: `${CAL}/available-times`,
        query_params: {
            event_type_uri: 'event_type',
            start_time: 'start_time',
            end_time: 'end_time',
        },
    },
};
const STRIPE_ROUTES = {
    list_products: { method: 'GET', path: `${STR}/products` },
    create_product: {
        method: 'POST',
        path: `${STR}/products`,
        alt_path: `${STR}/campaigns/:campaign_id/products`,
        alt_when: 'campaign_id',
    },
    update_product: { method: 'PATCH', path: `${STR}/products/:productId` },
    delete_product: { method: 'DELETE', path: `${STR}/products/:productId` },
    list_prices: { method: 'GET', path: `${STR}/prices` },
    create_price: {
        method: 'POST',
        path: `${STR}/prices`,
        alt_path: `${STR}/campaigns/:campaign_id/prices`,
        alt_when: 'campaign_id',
    },
    list_payment_links: { method: 'GET', path: `${STR}/payment-links` },
    create_payment_link: {
        method: 'POST',
        path: `${STR}/payment-links`,
        alt_path: `${STR}/campaigns/:campaign_id/payment-links`,
        alt_when: 'campaign_id',
    },
    create_coupon: {
        method: 'POST',
        path: `${STR}/coupons`,
        alt_path: `${STR}/campaigns/:campaign_id/coupons`,
        alt_when: 'campaign_id',
    },
    create_refund: { method: 'POST', path: `${STR}/refunds` },
    get_overview: {
        method: 'GET',
        path: `${STR}/analytics/overview`,
        query_params: { fromUnix: 'from', toUnix: 'to' },
    },
    get_campaign_overview: {
        method: 'GET',
        path: `${STR}/analytics/campaign-overview`,
        query_params: { campaignId: 'campaign_id', fromUnix: 'from', toUnix: 'to' },
    },
    get_campaign_products: { method: 'GET', path: `${STR}/campaigns/:campaignId/products` },
    get_campaign_payment_links: { method: 'GET', path: `${STR}/campaigns/:campaignId/payment-links` },
    get_campaign_coupons: { method: 'GET', path: `${STR}/campaigns/:campaignId/coupons` },
    get_product_prices: { method: 'GET', path: `${STR}/products/:productId/prices` },
};
const PAYPAL_ROUTES = {
    search_transactions: {
        method: 'GET',
        path: `${PP}/transactions`,
        query_remainder: true,
    },
    get_transaction: {
        method: 'GET',
        path: `${PP}/transactions/:transactionId`,
        query_remainder: true,
    },
    get_balance: {
        method: 'GET',
        path: `${PP}/balance`,
        query_remainder: true,
    },
};
const FATHOM_ROUTES = {
    list_meetings: { method: 'GET', path: `${FATH}/meetings`, query_remainder: true },
    get_transcript: { method: 'GET', path: `${FATH}/recordings/:recordingId/transcript` },
    get_summary: { method: 'GET', path: `${FATH}/recordings/:recordingId/summary` },
    list_webhooks: { method: 'GET', path: `${FATH}/webhooks` },
    create_webhook: { method: 'POST', path: `${FATH}/webhooks` },
    delete_webhook: { method: 'DELETE', path: `${FATH}/webhooks/:webhookId` },
};
const FIREFLIES_ROUTES = {
    list_transcripts: { method: 'GET', path: `${FF}/transcripts`, query_remainder: true },
    get_transcript: { method: 'GET', path: `${FF}/transcripts/:transcriptId` },
    get_transcript_sentences: {
        method: 'GET',
        path: `${FF}/transcripts/:transcriptId`,
        fixed_query: { sentences: 'true' },
    },
    get_user: { method: 'GET', path: `${FF}/user` },
    sync: { method: 'POST', path: `${FF}/sync` },
};
const GOHIGHLEVEL_ROUTES = {
    upsert_lead_contact: { method: 'POST', path: `${LHG}/upsert-lead-contact` },
};
const DROPBOX_ROUTES = {
    list_files: { method: 'GET', path: `${DBX}/files`, query_remainder: true },
    search_files: {
        method: 'GET',
        path: `${DBX}/search`,
        query_params: { query: 'query', path: 'path' },
    },
    get_file_metadata: { method: 'GET', path: `${DBX}/files`, query_params: { path: 'path' } },
    download_file: { method: 'GET', path: `${DBX}/files/download`, query_params: { path: 'path' } },
    upload_file: { method: 'POST', path: `${DBX}/files/upload` },
    delete_file: { method: 'DELETE', path: `${DBX}/files`, query_params: { path: 'path' } },
    create_shared_link: { method: 'POST', path: `${DBX}/files/share` },
    move_file: { method: 'POST', path: `${DBX}/files/move` },
};
const ACTIVE_CAMPAIGN_ROUTES = {
    list_contacts: { method: 'GET', path: `${AC}/contacts`, query_remainder: true },
    get_contact: { method: 'GET', path: `${AC}/contacts/:id` },
    create_contact: { method: 'POST', path: `${AC}/contacts` },
    update_contact: { method: 'PUT', path: `${AC}/contacts/:id` },
    delete_contact: { method: 'DELETE', path: `${AC}/contacts/:id` },
    sync_contact: { method: 'POST', path: `${AC}/contacts/sync` },
    get_contact_field_values: { method: 'GET', path: `${AC}/contacts/:id/field-values` },
    get_contact_automations: { method: 'GET', path: `${AC}/contacts/:id/automations` },
    get_contact_deals: { method: 'GET', path: `${AC}/contacts/:id/deals` },
    get_contact_score: { method: 'GET', path: `${AC}/contacts/:id/score` },
    add_contact_tag: { method: 'POST', path: `${AC}/contact-tags` },
    remove_contact_tag: { method: 'DELETE', path: `${AC}/contact-tags/:id` },
    update_list_status: { method: 'POST', path: `${AC}/contact-lists` },
    list_notes: { method: 'GET', path: `${AC}/notes`, query_remainder: true },
    get_note: { method: 'GET', path: `${AC}/notes/:id` },
    create_note: { method: 'POST', path: `${AC}/notes` },
    update_note: { method: 'PUT', path: `${AC}/notes/:id` },
    delete_note: { method: 'DELETE', path: `${AC}/notes/:id` },
    list_tags: { method: 'GET', path: `${AC}/tags`, query_remainder: true },
    get_tag: { method: 'GET', path: `${AC}/tags/:id` },
    create_tag: { method: 'POST', path: `${AC}/tags` },
    update_tag: { method: 'PUT', path: `${AC}/tags/:id` },
    delete_tag: { method: 'DELETE', path: `${AC}/tags/:id` },
    list_lists: { method: 'GET', path: `${AC}/lists`, query_remainder: true },
    get_list: { method: 'GET', path: `${AC}/lists/:id` },
    create_list: { method: 'POST', path: `${AC}/lists` },
    update_list: { method: 'PUT', path: `${AC}/lists/:id` },
    delete_list: { method: 'DELETE', path: `${AC}/lists/:id` },
    list_deals: { method: 'GET', path: `${AC}/deals`, query_remainder: true },
    get_deal: { method: 'GET', path: `${AC}/deals/:id` },
    create_deal: { method: 'POST', path: `${AC}/deals` },
    update_deal: { method: 'PUT', path: `${AC}/deals/:id` },
    delete_deal: { method: 'DELETE', path: `${AC}/deals/:id` },
    list_deal_activities: { method: 'GET', path: `${AC}/deal-activities`, query_remainder: true },
    create_deal_note: { method: 'POST', path: `${AC}/deal-notes` },
    update_deal_note: { method: 'PUT', path: `${AC}/deal-notes/:id` },
    delete_deal_note: { method: 'DELETE', path: `${AC}/deal-notes/:id` },
    list_pipelines: { method: 'GET', path: `${AC}/pipelines`, query_remainder: true },
    get_pipeline: { method: 'GET', path: `${AC}/pipelines/:id` },
    create_pipeline: { method: 'POST', path: `${AC}/pipelines` },
    delete_pipeline: { method: 'DELETE', path: `${AC}/pipelines/:id` },
    list_stages: { method: 'GET', path: `${AC}/stages`, query_remainder: true },
    get_stage: { method: 'GET', path: `${AC}/stages/:id` },
    create_stage: { method: 'POST', path: `${AC}/stages` },
    update_stage: { method: 'PUT', path: `${AC}/stages/:id` },
    delete_stage: { method: 'DELETE', path: `${AC}/stages/:id` },
    list_deal_custom_fields: {
        method: 'GET',
        path: `${AC}/deal-custom-fields`,
        query_remainder: true,
    },
    get_deal_custom_field: { method: 'GET', path: `${AC}/deal-custom-fields/:id` },
    create_deal_custom_field: { method: 'POST', path: `${AC}/deal-custom-fields` },
    update_deal_custom_field: { method: 'PUT', path: `${AC}/deal-custom-fields/:id` },
    delete_deal_custom_field: { method: 'DELETE', path: `${AC}/deal-custom-fields/:id` },
    list_accounts: { method: 'GET', path: `${AC}/accounts`, query_remainder: true },
    get_account: { method: 'GET', path: `${AC}/accounts/:id` },
    create_account: { method: 'POST', path: `${AC}/accounts` },
    update_account: { method: 'PUT', path: `${AC}/accounts/:id` },
    delete_account: { method: 'DELETE', path: `${AC}/accounts/:id` },
    create_account_note: { method: 'POST', path: `${AC}/account-notes` },
    list_automations: { method: 'GET', path: `${AC}/automations`, query_remainder: true },
    add_contact_to_automation: { method: 'POST', path: `${AC}/contact-automations` },
    remove_contact_from_automation: { method: 'DELETE', path: `${AC}/contact-automations/:id` },
    list_campaigns: { method: 'GET', path: `${AC}/campaigns`, query_remainder: true },
    get_campaign: { method: 'GET', path: `${AC}/campaigns/:id` },
    create_campaign: { method: 'POST', path: `${AC}/campaigns` },
    update_campaign: { method: 'PUT', path: `${AC}/campaigns/:id` },
    get_campaign_links: { method: 'GET', path: `${AC}/campaigns/:id/links` },
    list_messages: { method: 'GET', path: `${AC}/messages`, query_remainder: true },
    get_message: { method: 'GET', path: `${AC}/messages/:id` },
    create_message: { method: 'POST', path: `${AC}/messages` },
    update_message: { method: 'PUT', path: `${AC}/messages/:id` },
    delete_message: { method: 'DELETE', path: `${AC}/messages/:id` },
    list_custom_fields: { method: 'GET', path: `${AC}/fields`, query_remainder: true },
    get_custom_field: { method: 'GET', path: `${AC}/fields/:id` },
    create_custom_field: { method: 'POST', path: `${AC}/fields` },
    update_custom_field: { method: 'PUT', path: `${AC}/fields/:id` },
    list_webhooks: { method: 'GET', path: `${AC}/webhooks`, query_remainder: true },
    get_webhook: { method: 'GET', path: `${AC}/webhooks/:id` },
    create_webhook: { method: 'POST', path: `${AC}/webhooks` },
    update_webhook: { method: 'PUT', path: `${AC}/webhooks/:id` },
    delete_webhook: { method: 'DELETE', path: `${AC}/webhooks/:id` },
    list_tasks: { method: 'GET', path: `${AC}/tasks`, query_remainder: true },
    get_task: { method: 'GET', path: `${AC}/tasks/:id` },
    create_task: { method: 'POST', path: `${AC}/tasks` },
    update_task: { method: 'PUT', path: `${AC}/tasks/:id` },
    list_users: { method: 'GET', path: `${AC}/users`, query_remainder: true },
    get_user: { method: 'GET', path: `${AC}/users/:id` },
    list_forms: { method: 'GET', path: `${AC}/forms`, query_remainder: true },
    get_form: { method: 'GET', path: `${AC}/forms/:id` },
    list_segments: { method: 'GET', path: `${AC}/segments`, query_remainder: true },
    get_segment: { method: 'GET', path: `${AC}/segments/:id` },
    list_scores: { method: 'GET', path: `${AC}/scores`, query_remainder: true },
    get_score: { method: 'GET', path: `${AC}/scores/:id` },
    list_saved_responses: { method: 'GET', path: `${AC}/saved-responses`, query_remainder: true },
    get_saved_response: { method: 'GET', path: `${AC}/saved-responses/:id` },
    create_saved_response: { method: 'POST', path: `${AC}/saved-responses` },
    update_saved_response: { method: 'PUT', path: `${AC}/saved-responses/:id` },
    delete_saved_response: { method: 'DELETE', path: `${AC}/saved-responses/:id` },
    track_event: { method: 'POST', path: `${AC}/tracking/events` },
    list_orders: { method: 'GET', path: `${AC}/ecom-orders`, query_remainder: true },
    get_order: { method: 'GET', path: `${AC}/ecom-orders/:id` },
    create_order: { method: 'POST', path: `${AC}/ecom-orders` },
    update_order: { method: 'PUT', path: `${AC}/ecom-orders/:id` },
    delete_order: { method: 'DELETE', path: `${AC}/ecom-orders/:id` },
    list_ecom_customers: { method: 'GET', path: `${AC}/ecom-customers`, query_remainder: true },
    list_addresses: { method: 'GET', path: `${AC}/addresses`, query_remainder: true },
    create_address: { method: 'POST', path: `${AC}/addresses` },
    delete_address: { method: 'DELETE', path: `${AC}/addresses/:id` },
};
const FANBASIS_ROUTES = {
    list_products: { method: 'GET', path: `${FB}/products`, query_remainder: true },
    create_checkout_session: { method: 'POST', path: `${FB}/checkout-sessions` },
    get_checkout_session: { method: 'GET', path: `${FB}/checkout-sessions/:id` },
    delete_checkout_session: { method: 'DELETE', path: `${FB}/checkout-sessions/:id` },
    create_embedded_checkout_session: { method: 'POST', path: `${FB}/checkout-sessions/embedded` },
    get_transactions: { method: 'GET', path: `${FB}/transactions`, query_remainder: true },
    get_transaction: { method: 'GET', path: `${FB}/transactions/:transactionId` },
    get_checkout_session_transactions: {
        method: 'GET',
        path: `${FB}/checkout-sessions/:id/transactions`,
        query_remainder: true,
    },
    refund_transaction: {
        method: 'POST',
        path: `${FB}/checkout-sessions/transactions/:transactionId/refund`,
    },
    get_product_subscriptions: {
        method: 'GET',
        path: `${FB}/checkout-sessions/:productId/subscriptions`,
        query_remainder: true,
    },
    get_checkout_session_subscriptions: {
        method: 'GET',
        path: `${FB}/checkout-sessions/:id/session-subscriptions`,
        query_remainder: true,
    },
    cancel_subscription: {
        method: 'DELETE',
        path: `${FB}/checkout-sessions/:sessionId/subscriptions/:subscriptionId`,
    },
    extend_subscription: {
        method: 'POST',
        path: `${FB}/checkout-sessions/:sessionId/extend-subscription`,
    },
    create_webhook_subscription: { method: 'POST', path: `${FB}/webhook-subscriptions` },
    get_webhook_subscriptions: { method: 'GET', path: `${FB}/webhook-subscriptions` },
    delete_webhook_subscription: { method: 'DELETE', path: `${FB}/webhook-subscriptions/:id` },
    test_webhook_subscription: { method: 'POST', path: `${FB}/webhook-subscriptions/:id/test` },
    get_customers: { method: 'GET', path: `${FB}/customers`, query_remainder: true },
    charge_customer: { method: 'POST', path: `${FB}/customers/:customerId/charge` },
    get_customer_payment_methods: {
        method: 'GET',
        path: `${FB}/customers/:customerId/payment-methods`,
    },
    get_subscribers: { method: 'GET', path: `${FB}/subscribers`, query_remainder: true },
    list_discount_codes: { method: 'GET', path: `${FB}/discount-codes`, query_remainder: true },
    create_discount_code: { method: 'POST', path: `${FB}/discount-codes` },
    get_discount_code: { method: 'GET', path: `${FB}/discount-codes/:id` },
    update_discount_code: { method: 'PUT', path: `${FB}/discount-codes/:id` },
    delete_discount_code: { method: 'DELETE', path: `${FB}/discount-codes/:id` },
};
const SCRAPECREATORS_ROUTES = {
    tiktok_profile: {
        method: 'GET',
        path: `${SC}/tiktok/profile`,
        query_params: { handle: 'handle' },
    },
    tiktok_video_transcript: {
        method: 'GET',
        path: `${SC}/tiktok/video/transcript`,
        query_params: { url: 'url' },
    },
    instagram_profile: {
        method: 'GET',
        path: `${SC}/instagram/profile`,
        query_params: { handle: 'handle' },
    },
    instagram_media_transcript: {
        method: 'GET',
        path: `${SC}/instagram/media/transcript`,
        query_params: { url: 'url' },
    },
    youtube_video_transcript: {
        method: 'GET',
        path: `${SC}/youtube/video/transcript`,
        query_params: { url: 'url' },
    },
    youtube_channel: {
        method: 'GET',
        path: `${SC}/youtube/channel`,
        query_params: { url: 'url' },
    },
    twitter_profile: {
        method: 'GET',
        path: `${SC}/twitter/profile`,
        query_params: { handle: 'handle' },
    },
    twitter_tweet_transcript: {
        method: 'GET',
        path: `${SC}/twitter/tweet/transcript`,
        query_params: { url: 'url' },
    },
    facebook_profile: {
        method: 'GET',
        path: `${SC}/facebook/profile`,
        query_params: { url: 'url' },
    },
    facebook_post_transcript: {
        method: 'GET',
        path: `${SC}/facebook/post/transcript`,
        query_params: { url: 'url' },
    },
    linkedin_profile: {
        method: 'GET',
        path: `${SC}/linkedin/profile`,
        query_params: { url: 'url' },
    },
    linkedin_company: {
        method: 'GET',
        path: `${SC}/linkedin/company`,
        query_params: { url: 'url' },
    },
};
const DATAFORSEO_ROUTES = {
    keyword_overview: { method: 'POST', path: `${DFS}/keyword/overview` },
    keyword_ideas: { method: 'POST', path: `${DFS}/keyword/ideas` },
    google_serp: { method: 'POST', path: `${DFS}/serp/google/organic` },
    competitors_domain: { method: 'POST', path: `${DFS}/competitors/domain` },
    backlinks_summary: { method: 'POST', path: `${DFS}/backlinks/summary` },
};
const SLACK_ROUTES = {
    SLACK_SEARCH_MESSAGES: {
        method: 'GET',
        path: `${SLK}/search-messages`,
        query_remainder: true,
    },
    SLACK_SEARCH_FILES: {
        method: 'GET',
        path: `${SLK}/search-files`,
        query_remainder: true,
    },
    SLACK_LIST_CHANNELS: { method: 'GET', path: `${SLK}/channels` },
    SLACK_LIST_USERS: { method: 'GET', path: `${SLK}/users` },
    SLACK_GET_USER_INFO: {
        method: 'GET',
        path: `${SLK}/user-info`,
        query_params: { slack_user_id: 'slack_user_id' },
    },
    SLACK_FIND_USER_BY_EMAIL: {
        method: 'GET',
        path: `${SLK}/user-by-email`,
        query_params: { email: 'email' },
    },
    SLACK_SEND_MESSAGE: { method: 'POST', path: `${SLK}/send-message` },
    SLACK_UPDATE_MESSAGE: { method: 'POST', path: `${SLK}/update-message` },
    SLACK_DELETE_MESSAGE: { method: 'POST', path: `${SLK}/delete-message` },
    SLACK_GET_CHANNEL_HISTORY: {
        method: 'GET',
        path: `${SLK}/channel-history`,
        query_remainder: true,
    },
    SLACK_GET_THREAD_REPLIES: {
        method: 'GET',
        path: `${SLK}/thread-replies`,
        query_remainder: true,
    },
    SLACK_ADD_REACTION: { method: 'POST', path: `${SLK}/add-reaction` },
    SLACK_REMOVE_REACTION: { method: 'POST', path: `${SLK}/remove-reaction` },
    SLACK_OPEN_DM: { method: 'POST', path: `${SLK}/open-dm` },
    SLACK_UPLOAD_FILE: { method: 'POST', path: `${SLK}/upload-file` },
    SLACK_GET_FILE_INFO: {
        method: 'GET',
        path: `${SLK}/file-info`,
        query_params: { file_id: 'file_id' },
    },
};
const WORDPRESS_ROUTES = {
    list_posts: { method: 'GET', path: `${WP}/posts`, query_remainder: true },
    create_post: { method: 'POST', path: `${WP}/posts` },
    update_post: { method: 'PATCH', path: `${WP}/posts/:postId` },
    publish_blog_post: { method: 'POST', path: `${WP}/posts/publish-blog-post` },
    list_pages: { method: 'GET', path: `${WP}/pages`, query_remainder: true },
    create_page: { method: 'POST', path: `${WP}/pages` },
    update_page: { method: 'PATCH', path: `${WP}/pages/:pageId` },
    upload_media: { method: 'POST', path: `${WP}/media` },
    list_categories: { method: 'GET', path: `${WP}/categories`, query_remainder: true },
    create_category: { method: 'POST', path: `${WP}/categories` },
    list_tags: { method: 'GET', path: `${WP}/tags`, query_remainder: true },
    create_tag: { method: 'POST', path: `${WP}/tags` },
    get_site_info: { method: 'GET', path: `${WP}/site` },
};
exports.LEGACY_INTEGRATION_ROUTE_MAP = {
    calendly: CALENDLY_ROUTES,
    stripe: STRIPE_ROUTES,
    paypal: PAYPAL_ROUTES,
    fathom: FATHOM_ROUTES,
    fireflies: FIREFLIES_ROUTES,
    gohighlevel: GOHIGHLEVEL_ROUTES,
    dropbox: DROPBOX_ROUTES,
    active_campaign: ACTIVE_CAMPAIGN_ROUTES,
    scrapecreators: SCRAPECREATORS_ROUTES,
    dataforseo: DATAFORSEO_ROUTES,
    fanbasis: FANBASIS_ROUTES,
    slack: SLACK_ROUTES,
    wordpress: WORDPRESS_ROUTES,
};
function getLegacyIntegrationRouteConfig(integrationId, actionSlug) {
    const iid = integrationId.trim().toLowerCase();
    const slug = actionSlug.trim();
    return exports.LEGACY_INTEGRATION_ROUTE_MAP[iid]?.[slug] ?? null;
}
function listLegacyIntegrationRouteRows() {
    const out = [];
    for (const [integration_id, actions] of Object.entries(exports.LEGACY_INTEGRATION_ROUTE_MAP)) {
        for (const [action_slug, route_config] of Object.entries(actions)) {
            out.push({ integration_id, action_slug, route_config });
        }
    }
    return out;
}
//# sourceMappingURL=legacy-integration-routes.js.map