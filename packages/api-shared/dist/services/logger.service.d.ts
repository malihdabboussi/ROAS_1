import { ErrorReporter } from './error-reporter.service';
export interface LogErrorParams {
    severity: 'error' | 'warn' | 'critical' | 'info';
    feature: string;
    error_code: string;
    message: string;
    context?: Record<string, any>;
    stack?: string;
    user_id?: string;
    trace_id?: string | null;
    message_id?: string | null;
    request_id?: string | null;
    run_id?: string | null;
    conversation_id?: string | null;
}
export declare class LoggerService {
    private readonly errorReporter;
    private readonly logger;
    constructor(errorReporter: ErrorReporter);
    logError(params: LogErrorParams): Promise<void>;
}
