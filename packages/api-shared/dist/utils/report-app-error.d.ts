import type { ErrorReporter, ReportErrorParams } from '../services/error-reporter.service';
export type ReportedError = Error & {
    __appErrorReported?: true;
};
export declare function markAppErrorReported(error: unknown): void;
export declare function reportAppError(errorReporter: ErrorReporter, params: ReportErrorParams, error?: unknown): void;
