export type RetrySupabaseQueryOptions = {
    maxAttempts?: number;
    baseDelayMs?: number;
    errorPrefix: string;
    logger?: {
        warn: (msg: string) => void;
    };
};
export declare function retrySupabaseQuery<T>(queryFn: () => Promise<{
    data: T | null;
    error: {
        message: string;
    } | null;
}>, options: RetrySupabaseQueryOptions): Promise<T | null>;
