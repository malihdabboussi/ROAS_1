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
var ErrorReporter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorReporter = void 0;
const common_1 = require("@nestjs/common");
const public_1 = require("../observability/public");
const route_trace_reporter_service_1 = require("../observability/route-trace-reporter.service");
const supabase_service_client_provider_1 = require("./supabase-service-client.provider");
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function readContextString(context, snakeKey, camelKey) {
    const snakeValue = context[snakeKey];
    if (typeof snakeValue === 'string' && snakeValue.trim().length > 0)
        return snakeValue.trim();
    const camelValue = context[camelKey];
    if (typeof camelValue === 'string' && camelValue.trim().length > 0)
        return camelValue.trim();
    return null;
}
function normalizeUuid(value) {
    return value && UUID_RE.test(value) ? value : null;
}
function normalizeText(value) {
    return value && value.trim().length > 0 ? value.trim().slice(0, 256) : null;
}
function normalizeCorrelation(params) {
    const context = params.context ?? {};
    const traceId = normalizeUuid(params.trace_id ?? readContextString(context, 'trace_id', 'traceId'));
    const messageId = normalizeUuid(params.message_id ?? readContextString(context, 'message_id', 'messageId'));
    const requestId = normalizeText(params.request_id ?? readContextString(context, 'request_id', 'requestId'));
    const runId = normalizeText(params.run_id ?? readContextString(context, 'run_id', 'runId'));
    const conversationId = normalizeUuid(params.conversation_id ?? readContextString(context, 'conversation_id', 'conversationId'));
    return {
        trace_id: traceId,
        message_id: messageId,
        request_id: requestId,
        run_id: runId,
        conversation_id: conversationId,
        context: {
            ...context,
            ...(traceId ? { trace_id: traceId } : {}),
            ...(messageId ? { message_id: messageId } : {}),
            ...(requestId ? { request_id: requestId } : {}),
            ...(runId ? { run_id: runId } : {}),
            ...(conversationId ? { conversation_id: conversationId } : {}),
        },
    };
}
let ErrorReporter = ErrorReporter_1 = class ErrorReporter {
    svc;
    routeTraceReporter;
    logger = new common_1.Logger(ErrorReporter_1.name);
    constructor(svc, routeTraceReporter) {
        this.svc = svc;
        this.routeTraceReporter = routeTraceReporter;
    }
    report(params) {
        const originalUserId = params.user_id ?? null;
        const correlation = normalizeCorrelation(params);
        const sourcePointer = (0, public_1.extractSourceCodePointer)({
            ...params,
            stack: params.stack,
            component_stack: params.component_stack,
            source_context: params.source_context,
            code_context: params.code_context ?? params.source_context ?? null,
        });
        const context = {
            ...correlation.context,
            ...(params.url ? { url: params.url.slice(0, 1000) } : {}),
            ...(params.route ? { route: params.route.slice(0, 512) } : {}),
            ...(params.component_stack ? { component_stack: params.component_stack.slice(0, 4000) } : {}),
            ...(params.source_context ? { source_context: params.source_context } : {}),
        };
        const row = {
            app: params.app,
            severity: params.severity ?? 'error',
            feature: params.feature ?? null,
            error_code: params.error_code ?? null,
            message: params.message.slice(0, 4000),
            context,
            stack: params.stack?.slice(0, 8000) ?? null,
            user_id: originalUserId,
            category: params.category ?? null,
            agent_key: params.agent_key ?? null,
            trace_id: correlation.trace_id,
            message_id: correlation.message_id,
            request_id: correlation.request_id,
            run_id: correlation.run_id,
            conversation_id: correlation.conversation_id,
            source_file: sourcePointer.source_file ?? null,
            source_line: sourcePointer.source_line ?? null,
            source_column: sourcePointer.source_column ?? null,
            function_name: sourcePointer.function_name ?? null,
            runtime_file: sourcePointer.runtime_file ?? null,
            runtime_line: sourcePointer.runtime_line ?? null,
            runtime_column: sourcePointer.runtime_column ?? null,
            commit_sha: sourcePointer.commit_sha ?? null,
            release_id: sourcePointer.release_id ?? null,
            build_id: sourcePointer.build_id ?? null,
            source_resolved: sourcePointer.source_resolved === true,
            code_context: sourcePointer.code_context ?? {},
        };
        if (this.routeTraceReporter) {
            this.routeTraceReporter.report({
                request_id: correlation.request_id,
                trace_id: correlation.trace_id,
                message_id: correlation.message_id,
                run_id: correlation.run_id,
                conversation_id: correlation.conversation_id,
                user_id: originalUserId,
                surface: params.app,
                service: params.feature ?? params.app,
                route: params.route ?? (typeof context.path === 'string' ? context.path : null),
                method: typeof context.method === 'string' ? context.method : null,
                event_type: 'exception',
                stage: 'reported',
                status: params.severity === 'warn' ? 'warn' : 'error',
                status_code: typeof context.status === 'number' ? context.status : null,
                error_code: params.error_code ?? null,
                source_file: sourcePointer.source_file ?? null,
                source_line: sourcePointer.source_line ?? null,
                source_column: sourcePointer.source_column ?? null,
                function_name: sourcePointer.function_name ?? null,
                runtime_file: sourcePointer.runtime_file ?? null,
                runtime_line: sourcePointer.runtime_line ?? null,
                runtime_column: sourcePointer.runtime_column ?? null,
                commit_sha: sourcePointer.commit_sha ?? null,
                release_id: sourcePointer.release_id ?? null,
                build_id: sourcePointer.build_id ?? null,
                source_resolved: sourcePointer.source_resolved === true,
                code_context: sourcePointer.code_context ?? {},
                observability: {
                    category: params.category ?? null,
                    agent_key: params.agent_key ?? null,
                    app_error: true,
                },
            });
        }
        this.insertWithUserFkRecovery(row, originalUserId).catch((err) => {
            this.logger.error(`ErrorReporter insert threw: ${err instanceof Error ? err.message : String(err)}`);
        });
    }
    async insertWithUserFkRecovery(row, originalUserId) {
        const error = await this.insertAppErrorRow(row);
        if (!error)
            return;
        const isFkUserViolation = error.code === '23503' && /app_errors_user_id_fkey/i.test(error.message ?? '');
        if (isFkUserViolation && originalUserId) {
            const existingContext = row.context && typeof row.context === 'object'
                ? row.context
                : {};
            const retryRow = {
                ...row,
                user_id: null,
                context: { ...existingContext, orphan_user_id: originalUserId },
            };
            const retryError = await this.insertAppErrorRow(retryRow);
            if (retryError) {
                this.logger.error(`Failed to persist app_error (retry): ${retryError.message}`);
            }
            return;
        }
        this.logger.error(`Failed to persist app_error: ${error.message}`);
    }
    async insertAppErrorRow(row) {
        const { error } = await this.svc.client.from('app_errors').insert(row);
        if (!error)
            return null;
        if (!this.isOptionalSchemaColumnError(error))
            return error;
        const legacyRow = this.stripOptionalObservabilityColumns(row);
        const { error: retryError } = await this.svc.client.from('app_errors').insert(legacyRow);
        return retryError ?? null;
    }
    isOptionalSchemaColumnError(error) {
        const message = error.message ?? '';
        return (error.code === '42703' ||
            error.code === 'PGRST204' ||
            /column .* does not exist/i.test(message) ||
            /could not find .* column/i.test(message) ||
            /schema cache/i.test(message));
    }
    stripOptionalObservabilityColumns(row) {
        const optionalColumns = new Set([
            'trace_id',
            'message_id',
            'request_id',
            'run_id',
            'conversation_id',
            'source_file',
            'source_line',
            'source_column',
            'function_name',
            'runtime_file',
            'runtime_line',
            'runtime_column',
            'commit_sha',
            'release_id',
            'build_id',
            'source_resolved',
            'code_context',
        ]);
        return Object.fromEntries(Object.entries(row).filter(([key]) => !optionalColumns.has(key)));
    }
};
exports.ErrorReporter = ErrorReporter;
exports.ErrorReporter = ErrorReporter = ErrorReporter_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Optional)()),
    __metadata("design:paramtypes", [supabase_service_client_provider_1.SupabaseServiceClient,
        route_trace_reporter_service_1.RouteTraceReporter])
], ErrorReporter);
//# sourceMappingURL=error-reporter.service.js.map