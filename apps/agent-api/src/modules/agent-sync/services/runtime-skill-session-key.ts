import { canonicalAgentKey } from '@vibey/agent-policy'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const UUID_GLOBAL_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi

export interface RuntimeSkillSessionContext {
  agentKey: string
  userId: string
  orgId: string | null
}

function stripSessionSuffix(sessionKey: string): string {
  const dblIdx = sessionKey.indexOf('::')
  return dblIdx === -1 ? sessionKey : sessionKey.substring(0, dblIdx)
}

function parseUserId(sessionKey: string): string | null {
  const base = stripSessionSuffix(sessionKey)
  const parts = base.split(':')
  const modeIdx = parts.findIndex(
    (part, index) =>
      index >= 2 &&
      (part === 'mission' ||
        part === 'subtask' ||
        part === 'state' ||
        part === 'eval' ||
        part === 'brain_ops'),
  )
  const searchFrom = modeIdx !== -1 ? modeIdx : 2
  let suffix = parts.length > searchFrom ? parts.slice(searchFrom).join(':') : base
  if (modeIdx === -1) {
    const gatewayId = parts[1]
    if (gatewayId && suffix.startsWith(`${gatewayId}-`)) {
      suffix = suffix.slice(gatewayId.length + 1)
    }
  }
  const uuidMatches = suffix.match(UUID_GLOBAL_PATTERN)
  return uuidMatches?.[0] ?? null
}

function parseOrgIdFromSuffix(sessionKey: string): string | null {
  if (!sessionKey.includes('::org:')) return null
  const after = sessionKey.split('::org:')[1]?.trim()
  if (!after) return null
  const segment = after.includes('::') ? after.split('::')[0] : after
  return UUID_PATTERN.test(segment ?? '') ? (segment ?? null) : null
}

function parseOrgIdFromGatewayPrefix(sessionKey: string): string | null {
  const parts = stripSessionSuffix(sessionKey).split(':')
  if (parts[0] === 'agent' && parts[1] === 'org') {
    const orgId = parts[2]
    return UUID_PATTERN.test(orgId ?? '') ? (orgId ?? null) : null
  }
  const gatewayId = parts[1]
  if (!gatewayId) return null
  const match = gatewayId.match(
    /^org-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})-/i,
  )
  return match?.[1] ?? null
}

function parseAgentKey(sessionKey: string): string | null {
  const base = stripSessionSuffix(sessionKey)
  const parts = base.split(':')
  const modeIdx = parts.findIndex(
    (part, index) =>
      index >= 2 &&
      (part === 'mission' ||
        part === 'subtask' ||
        part === 'state' ||
        part === 'eval' ||
        part === 'brain_ops'),
  )
  const raw = modeIdx !== -1 ? parts[modeIdx + 1] : parts[1]
  if (!raw) return null
  if (raw === 'default' || raw === 'main') return 'vibey'
  return canonicalAgentKey(raw)
}

export function parseRuntimeSkillSessionContext(
  sessionKey: string | undefined,
): RuntimeSkillSessionContext | null {
  const key = sessionKey?.trim()
  if (!key) return null
  const userId = parseUserId(key)
  const agentKey = parseAgentKey(key)
  if (!userId || !agentKey) return null
  return {
    agentKey,
    userId,
    orgId: parseOrgIdFromSuffix(key) ?? parseOrgIdFromGatewayPrefix(key),
  }
}
