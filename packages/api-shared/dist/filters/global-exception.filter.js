"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var GlobalExceptionFilter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
const auth_errors_1 = require("../services/auth-errors");
const error_reporter_service_1 = require("../services/error-reporter.service");
const transient_error_util_1 = require("../services/transient-error.util");
function isNestHttpException(exception) {
    if (exception instanceof common_1.HttpException)
        return true;
    if (typeof exception !== 'object' || exception === null)
        return false;
    const e = exception;
    return typeof e.getStatus === 'function' && typeof e.getResponse === 'function';
}
function isAppErrorAlreadyReported(exception) {
    return (typeof exception === 'object' &&
        exception !== null &&
        '__appErrorReported' in exception &&
        exception.__appErrorReported === true);
}
const INTEGRATION_REPORTABLE_4XX = new Set([402, 429, 502]);
function shouldReportIntegrationClientError(status, path) {
    if (!INTEGRATION_REPORTABLE_4XX.has(status))
        return false;
    return path.includes('social-research') || path.includes('/integrations/');
}
function collectCauseChain(err, maxDepth = 3) {
    const causes = [];
    let current = err instanceof Error ? err.cause : undefined;
    for (let i = 0; i < maxDepth && current; i++) {
        causes.push(current instanceof Error ? current.message : String(current));
        current = current instanceof Error ? current.cause : undefined;
    }
    return causes;
}
function safeBodySnippet(req) {
    const method = req.method?.toUpperCase();
    if (!method || !['POST', 'PUT', 'PATCH'].includes(method))
        return undefined;
    if (!req.body || typeof req.body !== 'object')
        return undefined;
    try {
        return JSON.stringify(req.body).slice(0, 500);
    }
    catch {
        return undefined;
    }
}
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function firstHeader(headers, keys) {
    if (!headers)
        return null;
    for (const key of keys) {
        const value = headers[key] ?? headers[key.toLowerCase()];
        const first = Array.isArray(value) ? value[0] : value;
        if (typeof first === 'string' && first.trim().length > 0)
            return first.trim();
    }
    return null;
}
function readBodyString(body, keys) {
    if (!isRecord(body))
        return null;
    for (const key of keys) {
        const value = body[key];
        if (typeof value === 'string' && value.trim().length > 0)
            return value.trim();
    }
    return null;
}
function readParamString(params, keys) {
    if (!params)
        return null;
    for (const key of keys) {
        const value = params[key];
        if (typeof value === 'string' && value.trim().length > 0)
            return value.trim();
    }
    return null;
}
function collectCorrelationIds(request) {
    if (!request)
        return {};
    const traceId = firstHeader(request.headers, ['x-vibey-trace-id', 'x-trace-id']) ??
        readBodyString(request.body, ['trace_id', 'traceId']);
    const messageId = firstHeader(request.headers, ['x-vibey-message-id', 'x-message-id']) ??
        readBodyString(request.body, ['message_id', 'messageId']);
    const requestId = firstHeader(request.headers, ['x-vibey-request-id', 'x-request-id', 'x-vercel-id']) ??
        readBodyString(request.body, ['request_id', 'requestId']);
    const runId = firstHeader(request.headers, ['x-vibey-run-id', 'x-run-id']) ??
        readBodyString(request.body, ['run_id', 'runId']);
    const conversationId = firstHeader(request.headers, ['x-vibey-conversation-id', 'x-conversation-id']) ??
        readParamString(request.params, ['conversation_id', 'conversationId']) ??
        readBodyString(request.body, ['conversation_id', 'conversationId']);
    return {
        ...(traceId ? { trace_id: traceId } : {}),
        ...(messageId ? { message_id: messageId } : {}),
        ...(requestId ? { request_id: requestId } : {}),
        ...(runId ? { run_id: runId } : {}),
        ...(conversationId ? { conversation_id: conversationId } : {}),
    };
}
let GlobalExceptionFilter = GlobalExceptionFilter_1 = class GlobalExceptionFilter {
    errorReporter;
    logger = new common_1.Logger(GlobalExceptionFilter_1.name);
    appName;
    constructor(errorReporter) {
        this.errorReporter = errorReporter;
        this.appName = process.env.APP_NAME ?? 'api';
    }
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        const path = request?.path ?? request?.url ?? 'unknown';
        let status = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Internal server error';
        if (isNestHttpException(exception)) {
            status = exception.getStatus();
            const res = exception.getResponse();
            if (typeof res === 'object' && res !== null) {
                if (!response.headersSent) {
                    response.status(status).json(res);
                }
                if (status >= 500) {
                    this.reportError(status, path, request, exception);
                }
                else if (shouldReportIntegrationClientError(status, path)) {
                    this.reportError(status, path, request, exception);
                }
                return;
            }
            message = typeof res === 'string' ? res : (res.message ?? message);
            if (status >= 500) {
                this.reportError(status, path, request, exception);
            }
            else if (shouldReportIntegrationClientError(status, path)) {
                this.reportError(status, path, request, exception);
            }
        }
        else if (exception instanceof auth_errors_1.AuthUpstreamUnavailableError ||
            exception instanceof common_1.ServiceUnavailableException ||
            exception instanceof common_1.BadGatewayException ||
            (0, transient_error_util_1.isTransientNetworkError)(exception)) {
            status = common_1.HttpStatus.SERVICE_UNAVAILABLE;
            message = 'Service temporarily unavailable';
            const msg = exception instanceof Error ? exception.message : String(exception);
            const code = exception && typeof exception === 'object' && 'code' in exception
                ? exception.code
                : '';
            const cause = exception instanceof Error && exception.cause ? String(exception.cause) : '';
            this.logger.warn(`[API] transient_unavailable_503 path=${path} error=${msg} code=${code || 'none'} cause=${cause || 'none'}`);
            this.reportError(503, path, request, exception);
        }
        else {
            const msg = exception instanceof Error ? exception.message : String(exception);
            this.logger.error(`[API] unhandled_error path=${path} error=${msg}`, exception instanceof Error ? exception.stack : exception);
            this.reportError(500, path, request, exception);
        }
        response.status(status).json({ error: message });
    }
    reportError(status, path, request, exception) {
        if (!this.errorReporter)
            return;
        if (isAppErrorAlreadyReported(exception))
            return;
        const msg = exception instanceof Error ? exception.message : String(exception);
        const userId = request?.user?.id;
        const orgId = request?.orgId;
        const method = request?.method;
        const params = request?.params && Object.keys(request.params).length > 0 ? request.params : undefined;
        const bodySnippet = request ? safeBodySnippet(request) : undefined;
        const causes = collectCauseChain(exception);
        const correlation = collectCorrelationIds(request);
        let responseBody;
        if (isNestHttpException(exception)) {
            const res = exception.getResponse();
            if (typeof res === 'object' && res !== null) {
                try {
                    responseBody = JSON.parse(JSON.stringify(res));
                }
                catch {
                }
            }
        }
        const context = { path, status, method };
        if (userId)
            context.userId = userId;
        if (orgId)
            context.orgId = orgId;
        Object.assign(context, correlation);
        if (params)
            context.params = params;
        if (bodySnippet)
            context.bodySnippet = bodySnippet;
        if (causes.length > 0)
            context.causes = causes;
        if (responseBody)
            context.responseBody = responseBody;
        this.errorReporter.report({
            app: this.appName,
            severity: status >= 500 ? 'error' : 'warn',
            feature: 'http',
            error_code: `http_${status}`,
            message: `${path} — ${msg}`,
            category: status === 503 ? 'infra' : 'http',
            context,
            stack: exception instanceof Error ? exception.stack : undefined,
            user_id: userId,
            trace_id: correlation.trace_id,
            message_id: correlation.message_id,
            request_id: correlation.request_id,
            run_id: correlation.run_id,
            conversation_id: correlation.conversation_id,
        });
    }
};
exports.GlobalExceptionFilter = GlobalExceptionFilter;
exports.GlobalExceptionFilter = GlobalExceptionFilter = GlobalExceptionFilter_1 = __decorate([
    (0, common_1.Catch)(),
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Optional)()),
    __metadata("design:paramtypes", [error_reporter_service_1.ErrorReporter])
], GlobalExceptionFilter);
//# sourceMappingURL=global-exception.filter.js.map