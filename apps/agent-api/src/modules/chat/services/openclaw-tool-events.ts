import { isCampaignToolName } from '../../shared/ui-block-extractor'

/** Built-in tools — show as safe generic timeline entries (never show args/output). */
const BUILTIN_TOOL_LABELS: Record<string, string> = {
  read: 'Scanning your workspace for relevant context',
  exec: 'Running a command',
  process: 'Managing background process',
  write: 'Writing output',
  edit: 'Editing content',
  wait: 'Waiting for results',
  read_skill: 'Reading skill instructions',
}

const READ_LABEL_ROTATION = [
  'Scanning your workspace for relevant context',
  'Reviewing the most relevant files for your request',
  'Tracing key details across your project context',
  'Pulling the exact references needed for a strong answer',
  'Connecting the important signals before building',
]

const HIDDEN_CAMPAIGN_ACTIONS = new Set(['describe_action'])

export const PREVIEW_EXCLUDED_ACTIONS = new Set([
  'save_user_memory',
  'crystallize_user_brain',
  'ingest_user_brain_link',
  'ingest_user_brain_text',
])

const TOOL_ERROR_RBAC_PATTERNS = [
  'denied by rbac',
  'is not allowed for',
  'is restricted to',
  'cannot use integrations',
  'is reserved for',
  'no valid capability profile',
]
const TOOL_ERROR_AUTH_PATTERNS = [
  'session has expired',
  'missing request context',
  'invalid x-session-key',
  'missing refresh token',
  'failed to refresh supabase token',
]
const TOOL_ERROR_INTEGRATION_PATTERNS = [
  'not connected',
  'not enabled',
  'no composio toolkit',
  'is not connected',
  'is disabled',
]
const TOOL_ERROR_BILLING_PATTERNS = ['credits_exhausted', 'credits exhausted', 'payment required']
const TOOL_ERROR_WORKFLOW_CIRCUIT_PATTERNS = [
  'not working from chat right now',
  'workflow is not working',
]

function hashSeed(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  }
  return hash
}

function resolveReadLabel(args?: Record<string, unknown>): string {
  const seed = JSON.stringify({
    path: typeof args?.path === 'string' ? args.path : '',
    glob: typeof args?.glob === 'string' ? args.glob : '',
    type: typeof args?.type === 'string' ? args.type : '',
    target_directory: typeof args?.target_directory === 'string' ? args.target_directory : '',
    query: typeof args?.query === 'string' ? args.query : '',
  })
  const idx = hashSeed(seed) % READ_LABEL_ROTATION.length
  return READ_LABEL_ROTATION[idx] ?? READ_LABEL_ROTATION[0]!
}

/** Strip emoji and other symbols from labels (agent may still send them) */
function stripEmoji(s: string): string {
  return s
    .replace(
      /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}]/gu,
      '',
    )
    .replace(/\s+/g, ' ')
    .trim()
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

export function isHiddenCampaignAction(name: string, action?: string): boolean {
  return isCampaignToolName(name) && !!action && HIDDEN_CAMPAIGN_ACTIONS.has(action)
}

export function extractCampaignAction(value: unknown): string {
  const record = asRecord(value)
  return typeof record?.action === 'string' ? record.action.trim() : ''
}

export function humanizeToolAction(action: string): string {
  return action.replace(/[_-]+/g, ' ').trim()
}

