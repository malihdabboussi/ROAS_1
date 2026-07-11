import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'http';
import type { RouteTraceReporter } from './route-trace-reporter.service';
type MiddlewareNext = () => void;
type TraceRequest = IncomingMessage & {
    method?: string;
    originalUrl?: string;
    url?: string;
    headers: IncomingHttpHeaders;
    user?: {
        id?: string;
    };
    orgId?: string | null;
};
type TraceResponse = ServerResponse & {
    statusCode: number;
    setHeader(name: string, value: number | string | readonly string[]): void;
};
export interface RequestTraceMiddlewareOptions {
    surface: string;
    service?: string;
    alwaysTraceRoute?: (route: string) => boolean;
}
export declare function createRequestTraceMiddleware(reporter: RouteTraceReporter, options: RequestTraceMiddlewareOptions): (req: TraceRequest, res: TraceResponse, next: MiddlewareNext) => void;
export {};
