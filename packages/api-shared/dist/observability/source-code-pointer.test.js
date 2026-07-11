"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const public_1 = require("./public");
(0, vitest_1.describe)('source-code-pointer observability helpers', () => {
    (0, vitest_1.it)('parses node stack frames into repo-relative source pointers', () => {
        const pointer = (0, public_1.parseFirstStackFrame)('Error: boom\n    at runThing (/srv/app/apps/api/src/main.ts:59:13)');
        (0, vitest_1.expect)(pointer).toMatchObject({
            source_file: 'apps/api/src/main.ts',
            source_line: 59,
            source_column: 13,
            function_name: 'runThing',
            runtime_line: 59,
            runtime_column: 13,
        });
    });
    (0, vitest_1.it)('lets explicit source context override runtime stack data', () => {
        const pointer = (0, public_1.extractSourceCodePointer)({
            stack: 'Error: boom\n    at minified (https://app.test/_next/static/chunks/app.js:1:100)',
            source_context: {
                source_file: 'apps/web/src/app/page.tsx',
                source_line: 12,
                source_column: 4,
                source_resolved: true,
            },
        });
        (0, vitest_1.expect)(pointer.source_file).toBe('apps/web/src/app/page.tsx');
        (0, vitest_1.expect)(pointer.source_line).toBe(12);
        (0, vitest_1.expect)(pointer.source_resolved).toBe(true);
    });
    (0, vitest_1.it)('normalizes trace events without leaking invalid UUID fields', () => {
        const row = (0, public_1.normalizeRequestTraceEvent)({
            surface: 'web',
            event_type: 'client_error',
            request_id: 'req_123',
            trace_id: 'not-a-uuid',
            status_code: 502,
            duration_ms: 3.8,
        });
        (0, vitest_1.expect)(row.request_id).toBe('req_123');
        (0, vitest_1.expect)(row.trace_id).toBeNull();
        (0, vitest_1.expect)(row.status_code).toBe(502);
        (0, vitest_1.expect)(row.duration_ms).toBe(3);
    });
});
//# sourceMappingURL=source-code-pointer.test.js.map