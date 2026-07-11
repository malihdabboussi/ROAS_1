type ResilientFetchOptions = {
    label: string;
    maxRetries?: number;
    timeoutMs?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
};
export declare function createResilientFetch(options: ResilientFetchOptions): typeof fetch;
export {};
