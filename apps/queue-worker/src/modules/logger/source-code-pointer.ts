interface SourceCodePointer {
  source_file?: string | null
  source_line?: number | null
  source_column?: number | null
  function_name?: string | null
  runtime_file?: string | null
  runtime_line?: number | null
  runtime_column?: number | null
  commit_sha?: string | null
  release_id?: string | null
  build_id?: string | null
  source_resolved?: boolean
  code_context?: Record<string, unknown> | null
}

interface SourceCodePointerInput extends SourceCodePointer {
  stack?: string | null
  component_stack?: string | null
  source_context?: Record<string, unknown> | null
}

const PATH_ANCHORS = ['/apps/', '/packages/', '/supabase/', '/docker/', '/scripts/']

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stringValue(value: unknown, max = 512): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim().slice(0, max) : null
}

function positiveInt(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : null
}

function textValue(value: unknown, max = 256): string | null {
  return stringValue(value, max)
}

function resolveReleaseContext(): {
  commit_sha: string | null
  release_id: string | null
  build_id: string | null
} {
  const commitSha =
    textValue(process.env.VIBEY_COMMIT_SHA, 80) ??
    textValue(process.env.RAILWAY_GIT_COMMIT_SHA, 80) ??
    textValue(process.env.GITHUB_SHA, 80) ??
    textValue(process.env.SOURCE_VERSION, 80) ??
    null
  const releaseId =
    textValue(process.env.VIBEY_RELEASE_ID, 160) ??
    textValue(process.env.RAILWAY_DEPLOYMENT_ID, 160) ??
    commitSha
  const buildId = textValue(process.env.VIBEY_BUILD_ID, 160) ?? null

  return { commit_sha: commitSha, release_id: releaseId, build_id: buildId }
}

function normalizePath(raw: string): string {
  let path = raw
    .replace(/^webpack:\/\/_N_E\/\.\//, '')
    .replace(/^webpack-internal:\/\/\/\([^)]+\)\/\.\//, '')
    .replace(/^webpack-internal:\/\/\/\.\//, '')
    .replace(/^file:\/\//, '')
  const queryIndex = path.indexOf('?')
  if (queryIndex >= 0) path = path.slice(0, queryIndex)

  for (const anchor of PATH_ANCHORS) {
    const index = path.lastIndexOf(anchor)
    if (index >= 0) return path.slice(index + 1)
  }
  const cwd = process.cwd()
  if (path.startsWith(`${cwd}/`)) return path.slice(cwd.length + 1)
  return path.slice(0, 512)
}

function parseStackFrameLine(line: string): SourceCodePointer | null {
  const trimmed = line.trim()
  if (!trimmed) return null

  let candidate = trimmed
  let functionName: string | null = null
  if (trimmed.startsWith('at ')) {
    const body = trimmed.slice(3).trim()
    const openParenIndex = body.lastIndexOf('(')
    if (openParenIndex >= 0 && body.endsWith(')')) {
      functionName = body.slice(0, openParenIndex).trim() || null
      candidate = body.slice(openParenIndex + 1, -1)
    } else {
      candidate = body
    }
  } else {
    const atIndex = trimmed.lastIndexOf('@')
    if (atIndex > 0) {
      functionName = trimmed.slice(0, atIndex).trim() || null
      candidate = trimmed.slice(atIndex + 1)
    }
  }

  const locationMatch = candidate.match(/^(.+?):(\d+):(\d+)$/)
  if (!locationMatch) return null

  const runtimeFile = locationMatch[1] ?? ''
  const runtimeLine = positiveInt(locationMatch[2])
  const runtimeColumn = positiveInt(locationMatch[3])
  if (!runtimeFile || !runtimeLine || !runtimeColumn) return null

  const sourceFile = normalizePath(runtimeFile)
  return {
    source_file: sourceFile,
    source_line: runtimeLine,
    source_column: runtimeColumn,
    function_name: functionName,
    runtime_file: runtimeFile.slice(0, 512),
    runtime_line: runtimeLine,
    runtime_column: runtimeColumn,
    source_resolved:
      sourceFile !== runtimeFile ||
      sourceFile.endsWith('.ts') ||
      sourceFile.endsWith('.tsx') ||
      sourceFile.endsWith('.js') ||
      sourceFile.endsWith('.jsx'),
  }
}

function parseFirstStackFrame(stack?: string | null): SourceCodePointer | null {
  if (!stack) return null
  for (const line of stack.split('\n')) {
    const frame = parseStackFrameLine(line)
    if (frame) return frame
  }
  return null
}

function readPointerFromRecord(record: Record<string, unknown>): SourceCodePointer {
  const pointer: SourceCodePointer = {}
  const sourceFile = textValue(record.source_file ?? record.sourceFile, 512)
  const sourceLine = positiveInt(record.source_line ?? record.sourceLine)
  const sourceColumn = positiveInt(record.source_column ?? record.sourceColumn)
  const functionName = textValue(record.function_name ?? record.functionName, 256)
  const runtimeFile = textValue(record.runtime_file ?? record.runtimeFile, 512)
  const runtimeLine = positiveInt(record.runtime_line ?? record.runtimeLine)
  const runtimeColumn = positiveInt(record.runtime_column ?? record.runtimeColumn)
  const commitSha = textValue(record.commit_sha ?? record.commitSha, 80)
  const releaseId = textValue(record.release_id ?? record.releaseId, 160)
  const buildId = textValue(record.build_id ?? record.buildId, 160)

  if (sourceFile) pointer.source_file = sourceFile
  if (sourceLine) pointer.source_line = sourceLine
  if (sourceColumn) pointer.source_column = sourceColumn
  if (functionName) pointer.function_name = functionName
  if (runtimeFile) pointer.runtime_file = runtimeFile
  if (runtimeLine) pointer.runtime_line = runtimeLine
  if (runtimeColumn) pointer.runtime_column = runtimeColumn
  if (commitSha) pointer.commit_sha = commitSha
  if (releaseId) pointer.release_id = releaseId
  if (buildId) pointer.build_id = buildId
  if (record.source_resolved === true || record.sourceResolved === true) {
    pointer.source_resolved = true
  }
  if (isRecord(record.code_context)) pointer.code_context = record.code_context
  else if (isRecord(record.codeContext)) pointer.code_context = record.codeContext
  return pointer
}

function sanitizeSourceCodePointer(input: SourceCodePointer): SourceCodePointer {
  const release = resolveReleaseContext()
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
  }
}

export function extractSourceCodePointer(input: SourceCodePointerInput): SourceCodePointer {
  const explicit = readPointerFromRecord(input as Record<string, unknown>)
  const contextual = isRecord(input.source_context)
    ? readPointerFromRecord(input.source_context)
    : {}
  const parsed = parseFirstStackFrame(input.stack) ?? parseFirstStackFrame(input.component_stack)

  return sanitizeSourceCodePointer({
    ...(parsed ?? {}),
    ...contextual,
    ...explicit,
    source_resolved:
      explicit.source_resolved === true ||
      contextual.source_resolved === true ||
      parsed?.source_resolved === true,
  })
}
