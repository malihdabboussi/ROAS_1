export type WithRetryOptions = {
    maxAttempts?: number;
    delayMsAfterFailure?: (failedAttemptNumber: number) => number;
    retryCondition?: (error: unknown) => boolean;
};
export declare function withRetry<T>(operation: () => Promise<T>, options?: WithRetryOptions): Promise<T>;
