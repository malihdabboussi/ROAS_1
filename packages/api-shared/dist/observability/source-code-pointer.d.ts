import type { ReleaseContext, RequestTraceEventInput, SourceCodePointer, SourceCodePointerInput } from './types';
export declare function resolveReleaseContext(env?: NodeJS.ProcessEnv): ReleaseContext;
export declare function parseFirstStackFrame(stack?: string | null): SourceCodePointer | null;
export declare function sanitizeSourceCodePointer(input: SourceCodePointer): SourceCodePointer;
export declare function extractSourceCodePointer(input: SourceCodePointerInput): SourceCodePointer;
export declare function normalizeRequestTraceEvent(input: RequestTraceEventInput): Record<string, unknown>;
