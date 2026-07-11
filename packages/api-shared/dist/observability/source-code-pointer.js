"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveReleaseContext = resolveReleaseContext;
exports.parseFirstStackFrame = parseFirstStackFrame;
exports.sanitizeSourceCodePointer = sanitizeSourceCodePointer;
exports.extractSourceCodePointer = extractSourceCodePointer;
exports.normalizeRequestTraceEvent = normalizeRequestTraceEvent;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PATH_ANCHORS = ['/apps/', '/packages/', '/supabase/', '/docker/', '/scripts/'];
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function stringValue(value, max = 512) {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim().slice(0, max) : null;
}
function positiveInt(value) {
    const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : null;
}
function nullableUuid(value) {
    const text = stringValue(value, 128);
    return text && UUID_RE.test(text) ? text : null;
}
function textValue(value, max = 256) {
    return stringValue(value, max);
}
function resolveReleaseContext(env = process.env) {
    const commitSha = textValue(env.VIBEY_COMMIT_SHA, 80) ??
        textValue(env.VERCEL_GIT_COMMIT_SHA, 80) ??
        textValue(env.RAILWAY_GIT_COMMIT_SHA, 80) ??
        textValue(env.GITHUB_SHA, 80) ??
        textValue(env.SOURCE_VERSION, 80) ??
        null;
    const releaseId = textValue(env.VIBEY_RELEASE_ID, 160) ??
        textValue(env.NEXT_PUBLIC_VIBEY_RELEASE_ID, 160) ??
        textValue(env.VERCEL_DEPLOYMENT_ID, 160) ??
        textValue(env.RAILWAY_DEPLOYMENT_ID, 160) ??
        commitSha;
    const buildId = textValue(env.VIBEY_BUILD_ID, 160) ??
        textValue(env.NEXT_BUILD_ID, 160) ??
        textValue(env.VERCEL_GIT_COMMIT_REF, 160) ??
        null;
    return { commit_sha: commitSha, release_id: releaseId, build_id: buildId };
}
function normalizePath(raw) {
    let path = raw
        .replace(/^webpack:\/\/_N_E\/\.\//, '')
        .replace(/^webpack-internal:\/\/\/\([^)]+\)\/\.\//, '')
        .replace(/^webpack-internal:\/\/\/\.\//, '')
        .replace(/^file:\/\//, '');
    const queryIndex = path.indexOf('?');
    if (queryIndex >= 0)
        path = path.slice(0, queryIndex);
    for (const anchor of PATH_ANCHORS) {
        const index = path.lastIndexOf(anchor);
        if (index >= 0)
            return path.slice(index + 1);
    }
    const cwd = process.cwd();
    if (path.startsWith(`${cwd}/`))
        return path.slice(cwd.length + 1);
    return path.slice(0, 512);
}
function parseStackFrameLine(line) {
    const trimmed = line.trim();
    if (!trimmed)
        return null;
    let candidate = trimmed;
    let functionName = null;
    if (trimmed.startsWith('at ')) {
        const body = trimmed.slice(3).trim();
        const openParenIndex = body.lastIndexOf('(');
        if (openParenIndex >= 0 && body.endsWith(')')) {
            functionName = body.slice(0, openParenIndex).trim() || null;
            candidate = body.slice(openParenIndex + 1, -1);
        }
        else {
            candidate = body;
        }
    }
    else {
        const atIndex = trimmed.lastIndexOf('@');
        if (atIndex > 0) {
            functionName = trimmed.slice(0, atIndex).trim() || null;
            candidate = trimmed.slice(atIndex + 1);
        }
    }
    const locationMatch = candidate.match(/^(.+?):(\d+):(\d+)$/);
    if (!locationMatch)
        return null;
    const runtimeFile = locationMatch[1] ?? '';
    const runtimeLine = positiveInt(locationMatch[2]);
    const runtimeColumn = positiveInt(locationMatch[3]);
    if (!runtimeFile || !runtimeLine || !runtimeColumn)
        return null;
    const sourceFile = normalizePath(runtimeFile);
    const sourceResolved = sourceFile !== runtimeFile ||
        sourceFile.endsWith('.ts') ||
        sourceFile.endsWith('.tsx') ||
        sourceFile.endsWith('.js') ||
        sourceFile.endsWith('.jsx');
    return {
        source_file: sourceFile,
        source_line: runtimeLine,
        source_column: runtimeColumn,
        function_name: functionName,
        runtime_file: runtimeFile.slice(0, 512),
        runtime_line: runtimeLine,
        runtime_column: runtimeColumn,
        source_resolved: sourceResolved,
    };
}
function parseFirstStackFrame(stack) {
    if (!stack)
        return null;
    for (const line of stack.split('\n')) {
        const frame = parseStackFrameLine(line);
        if (frame)
            return frame;
    }
    return null;
}
function readPointerFromRecord(record) {
    const pointer = {};
    const sourceFile = textValue(record.source_file ?? record.sourceFile, 512);
    const sourceLine = positiveInt(record.source_line ?? record.sourceLine);
    const sourceColumn = positiveInt(record.source_column ?? record.sourceColumn);
    const functionName = textValue(record.function_name ?? record.functionName, 256);
    const runtimeFile = textValue(record.runtime_file ?? record.runtimeFile, 512);
    const runtimeLine = positiveInt(record.runtime_line ?? record.runtimeLine);
    const runtimeColumn = positiveInt(record.runtime_column ?? record.runtimeColumn);
    const commitSha = textValue(record.commit_sha ?? record.commitSha, 80);
    const releaseId = textValue(record.release_id ?? record.releaseId, 160);
    const buildId = textValue(record.build_id ?? record.buildId, 160);
    if (sourceFile)
        pointer.source_file = sourceFile;
    if (sourceLine)
        pointer.source_line = sourceLine;
    if (sourceColumn)
        pointer.source_column = sourceColumn;
    if (functionName)
        pointer.function_name = functionName;
    if (runtimeFile)
        pointer.runtime_file = runtimeFile;
    if (runtimeLine)
        pointer.runtime_line = runtimeLine;
    if (runtimeColumn)
        pointer.runtime_column = runtimeColumn;
    if (commitSha)
        pointer.commit_sha = commitSha;
    if (releaseId)
        pointer.release_id = releaseId;
    if (buildId)
        pointer.build_id = buildId;
    if (record.source_resolved === true || record.sourceResolved === true) {
        pointer.source_resolved = true;
    }
    if (isRecord(record.code_context))
        pointer.code_context = record.code_context;
    else if (isRecord(record.codeContext))
        pointer.code_context = record.codeContext;
    return pointer;
}
function sanitizeSourceCodePointer(input) {
    const release = resolveReleaseContext();
    return {
        source_file: textValue(input.source_file, 512),
        source_line: positiveInt(input.source_line),
        source_column: positiveInt(input.source_column),
        function_name: textValue(input.function_name, 256),
        runtime_file: textValue(input.runtime_file, 512),
        runtime_line: positiveInt(input.runtime_line),
        runtime_column: positiveInt(input.runtime_column),
        commit_sha: textValue(input.commit_sha, 80) ?? release.commit_sha,
        release_id: textValue(input.release_id, 160) ?? release.release_id,
        build_id: textValue(input.build_id, 160) ?? release.build_id,
        source_resolved: input.source_resolved === true,
        code_context: isRecord(input.code_context) ? input.code_context : {},
    };
}
function extractSourceCodePointer(input) {
    const explicit = readPointerFromRecord(input);
    const contextual = isRecord(input.source_context)
        ? readPointerFromRecord(input.source_context)
        : {};
    const parsed = parseFirstStackFrame(input.stack) ?? parseFirstStackFrame(input.component_stack);
    return sanitizeSourceCodePointer({
        ...(parsed ?? {}),
        ...contextual,
        ...explicit,
        source_resolved: explicit.source_resolved === true ||
            contextual.source_resolved === true ||
            parsed?.source_resolved === true,
    });
}
function normalizeRequestTraceEvent(input) {
    const source = sanitizeSourceCodePointer(input);
    return {
        request_id: textValue(input.request_id, 256),
        trace_id: nullableUuid(input.trace_id),
        message_id: nullableUuid(input.message_id),
        run_id: textValue(input.run_id, 256),
        conversation_id: nullableUuid(input.conversation_id),
        user_id: nullableUuid(input.user_id),
        org_id: nullableUuid(input.org_id),
        surface: textValue(input.surface, 80) ?? 'unknown',
        service: textValue(input.service, 120),
        route: textValue(input.route, 512),
        method: textValue(input.method, 16),
        event_type: textValue(input.event_type, 80) ?? 'event',
        stage: textValue(input.stage, 80),
        status: textValue(input.status, 80),
        status_code: typeof input.status_code === 'number' && Number.isFinite(input.status_code)
            ? Math.floor(input.status_code)
            : null,
        duration_ms: typeof input.duration_ms === 'number' && Number.isFinite(input.duration_ms)
            ? Math.max(0, Math.floor(input.duration_ms))
            : null,
        span_id: textValue(input.span_id, 256),
        parent_span_id: textValue(input.parent_span_id, 256),
        error_code: textValue(input.error_code, 120),
        error_class: textValue(input.error_class, 120),
        workflow_class: textValue(input.workflow_class, 120),
        effect_state: textValue(input.effect_state, 120),
        retry_policy: textValue(input.retry_policy, 120),
        source_file: source.source_file ?? null,
        source_line: source.source_line ?? null,
        source_column: source.source_column ?? null,
        function_name: source.function_name ?? null,
        runtime_file: source.runtime_file ?? null,
        runtime_line: source.runtime_line ?? null,
        runtime_column: source.runtime_column ?? null,
        commit_sha: source.commit_sha ?? null,
        release_id: source.release_id ?? null,
        build_id: source.build_id ?? null,
        source_resolved: source.source_resolved === true,
        code_context: source.code_context ?? {},
        observability: isRecord(input.observability) ? input.observability : {},
    };
}
//# sourceMappingURL=source-code-pointer.js.map