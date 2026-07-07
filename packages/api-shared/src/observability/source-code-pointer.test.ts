import { describe, expect, it } from 'vitest'
import { extractSourceCodePointer, normalizeRequestTraceEvent, parseFirstStackFrame } from './public'

describe('source-code-pointer observability helpers', () => {
  it('parses node stack frames into repo-relative source pointers', () => {
    const pointer = parseFirstStackFrame(
      'Error: boom\n    at runThing (/srv/app/apps/api/src/main.ts:59:13)',
    )

    expect(pointer).toMatchObject({
      source_file: 'apps/api/src/main.ts',
      source_line: 59,
      source_column: 13,
      function_name: 'runThing',
      runtime_line: 59,
      runtime_column: 13,
    })
  })

  it('lets explicit source context override runtime stack data', () => {
    const pointer = extractSourceCodePointer({
      stack: 'Error: boom\n    at minified (https://app.test/_next/static/chunks/app.js:1:100)',
      source_context: {
        source_file: 'apps/web/src/app/page.tsx',
        source_line: 12,
        source_column: 4,
        source_resolved: true,
      },
    })

    expect(pointer.source_file).toBe('apps/web/src/app/page.tsx')
    expect(pointer.source_line).toBe(12)
    expect(pointer.source_resolved).toBe(true)
  })

  it('normalizes trace events without leaking invalid UUID fields', () => {
    const row = normalizeRequestTraceEvent({
      surface: 'web',
      event_type: 'client_error',
      request_id: 'req_123',
      trace_id: 'not-a-uuid',
      status_code: 502,
      duration_ms: 3.8,
    })

    expect(row.request_id).toBe('req_123')
    expect(row.trace_id).toBeNull()
    expect(row.status_code).toBe(502)
    expect(row.duration_ms).toBe(3)
  })
})
