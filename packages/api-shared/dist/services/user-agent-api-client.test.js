"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const user_agent_api_client_1 = require("./user-agent-api-client");
const silentLogger = {
    log: () => { },
    warn: () => { },
    error: () => { },
};
const target = {
    baseUrl: 'https://user-machine.example.com',
    machineId: 'machine-abc',
};
(0, vitest_1.describe)('UserAgentApiClient.ensureReachable', () => {
    (0, vitest_1.beforeEach)(() => {
        (0, user_agent_api_client_1.__resetUserAgentApiClientState)();
        vitest_1.vi.useFakeTimers();
    });
    (0, vitest_1.afterEach)(() => {
        vitest_1.vi.useRealTimers();
    });
    (0, vitest_1.it)('probe success on first attempt: no wake call', async () => {
        const probe = vitest_1.vi.fn().mockResolvedValue(true);
        const wake = vitest_1.vi.fn().mockResolvedValue(undefined);
        const client = new user_agent_api_client_1.UserAgentApiClient({
            logger: silentLogger,
            probeReachable: probe,
            wakeMachine: wake,
        });
        await client.ensureReachable('user-1', target);
        (0, vitest_1.expect)(probe).toHaveBeenCalledTimes(1);
        (0, vitest_1.expect)(wake).not.toHaveBeenCalled();
    });
    (0, vitest_1.it)('probe fails twice, then succeeds: wake called twice', async () => {
        const probe = vitest_1.vi
            .fn()
            .mockResolvedValueOnce(false)
            .mockResolvedValueOnce(false)
            .mockResolvedValueOnce(true);
        const wake = vitest_1.vi.fn().mockResolvedValue(undefined);
        const client = new user_agent_api_client_1.UserAgentApiClient({ logger: silentLogger, probeReachable: probe, wakeMachine: wake }, { wakeWaitMs: 10 });
        const promise = client.ensureReachable('user-1', target);
        await vitest_1.vi.advanceTimersByTimeAsync(50);
        await promise;
        (0, vitest_1.expect)(probe).toHaveBeenCalledTimes(3);
        (0, vitest_1.expect)(wake).toHaveBeenCalledTimes(2);
    });
    (0, vitest_1.it)('probe fails 3 times: throws UserMachineUnreachableError and opens circuit', async () => {
        const probe = vitest_1.vi.fn().mockResolvedValue(false);
        const wake = vitest_1.vi.fn().mockResolvedValue(undefined);
        const markUnknown = vitest_1.vi.fn().mockResolvedValue(undefined);
        const client = new user_agent_api_client_1.UserAgentApiClient({
            logger: silentLogger,
            probeReachable: probe,
            wakeMachine: wake,
            markMachineUnknown: markUnknown,
        }, { wakeWaitMs: 10 });
        const promise = client.ensureReachable('user-1', target).catch((e) => e);
        await vitest_1.vi.advanceTimersByTimeAsync(100);
        const err = await promise;
        (0, vitest_1.expect)(err).toBeInstanceOf(user_agent_api_client_1.UserMachineUnreachableError);
        (0, vitest_1.expect)(probe).toHaveBeenCalledTimes(3);
        (0, vitest_1.expect)(wake).toHaveBeenCalledTimes(3);
        (0, vitest_1.expect)(markUnknown).toHaveBeenCalledTimes(1);
        const probe2 = vitest_1.vi.fn().mockResolvedValue(true);
        const wake2 = vitest_1.vi.fn().mockResolvedValue(undefined);
        const client2 = new user_agent_api_client_1.UserAgentApiClient({
            logger: silentLogger,
            probeReachable: probe2,
            wakeMachine: wake2,
        });
        await (0, vitest_1.expect)(client2.ensureReachable('user-1', target)).rejects.toBeInstanceOf(user_agent_api_client_1.UserMachineCircuitOpenError);
        (0, vitest_1.expect)(probe2).not.toHaveBeenCalled();
    });
    (0, vitest_1.it)('returns immediately when target.machineId is null (provisioning)', async () => {
        const probe = vitest_1.vi.fn();
        const wake = vitest_1.vi.fn();
        const client = new user_agent_api_client_1.UserAgentApiClient({
            logger: silentLogger,
            probeReachable: probe,
            wakeMachine: wake,
        });
        await client.ensureReachable('user-1', { baseUrl: 'http://x', machineId: null });
        (0, vitest_1.expect)(probe).not.toHaveBeenCalled();
        (0, vitest_1.expect)(wake).not.toHaveBeenCalled();
    });
    (0, vitest_1.it)('coalesces concurrent calls for the same user', async () => {
        let resolveProbe = () => { };
        const probe = vitest_1.vi.fn().mockImplementation(() => new Promise((resolve) => {
            resolveProbe = resolve;
        }));
        const wake = vitest_1.vi.fn().mockResolvedValue(undefined);
        const client = new user_agent_api_client_1.UserAgentApiClient({
            logger: silentLogger,
            probeReachable: probe,
            wakeMachine: wake,
        });
        const a = client.ensureReachable('user-1', target);
        const b = client.ensureReachable('user-1', target);
        (0, vitest_1.expect)(probe).toHaveBeenCalledTimes(1);
        resolveProbe(true);
        await Promise.all([a, b]);
        (0, vitest_1.expect)(probe).toHaveBeenCalledTimes(1);
    });
});
(0, vitest_1.describe)('UserAgentApiClient.fetch', () => {
    let originalFetch;
    (0, vitest_1.beforeEach)(() => {
        (0, user_agent_api_client_1.__resetUserAgentApiClientState)();
        originalFetch = globalThis.fetch;
        vitest_1.vi.useFakeTimers({ shouldAdvanceTime: true });
    });
    (0, vitest_1.afterEach)(() => {
        globalThis.fetch = originalFetch;
        vitest_1.vi.useRealTimers();
    });
    function makeClient() {
        return new user_agent_api_client_1.UserAgentApiClient({
            logger: silentLogger,
            probeReachable: vitest_1.vi.fn().mockResolvedValue(true),
            wakeMachine: vitest_1.vi.fn().mockResolvedValue(undefined),
        });
    }
    (0, vitest_1.it)('attaches fly-force-instance-id when machineId is set', async () => {
        const fetchMock = vitest_1.vi.fn().mockResolvedValue(new Response('ok', { status: 200 }));
        globalThis.fetch = fetchMock;
        const client = makeClient();
        await client.fetch(target, '/api/test', { method: 'POST', body: 'x' });
        const args = fetchMock.mock.calls[0];
        const headers = args[1].headers;
        (0, vitest_1.expect)(headers['fly-force-instance-id']).toBe('machine-abc');
    });
    (0, vitest_1.it)('does NOT attach fly-force-instance-id when machineId is null', async () => {
        const fetchMock = vitest_1.vi.fn().mockResolvedValue(new Response('ok', { status: 200 }));
        globalThis.fetch = fetchMock;
        const client = makeClient();
        await client.fetch({ baseUrl: 'http://x', machineId: null }, '/api/test', { method: 'POST' });
        const headers = fetchMock.mock.calls[0][1].headers;
        (0, vitest_1.expect)(headers['fly-force-instance-id']).toBeUndefined();
    });
    (0, vitest_1.it)('returns immediately on 4xx without retry', async () => {
        const fetchMock = vitest_1.vi.fn().mockResolvedValue(new Response('bad', { status: 400 }));
        globalThis.fetch = fetchMock;
        const client = makeClient();
        await (0, vitest_1.expect)(client.fetch(target, '/api/test', { method: 'POST' })).rejects.toThrow(/400/);
        (0, vitest_1.expect)(fetchMock).toHaveBeenCalledTimes(1);
    });
    (0, vitest_1.it)('retries 500 up to MAX_RETRIES then throws', async () => {
        const fetchMock = vitest_1.vi.fn().mockResolvedValue(new Response('boom', { status: 500 }));
        globalThis.fetch = fetchMock;
        const client = makeClient();
        const promise = client
            .fetch(target, '/api/test', { method: 'POST' }, { retryBaseMs: 1 })
            .catch((e) => e);
        await vitest_1.vi.advanceTimersByTimeAsync(50);
        const err = await promise;
        (0, vitest_1.expect)(err).toBeInstanceOf(Error);
        (0, vitest_1.expect)(fetchMock).toHaveBeenCalledTimes(user_agent_api_client_1.USER_AGENT_API_DEFAULTS.MAX_RETRIES + 1);
    });
    (0, vitest_1.it)('retries TypeError fetch failed up to MAX_RETRIES', async () => {
        const fetchMock = vitest_1.vi.fn().mockRejectedValue(new TypeError('fetch failed'));
        globalThis.fetch = fetchMock;
        const client = makeClient();
        const promise = client
            .fetch(target, '/api/test', { method: 'POST' }, { retryBaseMs: 1 })
            .catch((e) => e);
        await vitest_1.vi.advanceTimersByTimeAsync(50);
        const err = await promise;
        (0, vitest_1.expect)(err).toBeInstanceOf(Error);
        (0, vitest_1.expect)(fetchMock).toHaveBeenCalledTimes(user_agent_api_client_1.USER_AGENT_API_DEFAULTS.MAX_RETRIES + 1);
    });
    (0, vitest_1.it)('succeeds on retry after transient 502', async () => {
        const fetchMock = vitest_1.vi
            .fn()
            .mockResolvedValueOnce(new Response('ngx', { status: 502 }))
            .mockResolvedValueOnce(new Response('ok', { status: 200 }));
        globalThis.fetch = fetchMock;
        const client = makeClient();
        const promise = client.fetch(target, '/api/test', { method: 'POST' }, { retryBaseMs: 1 });
        await vitest_1.vi.advanceTimersByTimeAsync(50);
        const res = await promise;
        (0, vitest_1.expect)(res.ok).toBe(true);
        (0, vitest_1.expect)(fetchMock).toHaveBeenCalledTimes(2);
    });
    (0, vitest_1.it)('honors retryAfter on 503 response body', async () => {
        const fetchMock = vitest_1.vi
            .fn()
            .mockResolvedValueOnce(new Response(JSON.stringify({ retryAfter: 3 }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
        }))
            .mockResolvedValueOnce(new Response('ok', { status: 200 }));
        globalThis.fetch = fetchMock;
        const client = makeClient();
        const startedAt = Date.now();
        const promise = client.fetch(target, '/api/test', { method: 'POST' }, { retryBaseMs: 1 });
        await vitest_1.vi.advanceTimersByTimeAsync(3500);
        await promise;
        (0, vitest_1.expect)(fetchMock).toHaveBeenCalledTimes(2);
        (0, vitest_1.expect)(Date.now() - startedAt).toBeGreaterThanOrEqual(3000);
    });
    (0, vitest_1.it)('builds URL by joining baseUrl and path correctly', async () => {
        const fetchMock = vitest_1.vi.fn().mockResolvedValue(new Response('ok', { status: 200 }));
        globalThis.fetch = fetchMock;
        const client = makeClient();
        await client.fetch({ baseUrl: 'https://m.example.com/', machineId: 'm1' }, '/api/test', {
            method: 'POST',
        });
        (0, vitest_1.expect)(fetchMock.mock.calls[0][0]).toBe('https://m.example.com/api/test');
    });
});
(0, vitest_1.describe)('defaultProbeReachable', () => {
    let originalFetch;
    (0, vitest_1.beforeEach)(() => {
        originalFetch = globalThis.fetch;
    });
    (0, vitest_1.afterEach)(() => {
        globalThis.fetch = originalFetch;
    });
    (0, vitest_1.it)('returns true only for /api/ready 200', async () => {
        const fetchMock = vitest_1.vi.fn().mockResolvedValue(new Response('ok', { status: 200 }));
        globalThis.fetch = fetchMock;
        await (0, vitest_1.expect)((0, user_agent_api_client_1.defaultProbeReachable)(target)).resolves.toBe(true);
        (0, vitest_1.expect)(fetchMock.mock.calls[0][0]).toBe('https://user-machine.example.com/api/ready');
        (0, vitest_1.expect)(fetchMock.mock.calls[0][1].method).toBe('GET');
    });
    (0, vitest_1.it)('returns false for 401', async () => {
        const fetchMock = vitest_1.vi.fn().mockResolvedValue(new Response('unauthorized', { status: 401 }));
        globalThis.fetch = fetchMock;
        await (0, vitest_1.expect)((0, user_agent_api_client_1.defaultProbeReachable)(target)).resolves.toBe(false);
    });
    (0, vitest_1.it)('returns false for 404', async () => {
        const fetchMock = vitest_1.vi.fn().mockResolvedValue(new Response('missing', { status: 404 }));
        globalThis.fetch = fetchMock;
        await (0, vitest_1.expect)((0, user_agent_api_client_1.defaultProbeReachable)(target)).resolves.toBe(false);
    });
    (0, vitest_1.it)('includes fly-force-instance-id', async () => {
        const fetchMock = vitest_1.vi.fn().mockResolvedValue(new Response('ok', { status: 200 }));
        globalThis.fetch = fetchMock;
        await (0, user_agent_api_client_1.defaultProbeReachable)(target);
        const headers = fetchMock.mock.calls[0][1].headers;
        (0, vitest_1.expect)(headers['fly-force-instance-id']).toBe('machine-abc');
    });
});
//# sourceMappingURL=user-agent-api-client.test.js.map