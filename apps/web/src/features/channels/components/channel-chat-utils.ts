import type { ChannelMember, ChannelMessage } from '@/lib/channels'

export type ChannelChatActiveTab = 'messages' | 'deliverables' | 'context'

export function formatChannelJumpLabel(dateKey: string): string {
  const d = new Date(dateKey + 'T00:00:00')
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diff = today.getTime() - target.getTime()
  if (diff === 0) return 'today'
  if (diff === 86_400_000) return 'yesterday'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function getChannelSenderMeta(
  message: ChannelMessage,
  members: ChannelMember[],
  rosterAvatars?: Map<string, string>,
): { label: string; avatarUrl: string | null } {
  if (message.sender_type === 'system') return { label: 'System', avatarUrl: null }

  if (message.sender_type === 'agent') {
    const member = members.find(
      (item) => item.member_type === 'agent' && item.agent_key === message.sender_id,
    )
    const rosterAvatar =
      rosterAvatars?.get(message.sender_id) ??
      (member?.agent_key ? rosterAvatars?.get(member.agent_key) : null) ??
      null
    return { label: member?.agent_key || message.sender_id, avatarUrl: rosterAvatar }
  }

  const member = members.find(
    (item) => item.member_type === 'user' && item.user_id === message.sender_id,
  )
  const rosterAvatar = rosterAvatars?.get(message.sender_id) ?? null
  return {
    label: member?.profile?.full_name || message.sender_id,
    avatarUrl: member?.profile?.avatar_url ?? rosterAvatar,
  }
}
