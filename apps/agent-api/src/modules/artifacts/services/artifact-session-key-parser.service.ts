import { Injectable } from '@nestjs/common'
import { canonicalAgentKey } from '@vibey/agent-policy'

@Injectable()
export class ArtifactSessionKeyParserService {
  parseUserId(sessionKey: string): string | null {
    return this.parseSessionIds(sessionKey)?.userId ?? null
  }

  parseConversationId(sessionKey: string): string | null {
    return this.parseSessionIds(sessionKey)?.conversationId ?? null
  }

  parseSessionIds(sessionKey: string): { userId: string; conversationId: string | null } | null {
    let base = sessionKey
    const dblIdx = base.indexOf('::')
    if (dblIdx !== -1) base = base.substring(0, dblIdx)
    const parts = base.split(':')
    const modeIdx = parts.findIndex(
      (p, i) =>
        i >= 2 &&
        (p === 'mission' ||
          p === 'subtask' ||
          p === 'state' ||
          p === 'eval' ||
          p === 'brain_ops' ||
          p === 'dream_ops'),
    )
    const searchFrom = modeIdx !== -1 ? modeIdx : 2
    let suffix = parts.length > searchFrom ? parts.slice(searchFrom).join(':') : base
    if (modeIdx === -1) {
      const gatewayId = parts[1]
      if (gatewayId && suffix.startsWith(`${gatewayId}-`)) {
        suffix = suffix.slice(gatewayId.length + 1)
      }
    }
    const uuidMatches = suffix.match(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    )
    if (!uuidMatches || uuidMatches.length === 0) return null
    const userId = uuidMatches[0] ?? ''
    const conversationId = uuidMatches[1] ?? null
    if (!userId) return null
    return { userId, conversationId }
  }

  isMissionSessionKey(sessionKey: string): boolean {
    const base = sessionKey.includes('::campaign:')
      ? sessionKey.split('::campaign:')[0]
      : sessionKey
    return (
      base.includes(':mission:') ||
      base.includes(':subtask:') ||
      base.includes(':state:') ||
      base.includes(':dream_ops:') ||
      base.includes('-brain-job-')
    )
  }

  parseCampaignIdFromSessionKey(sessionKey: string): string | null {
    if (!sessionKey.includes('::campaign:')) return null
    const after = sessionKey.split('::campaign:')[1]?.trim()
    if (!after || after.length === 0) return null
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const segment = after.includes('::') ? after.split('::')[0] : after
    return uuidPattern.test(segment ?? '') ? (segment ?? null) : null
  }

  parseSpaceIdFromSessionKey(sessionKey: string): string | null {
    if (!sessionKey.includes('::space:')) return null
    const after = sessionKey.split('::space:')[1]?.trim()
    if (!after || after.length === 0) return null
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const segment = after.includes('::') ? after.split('::')[0] : after
    return uuidPattern.test(segment ?? '') ? (segment ?? null) : null
  }

  parseOrgIdFromSessionKey(sessionKey: string): string | null {
    if (!sessionKey.includes('::org:')) return null
    const after = sessionKey.split('::org:')[1]?.trim()
    if (!after || after.length === 0) return null
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const segment = after.includes('::') ? after.split('::')[0] : after
    return uuidPattern.test(segment ?? '') ? (segment ?? null) : null
  }

  parseOrgIdFromGatewayPrefix(sessionKey: string): string | null {
    if (!sessionKey) return null
    const parts = sessionKey.split(':')
    if (parts[0] === 'agent' && parts[1] === 'org') {
      const orgId = parts[2]
      const uuidPattern =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      return uuidPattern.test(orgId ?? '') ? (orgId ?? null) : null
    }
    const gatewayId = parts[1]
    if (!gatewayId) return null
    const m = gatewayId.match(
      /^org-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})-/i,
    )
    return m?.[1] ?? null
  }

  parseAgentIdFromSessionKey(sessionKey: string): string | null {
    let base = sessionKey
    const dblIdx = base.indexOf('::')
    if (dblIdx !== -1) base = base.substring(0, dblIdx)
    const parts = base.split(':')
    const modeIdx = parts.findIndex(
      (p, i) =>
        i >= 2 &&
        (p === 'mission' ||
          p === 'subtask' ||
          p === 'state' ||
          p === 'eval' ||
          p === 'brain_ops' ||
          p === 'dream_ops'),
    )
    let resolved: string | null
    if (modeIdx !== -1) {
      resolved = parts[modeIdx + 1] || null
    } else {
      resolved = parts[1] || null
    }
    if (resolved === 'default' || resolved === 'main') return 'vibey'
    return resolved ? canonicalAgentKey(resolved) : null
  }
}
