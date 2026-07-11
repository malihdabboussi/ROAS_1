export type AgentApiTarget = {
    baseUrl: string;
    machineId: string | null;
};
export type AgentApiLogger = {
    log: (msg: string) => void;
    warn: (msg: string) => void;
    error: (msg: string) => void;
};
export type UserAgentApiClientDeps = {
    logger: AgentApiLogger;
    probeReachable: (target: AgentApiTarget) => Promise<boolean>;
    wakeMachine: (userId: string) => Promise<void>;
    markMachineUnknown?: (userId: string) => Promise<void>;
};
export type UserAgentApiFetchOptions = {
    signal?: AbortSignal;
    timeoutMs?: number;
    maxRetries?: number;
    retryBaseMs?: number;
    logTag?: string;
    onMachineWakeStart?: () => void | Promise<void>;
};
export declare const USER_AGENT_API_DEFAULTS: {
    readonly PROBE_ATTEMPTS: 3;
    readonly WAKE_WAIT_MS: 45000;
    readonly CIRCUIT_OPEN_MS: number;
    readonly REQUEST_TIMEOUT_MS: 600000;
    readonly MAX_RETRIES: 3;
    readonly RETRY_BASE_MS: 2000;
    readonly RETRY_AFTER_DEFAULT_MS: 10000;
};
export declare function __resetUserAgentApiClientState(): void;
export declare class UserMachineUnreachableError extends Error {
    constructor(message: string);
}
export declare class UserMachineCircuitOpenError extends Error {
    constructor();
}
export declare class UserAgentApiClient {
    private readonly deps;
    private readonly probeAttempts;
    private readonly wakeWaitMs;
    private readonly circuitOpenMs;
    constructor(deps: UserAgentApiClientDeps, overrides?: {
        probeAttempts?: number;
        wakeWaitMs?: number;
        circuitOpenMs?: number;
    });
    ensureReachable(userId: string, target: AgentApiTarget): Promise<void>;
    fetch(target: AgentApiTarget, path: string, init: RequestInit, opts?: UserAgentApiFetchOptions): Promise<Response>;
    invoke(userId: string, target: AgentApiTarget, path: string, init: RequestInit, opts?: UserAgentApiFetchOptions): Promise<Response>;
}
export declare function defaultProbeReachable(target: AgentApiTarget, opts?: {
    gatewayToken?: string;
    logger?: AgentApiLogger;
    timeoutMs?: number;
}): Promise<boolean>;