export function resolveToolUpdateDetail(name: string, partialResult: unknown): string | null {
  const partial = asRecord(partialResult)

  if (isCampaignToolName(name)) {
    const messageLike =
      typeof partial?.message === 'string'
        ? partial.message
        : typeof partial?.detail === 'string'
          ? partial.detail
          : null
    if (messageLike) return stripEmoji(messageLike.trim())
  }

  // Keep updates safe and high-signal: no args/output echo, only progress hints.
  if (name === 'exec') {
    if (partial?.running === true) return 'Command is still running'
    if (typeof partial?.exit_code === 'number')
      return `Command finished (exit ${partial.exit_code})`
    return 'Command update'
  }

  if (name === 'process') {
    const runningForMs =
      typeof partial?.running_for_ms === 'number' && Number.isFinite(partial.running_for_ms)
        ? partial.running_for_ms
        : null
    if (runningForMs != null) {
      const seconds = Math.max(1, Math.round(runningForMs / 1000))
      return `Process running (${seconds}s)`
    }
    if (typeof partial?.exit_code === 'number')
      return `Process finished (exit ${partial.exit_code})`
    return 'Process update'
  }

  if (name === 'wait') {
    const elapsed = typeof partial?.elapsed_seconds === 'number' ? partial.elapsed_seconds : null
    const total = typeof partial?.total_seconds === 'number' ? partial.total_seconds : null
    const reason = typeof partial?.reason === 'string' ? partial.reason.trim() : ''
    if (elapsed != null && total != null) {
      return reason ? `${reason} (${elapsed}s / ${total}s)` : `Waiting (${elapsed}s / ${total}s)`
    }
    return reason || 'Waiting for results'
  }

  const statusLike =
    typeof partial?.status === 'string'
      ? partial.status
      : typeof partial?.phase === 'string'
        ? partial.phase
        : typeof partial?.state === 'string'
          ? partial.state
          : null
  if (statusLike) return stripEmoji(statusLike.replace(/[_-]+/g, ' ').trim())

  const messageLike = typeof partial?.message === 'string' ? partial.message : null
  if (messageLike) return stripEmoji(messageLike.trim())

  return null
}

export function extractStringFieldFromPartialJson(
  raw: string,
  field: string,
  startAt = 0,
  requireComplete = false,
): string | null {
  const fieldIdx = raw.indexOf(`"${field}"`, startAt)
  if (fieldIdx === -1) return null
  const colonIdx = raw.indexOf(':', fieldIdx)
  if (colonIdx === -1) return null
  const firstQuoteIdx = raw.indexOf('"', colonIdx + 1)
  if (firstQuoteIdx === -1) return null
  let out = ''
  let escaped = false
  for (let i = firstQuoteIdx + 1; i < raw.length; i++) {
    const ch = raw[i]!
    if (escaped) {
      if (ch === 'n') out += '\n'
      else if (ch === 'r') out += '\r'
      else if (ch === 't') out += '\t'
      else out += ch
      escaped = false
      continue
    }
    if (ch === '\\') {
      escaped = true
      continue
    }
    if (ch === '"') return out
    out += ch
  }
  if (requireComplete) return null
  return out.length > 0 ? out : null
}

export function extractContentFromPartialToolArgs(raw: string): string | null {
  const dataIdx = raw.indexOf('"data"')
  if (dataIdx !== -1) {
    const nested = extractStringFieldFromPartialJson(raw, 'content', dataIdx)
    if (nested) return nested
  }
  return extractStringFieldFromPartialJson(raw, 'content')
}

/**
 * Resolve a human-friendly label for a tool call.
 * - campaign tool (vibey_backend / campaign_capability): strict agent-provided label only
 * - read/write/exec/edit: hidden (internal workspace ops, no user value)
 * - web_search/web_fetch: user-facing research labels
 * - everything else: clean fallback
 */
