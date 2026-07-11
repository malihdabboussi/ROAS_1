export interface SafeFetchOptions {
    timeoutMs?: number;
    maxBytes?: number;
    headers?: Record<string, string>;
}
export declare function safeFetchText(rawUrl: string, opts?: SafeFetchOptions): Promise<string>;
