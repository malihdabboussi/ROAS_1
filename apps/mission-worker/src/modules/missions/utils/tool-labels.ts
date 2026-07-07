/** Built-in tools — safe generic timeline entries (never show args/output). */
const BUILTIN_TOOL_LABELS: Record<string, string> = {
  read: 'Scanning your workspace for relevant context',
  exec: 'Running a command',
  process: 'Managing background process',
  write: 'Writing output',
  edit: 'Editing content',
  wait: 'Waiting for results',
}

const READ_LABEL_ROTATION = [
  'Scanning your workspace for relevant context',
  'Reviewing the most relevant files for your request',
  'Tracing key details across your project context',
  'Pulling the exact references needed for a strong answer',
  'Connecting the important signals before building',
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

export function stripEmoji(s: string): string {
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

export function isCampaignToolName(name: string): boolean {
  return name === 'vibey_backend' || name === 'campaign_capability'
}

function humanizeToolAction(action: string): string {
  return action.replace(/[_-]+/g, ' ').trim()
}

const HIDDEN_CAMPAIGN_ACTIONS = new Set(['describe_action'])

export function isHiddenCampaignAction(name: string, action?: string): boolean {
  return isCampaignToolName(name) && !!action && HIDDEN_CAMPAIGN_ACTIONS.has(action)
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

export function resolveLabel(
  name: string,
  args?: Record<string, unknown>,
): {
  label: string
  hidden: boolean
  action?: string
} {
  if (isCampaignToolName(name)) {
    const action = ((args?.action as string) ?? '').trim()
    if (isHiddenCampaignAction(name, action)) return { label: '', hidden: true, action }
    const raw = typeof args?.label === 'string' ? args.label.trim() : ''
    if (raw) return { label: stripEmoji(raw), hidden: false, action }
    const fallbackLabel = action
      ? `Working on ${humanizeToolAction(action)}`
      : 'Working on artifact'
    return { label: stripEmoji(fallbackLabel), hidden: false, action }
  }

  if (name in BUILTIN_TOOL_LABELS) {
    if (name === 'read') {
      return {
        label: resolveReadLabel(args),
        hidden: false,
      }
    }
    if (name === 'wait') {
      const reason = typeof args?.reason === 'string' ? args.reason.trim() : ''
      return {
        label: reason || 'Waiting for results',
        hidden: false,
      }
    }
    return {
      label: BUILTIN_TOOL_LABELS[name] ?? 'Running tool',
      hidden: false,
    }
  }

  switch (name) {
    case 'web_search': {
      const q = (args?.query as string) ?? (args?.q as string) ?? ''
      const detail = q ? (q.length > 50 ? q.slice(0, 47) + '…' : q) : ''
      return {
        label: stripEmoji(detail ? `Researching: ${detail}` : 'Researching your market'),
        hidden: false,
      }
    }
    case 'web_fetch':
      return { label: 'Pulling in reference material', hidden: false }
    case 'read_document':
      return { label: 'Reading attached document', hidden: false }
    case 'browser':
      return { label: 'Reviewing a live page', hidden: false }
    case 'image':
      return { label: 'Analyzing your image', hidden: false }
    case 'nano-banana-pro':
      return { label: 'Generating a visual', hidden: false }
    case 'tts':
      return { label: 'Creating audio', hidden: false }
    case 'message':
      return { label: 'Sending a message', hidden: false }
    default:
      return {
        label: `Running ${(name || 'tool').replace(/[_-]+/g, ' ').trim()}`,
        hidden: false,
      }
  }
}
