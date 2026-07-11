import { RouteTraceReporter } from '../observability/route-trace-reporter.service';
import { SupabaseServiceClient } from './supabase-service-client.provider';
export interface ReportErrorParams {
    app: string;
    severity?: 'error' | 'warn' | 'critical';
    feature?: string;
    error_code?: string;
    message: string;
    context?: Record<string, unknown>;
    stack?: string;
    component_stack?: string;
    source_context?: Record<string, unknown>;
    url?: string;
    route?: string;
    user_id?: string;
    category?: string;
    agent_key?: string;
    trace_id?: string | null;
    message_id?: string | null;
    request_id?: string | null;
    run_id?: string | null;
    conversation_id?: string | null;
    source_file?: string | null;
    source_line?: number | null;
    source_column?: number | null;
    function_name?: string | null;
    runtime_file?: string | null;
    runtime_line?: number | null;
    runtime_column?: number | null;
    commit_sha?: string | null;
    release_id?: string | null;
    build_id?: string | null;
    source_resolved?: boolean;
    code_context?: Record<string, unknown> | null;
}
export declare class ErrorReporter {
    private readonly svc;
    private readonly routeTraceReporter?;
    private readonly logger;
    constructor(svc: SupabaseServiceClient, routeTraceReporter?: RouteTraceReporter | undefined);
    report(params: ReportErrorParams): void;
    private insertWithUserFkRecovery;
    private insertAppErrorRow;
    private isOptionalSchemaColumnError;
    private stripOptionalObservabilityColumns;
}
