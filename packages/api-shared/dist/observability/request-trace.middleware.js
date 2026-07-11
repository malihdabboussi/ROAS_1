"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRequestTraceMiddleware = createRequestTraceMiddleware;
const crypto_1 = require("crypto");
function firstHeader(headers, names) {
    for (const name of names) {
        const value = headers[name.toLowerCase()];
        const first = Array.isArray(value) ? value[0] : value;
        if (typeof first === 'string' && first.trim().length > 0)
            return first.trim();
    }
    return null;
}
function sanitizeRoute(route) {
    const queryIndex = route.indexOf('?');
    return queryIndex >= 0 ? route.slice(0, queryIndex) : route;
}
function defaultAlwaysTraceRoute(route) {
    return route.startsWith('/api/chat') || route.startsWith('/api/apps');
}
function createRequestTraceMiddleware(reporter, options) {
    return (req, res, next) => {
        const incomingRequestId = firstHeader(req.headers, [
            'x-vibey-request-id',
            'x-request-id',
            'x-vercel-id',
        ]);
        const requestId = incomingRequestId ?? (0, crypto_1.randomUUID)();
        const spanId = firstHeader(req.headers, ['x-vibey-span-id']) ?? (0, crypto_1.randomUUID)();
        const parentSpanId = firstHeader(req.headers, ['x-vibey-parent-span-id']);
        const route = sanitizeRoute(req.originalUrl ?? req.url ?? 'unknown');
        const startedAt = Date.now();
        const alwaysTrace = options.alwaysTraceRoute ?? defaultAlwaysTraceRoute;
        req.headers['x-vibey-request-id'] = requestId;
        req.headers['x-vibey-span-id'] = spanId;
        res.setHeader('x-vibey-request-id', requestId);
        res.setHeader('x-vibey-span-id', spanId);
        res.on('finish', () => {
            const shouldReport = Boolean(incomingRequestId) || res.statusCode >= 400 || alwaysTrace(route);
            if (!shouldReport)
                return;
            reporter.report({
                request_id: requestId,
                trace_id: firstHeader(req.headers, ['x-vibey-trace-id', 'x-trace-id']),
                message_id: firstHeader(req.headers, ['x-vibey-message-id', 'x-message-id']),
                run_id: firstHeader(req.headers, ['x-vibey-run-id', 'x-run-id']),
                conversation_id: firstHeader(req.headers, [
                    'x-vibey-conversation-id',
                    'x-conversation-id',
                ]),
                user_id: req.user?.id ?? null,
                org_id: req.orgId ?? firstHeader(req.headers, ['x-org-id']),
                surface: options.surface,
                service: options.service ?? options.surface,
                route,
                method: req.method ?? null,
                event_type: 'http_request',
                stage: 'complete',
                status: res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'ok',
                status_code: res.statusCode,
                duration_ms: Date.now() - startedAt,
                span_id: spanId,
                parent_span_id: parentSpanId,
                observability: { incoming_request_id: Boolean(incomingRequestId) },
            });
        });
        next();
    };
}
//# sourceMappingURL=request-trace.middleware.js.map