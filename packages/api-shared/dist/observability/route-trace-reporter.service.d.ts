import { SupabaseServiceClient } from '../services/supabase-service-client.provider';
import type { RequestTraceEventInput } from './types';
export declare class RouteTraceReporter {
    private readonly svc;
    private readonly logger;
    private warnedUnavailable;
    constructor(svc: SupabaseServiceClient);
    report(input: RequestTraceEventInput): void;
    reportNow(input: RequestTraceEventInput): Promise<void>;
    private warnOnce;
    private formatError;
}