export function resolveLabel(
  name: string,
  args?: Record<string, unknown>,
): {
  label: string
  hidden: boolean
  action?: string
  source: 'agent_label' | 'action_fallback' | 'builtin_map' | 'tool_map' | 'default_fallback'
} {
  if (isCampaignToolName(name)) {
    const action = ((args?.action as string) ?? '').trim()
    if (isHiddenCampaignAction(name, action)) {
      return { label: '', hidden: true, action, source: 'action_fallback' }
    }
    const raw = typeof args?.label === 'string' ? args.label.trim() : ''
    if (raw) return { label: stripEmoji(raw), hidden: false, action, source: 'agent_label' }
    // Always emit a visible start row for campaign/artifact work.
    const fallbackLabel = action
      ? `Working on ${humanizeToolAction(action)}`
      : 'Working on artifact'
    return { label: stripEmoji(fallbackLabel), hidden: false, action, source: 'action_fallback' }
  }

  if (name in BUILTIN_TOOL_LABELS) {
    if (name === 'read') {
      return {
        label: resolveReadLabel(args),
        hidden: false,
        source: 'builtin_map',
      }
    }
    if (name === 'wait') {
      const reason = typeof args?.reason === 'string' ? args.reason.trim() : ''
      return {
        label: reason || 'Waiting for results',
        hidden: false,
        source: 'builtin_map',
      }
    }
    return {
      label: BUILTIN_TOOL_LABELS[name] ?? 'Running tool',
      hidden: false,
      source: 'builtin_map',
    }
  }

  switch (name) {
    case 'web_search': {
      const q = (args?.query as string) ?? (args?.q as string) ?? ''
      const detail = q ? (q.length > 50 ? q.slice(0, 47) + '…' : q) : ''
      return {
        label: stripEmoji(detail ? `Researching: ${detail}` : 'Researching your market'),
        hidden: false,
        source: 'tool_map',
      }
    }
    case 'web_fetch':
      return { label: 'Pulling in reference material', hidden: false, source: 'tool_map' }
    case 'read_document':
      return { label: 'Reading attached document', hidden: false, source: 'tool_map' }
    case 'browser': {
      const browserAction = typeof args?.action === 'string' ? args.action : ''
      const browserUrl =
        typeof args?.url === 'string'
          ? args.url
          : typeof args?.targetUrl === 'string'
            ? args.targetUrl
            : ''
      let domain = ''
      try {
        domain = browserUrl ? new URL(browserUrl).hostname.replace(/^www\./, '') : ''
      } catch {
        /* ignore */
      }
      const BROWSER_ACTION_LABELS: Record<string, string> = {
        navigate: domain ? `Navigating to ${domain}` : 'Navigating',
        screenshot: domain ? `Capturing ${domain}` : 'Taking screenshot',
        snapshot: 'Reading page content',
        click: 'Clicking on element',
        type: 'Typing text',
        scroll: 'Scrolling page',
        evaluate: 'Running page script',
        tabs: 'Managing browser tabs',
        close: 'Closing tab',
        cookies_set: 'Restoring login session',
        cookies_get: 'Reading browser cookies',
        cookies_clear: 'Clearing browser cookies',
      }
      const browserLabel =
        BROWSER_ACTION_LABELS[browserAction] ??
        (domain ? `Browsing ${domain}` : 'Reviewing a live page')
      return { label: browserLabel, hidden: false, source: 'tool_map' }
    }
    case 'image':
      return { label: 'Analyzing your image', hidden: false, source: 'tool_map' }
    case 'nano-banana-pro':
      return { label: 'Generating a visual', hidden: false, source: 'tool_map' }
    case 'tts':
      return { label: 'Creating audio', hidden: false, source: 'tool_map' }
    case 'message':
      return { label: 'Sending a message', hidden: false, source: 'tool_map' }
    default:
      // Never emit "Working on it" — always show which tool is running.
      return {
        label: `Running ${(name || 'tool').replace(/[_-]+/g, ' ').trim()}`,
        hidden: false,
        source: 'default_fallback',
      }
  }
}

export function formatToolFailureMessage(result: unknown): string {
  const record = asRecord(result)
  if (record) {
    const details = asRecord(record.details)
    const contract = details && typeof details.error_class === 'string' ? details : record
    const userExplanation = asRecord(contract.user_explanation)
    if (typeof userExplanation?.sentence === 'string' && userExplanation.sentence.trim()) {
      return userExplanation.sentence.trim()
    }
    if (typeof contract.error === 'string') return contract.error
    if (typeof contract.message === 'string') return contract.message
    if (typeof record.error === 'string') return record.error
    if (typeof record.message === 'string') return record.message
    return JSON.stringify(record).slice(0, 500)
  }
  if (typeof result === 'string') return result.slice(0, 500)
  return String(result ?? 'unknown error')
}

export function inferToolErrorCategory(errorDetail: string): string {
  const lower = errorDetail.toLowerCase()
  if (TOOL_ERROR_WORKFLOW_CIRCUIT_PATTERNS.some((p) => lower.includes(p))) return 'workflow_circuit'
  if (TOOL_ERROR_RBAC_PATTERNS.some((p) => lower.includes(p))) return 'rbac'
  if (TOOL_ERROR_AUTH_PATTERNS.some((p) => lower.includes(p))) return 'auth'
  if (TOOL_ERROR_INTEGRATION_PATTERNS.some((p) => lower.includes(p))) return 'integration'
  if (TOOL_ERROR_BILLING_PATTERNS.some((p) => lower.includes(p))) return 'billing'
  return 'tool'
}
