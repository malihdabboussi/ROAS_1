import type { ChannelMember, ChannelMention } from './channel-types'

export interface MentionCandidate {
  key: string
  type: 'user' | 'agent'
  handle: string
  label: string
  user_id?: string
  agent_key?: string
  avatarUrl?: string | null
}

const MENTION_REGEX = /(^|\s)@([a-zA-Z0-9._-]+)/g

function toHandleSeed(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function buildMentionCandidates(
  members: ChannelMember[],
  rosterAvatars?: Map<string, string>,
): MentionCandidate[] {
  const usedHandles = new Set<string>()

  return members.map((member, index) => {
    const isUser = member.member_type === 'user'
    const displayName = member.profile?.full_name?.trim()
    const baseLabel = isUser
      ? displayName || `User ${member.user_id?.slice(0, 8) ?? index + 1}`
      : displayName || member.agent_key || `Agent ${index + 1}`
    const handleSeed = isUser
      ? toHandleSeed(displayName || member.user_id || `user-${index + 1}`)
      : toHandleSeed(displayName || member.agent_key || `agent-${index + 1}`)

    let handle = handleSeed || (isUser ? `user-${index + 1}` : `agent-${index + 1}`)
    let dedupeCount = 2
    while (usedHandles.has(handle)) {
      handle = `${handleSeed}-${dedupeCount}`
      dedupeCount += 1
    }
    usedHandles.add(handle)

    const lookupKey = isUser ? member.user_id : member.agent_key
    const rosterAvatar = lookupKey ? (rosterAvatars?.get(lookupKey) ?? null) : null
    const profileAvatar = member.profile?.avatar_url ?? null

    return {
      key: member.id,
      type: isUser ? 'user' : 'agent',
      handle,
      label: baseLabel,
      user_id: member.user_id ?? undefined,
      agent_key: member.agent_key ?? undefined,
      avatarUrl: rosterAvatar || profileAvatar,
    }
  })
}

export function parseMentionsFromText(
  text: string,
  candidates: MentionCandidate[],
): ChannelMention[] {
  const mentions: ChannelMention[] = []
  const byHandle = new Map(
    candidates.map((candidate) => [candidate.handle.toLowerCase(), candidate]),
  )
  const seen = new Set<string>()

  let match: RegExpExecArray | null
  MENTION_REGEX.lastIndex = 0
  while ((match = MENTION_REGEX.exec(text)) !== null) {
    const handle = match[2]?.toLowerCase()
    if (!handle) continue

    const candidate = byHandle.get(handle)
    if (!candidate) continue

    const dedupeKey = `${candidate.type}:${candidate.user_id ?? candidate.agent_key ?? candidate.key}`
    if (seen.has(dedupeKey)) continue
    seen.add(dedupeKey)

    mentions.push({
      type: candidate.type,
      user_id: candidate.user_id,
      agent_key: candidate.agent_key,
      label: candidate.label,
    })
  }

  return mentions
}

export function getMentionQuery(
  text: string,
  caretPosition: number,
): { query: string; start: number; end: number } | null {
  const head = text.slice(0, caretPosition)
  const atIndex = head.lastIndexOf('@')
  if (atIndex === -1) return null

  const beforeAt = atIndex > 0 ? (head[atIndex - 1] ?? ' ') : ' '
  if (!/\s/.test(beforeAt)) return null

  const rawQuery = head.slice(atIndex + 1)
  if (/\s/.test(rawQuery)) return null

  return {
    query: rawQuery,
    start: atIndex,
    end: caretPosition,
  }
}

export function applyMentionToText(
  text: string,
  mentionRange: { start: number; end: number },
  candidate: MentionCandidate,
): { value: string; caretPosition: number } {
  const mentionText = `@${candidate.handle} `
  const nextValue = `${text.slice(0, mentionRange.start)}${mentionText}${text.slice(mentionRange.end)}`
  const caretPosition = mentionRange.start + mentionText.length
  return { value: nextValue, caretPosition }
}

export function parseEntityMentionsFromHtml(html: string): ChannelMention[] {
  const mentions: ChannelMention[] = []
  const seen = new Set<string>()
  const tagRe = /<span\b([^>]*)\bclass="[^"]*\bentity-chip\b[^"]*"([^>]*)>/g
  let match: RegExpExecArray | null
  while ((match = tagRe.exec(html))) {
    const attrs = `${match[1] ?? ''} ${match[2] ?? ''}`
    const kind = /data-entity-kind="([^"]+)"/.exec(attrs)?.[1]
    const entityId = /data-entity-id="([^"]+)"/.exec(attrs)?.[1]
    const labelMatch = /data-entity-label="([^"]*)"/.exec(attrs)?.[1] ?? ''
    if (!kind || !entityId) continue
    const key = `${kind}:${entityId}`
    if (seen.has(key)) continue
    seen.add(key)
    mentions.push({
      type: kind as ChannelMention['type'],
      entity_id: entityId,
      agent_key: kind === 'agent' ? entityId : undefined,
      label: labelMatch,
    })
  }
  return mentions
}
