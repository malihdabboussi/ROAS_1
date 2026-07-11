"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserAgentApiClient = exports.UserMachineCircuitOpenError = exports.UserMachineUnreachableError = exports.USER_AGENT_API_DEFAULTS = void 0;
exports.__resetUserAgentApiClientState = __resetUserAgentApiClientState;
exports.defaultProbeReachable = defaultProbeReachable;
exports.USER_AGENT_API_DEFAULTS = {
    PROBE_ATTEMPTS: 3,
    WAKE_WAIT_MS: 45_000,
    CIRCUIT_OPEN_MS: 5 * 60_000,
    REQUEST_TIMEOUT_MS: 600_000,
    MAX_RETRIES: 3,
    RETRY_BASE_MS: 2_000,
    RETRY_AFTER_DEFAULT_MS: 10_000,
};
const userMachineWakeLocks = new Map();
const userMachineCircuitOpenUntil = new Map();
function __resetUserAgentApiClientState() {
    userMachineWakeLocks.clear();
    userMachineCircuitOpenUntil.clear();
}
class UserMachineUnreachableError extends Error {
    constructor(message) {
        super(message);
        this.name = 'UserMachineUnreachableError';
    }
}
exports.UserMachineUnreachableError = UserMachineUnreachableError;
class UserMachineCircuitOpenError extends Error {
    constructor() {
        super('User machine unavailable (circuit open)');
        this.name = 'UserMachineCircuitOpenError';
    }
}
exports.UserMachineCircuitOpenError = UserMachineCircuitOpenError;
class UserAgentApiClient {
    deps;
    probeAttempts;
    wakeWaitMs;
    circuitOpenMs;
    constructor(deps, overrides) {
        this.deps = deps;
        this.probeAttempts = overrides?.probeAttempts ?? exports.USER_AGENT_API_DEFAULTS.PROBE_ATTEMPTS;
        this.wakeWaitMs = overrides?.wakeWaitMs ?? exports.USER_AGENT_API_DEFAULTS.WAKE_WAIT_MS;
        this.circuitOpenMs = overrides?.circuitOpenMs ?? exports.USER_AGENT_API_DEFAULTS.CIRCUIT_OPEN_MS;
    }
    async ensureReachable(userId, target) {
        if (!target.machineId)
            return;
        const circuitUntil = userMachineCircuitOpenUntil.get(userId) ?? 0;
        if (Date.now() < circuitUntil) {
            throw new UserMachineCircuitOpenError();
        }
        const existing = userMachineWakeLocks.get(userId);
        if (existing) {
            await existing;
            return;
        }
        const run = (async () => {
            for (let attempt = 0; attempt < this.probeAttempts; attempt++) {
                if (await this.deps.probeReachable(target)) {
                    userMachineCircuitOpenUntil.delete(userId);
                    return;
                }
                try {
                    await this.deps.wakeMachine(userId);
                }
                catch (err) {
                    this.deps.logger.warn(`[machine_wake_soft] user=${userId} ${err.message}`);
                }
                await new Promise((r) => setTimeout(r, this.wakeWaitMs));
            }
            if (this.deps.markMachineUnknown) {
                try {
                    await this.deps.markMachineUnknown(userId);
                }
                catch {
                }
            }
            userMachineCircuitOpenUntil.set(userId, Date.now() + this.circuitOpenMs);
            throw new UserMachineUnreachableError(`User machine failed to start after ${this.probeAttempts} attempts`);
        })();
        userMachineWakeLocks.set(userId, run);
        try {
            await run;
        }
        finally {
            userMachineWakeLocks.delete(userId);
        }
    }
    async fetch(target, path, init, opts = {}) {
        const maxRetries = opts.maxRetries ?? exports.USER_AGENT_API_DEFAULTS.MAX_RETRIES;
        const retryBaseMs = opts.retryBaseMs ?? exports.USER_AGENT_API_DEFAULTS.RETRY_BASE_MS;
        const requestTimeoutMs = opts.timeoutMs ?? exports.USER_AGENT_API_DEFAULTS.REQUEST_TIMEOUT_MS;
        const tag = opts.logTag ? ` ${opts.logTag}` : '';
        const url = `${target.baseUrl.replace(/\/+$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
        const baseHeaders = (init.headers ?? {});
        const headers = {
            ...baseHeaders,
            ...(target.machineId ? { 'fly-force-instance-id': target.machineId } : {}),
        };
        let response;
        let lastError;
        let nextRetryDelayMs = 0;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            if (attempt > 0) {
                const delayMs = nextRetryDelayMs > 0 ? nextRetryDelayMs : retryBaseMs * Math.pow(2, attempt - 1);
                nextRetryDelayMs = 0;
                this.deps.logger.warn(`[user_agent_api_retry]${tag} attempt=${attempt}/${maxRetries} delay=${delayMs}ms url=${url}`);
                await new Promise((r) => setTimeout(r, delayMs));
            }
            try {
                const innerTimeout = AbortSignal.timeout(requestTimeoutMs);
                const signal = opts.signal !== undefined ? AbortSignal.any([innerTimeout, opts.signal]) : innerTimeout;
                response = await fetch(url, {
                    ...init,
                    headers,
                    signal,
                });
                if (response.ok)
                    return response;
                const errorText = await response.text().catch(() => '');
                let retryAfterMs = 0;
                if (response.status === 503) {
                    retryAfterMs = exports.USER_AGENT_API_DEFAULTS.RETRY_AFTER_DEFAULT_MS;
                    try {
                        const j = JSON.parse(errorText);
                        const direct = j.retryAfter;
                        const nested = j.message && typeof j.message === 'object' && j.message !== null
                            ? j.message.retryAfter
                            : undefined;
                        const sec = typeof direct === 'number' ? direct : typeof nested === 'number' ? nested : 0;
                        if (sec > 0)
                            retryAfterMs = sec * 1000;
                    }
                    catch {
                    }
                }
                const isRetryable = response.status >= 500 || response.status === 429 || response.status === 503;
                if (!isRetryable || attempt === maxRetries) {
                    this.deps.logger.error(`[user_agent_api_error]${tag} url=${url} status=${response.status} body="${errorText.slice(0, 300)}"`);
                    throw new Error(`Agent request failed (${response.status}): ${errorText}`);
                }
                lastError = new Error(`Agent request failed (${response.status}): ${errorText}`);
                if (retryAfterMs > 0)
                    nextRetryDelayMs = retryAfterMs;
                this.deps.logger.warn(`[user_agent_api_retryable]${tag} status=${response.status} attempt=${attempt}/${maxRetries}`);
            }
            catch (fetchErr) {
                lastError = fetchErr;
                const isTimeout = fetchErr instanceof DOMException && fetchErr.name === 'TimeoutError';
                const isAbort = fetchErr instanceof DOMException && fetchErr.name === 'AbortError';
                const isFetchFailed = fetchErr instanceof TypeError && /fetch failed/i.test(fetchErr.message);
                const isRetryable = isTimeout || isAbort || isFetchFailed;
                if (!isRetryable || attempt === maxRetries) {
                    const cause = fetchErr?.cause;
                    const causeCode = cause && typeof cause === 'object' && 'code' in cause
                        ? String(cause.code)
                        : null;
                    const causeMsg = cause instanceof Error ? cause.message : cause != null ? String(cause) : null;
                    this.deps.logger.error(`[user_agent_api_error]${tag} url=${url} error="${fetchErr.message}"` +
                        (causeCode ? ` cause_code=${causeCode}` : '') +
                        (causeMsg ? ` cause_msg="${causeMsg}"` : ''));
                    if (isFetchFailed) {
                        throw new Error(`Gateway connection error: ${fetchErr.message}`);
                    }
                    throw fetchErr;
                }
                this.deps.logger.warn(`[user_agent_api_retryable]${tag} error="${fetchErr.message}" attempt=${attempt}/${maxRetries}`);
            }
        }
        throw lastError ?? new Error('Agent request failed after retries');
    }
    async invoke(userId, target, path, init, opts = {}) {
        await this.ensureReachable(userId, target);
        return this.fetch(target, path, init, opts);
    }
}
exports.UserAgentApiClient = UserAgentApiClient;
async function defaultProbeReachable(target, opts = {}) {
    const url = `${target.baseUrl.replace(/\/+$/, '')}/api/ready`;
    try {
        const headers = { Accept: 'application/json' };
        if (opts.gatewayToken)
            headers.Authorization = `Bearer ${opts.gatewayToken}`;
        if (target.machineId)
            headers['fly-force-instance-id'] = target.machineId;
        const res = await fetch(url, {
            method: 'GET',
            headers,
            signal: AbortSignal.timeout(opts.timeoutMs ?? 12_000),
        });
        if (res.ok)
            return true;
        const bodyText = await res.text().catch(() => '');
        opts.logger?.warn(`[machine_probe] ready_status=${res.status} body=${bodyText.slice(0, 120)} url=${url}`);
        return false;
    }
    catch (err) {
        opts.logger?.warn(`[machine_probe] unreachable url=${url} err=${err.message}`);
        return false;
    }
}
//# sourceMappingURL=user-agent-api-client.js.map