import type { Channel, ChannelMember, ChannelMessage } from '../services/channels.service'

export type ChannelRightPanelActiveTab = 'messages' | 'deliverables' | 'context'

export interface ChannelRightPanelAwareness {
  activeTab: ChannelRightPanelActiveTab
  openThreadId: string | null
  visibleMessageIds: string[]
  deliverableThreadFilter: string | null
  composerDraft: {
    text: string
    attachmentNames: string[]
    pastedBlockCount: number
    recordingState: 'idle' | 'recording' | 'finishing'
    linkInputOpen: boolean
    uploadingAttachmentCount: number
  }
  previewDeliverable: {
    id: string
    title: string
    type: string
  } | null
}

interface BuildChannelAwarenessContextInput {
  channel: Channel | null
  members: ChannelMember[]
  messages: ChannelMessage[]
  activeThreadId?: string | null
  rightPanel?: ChannelRightPanelAwareness & {
    mobileMode?: 'chat' | 'channel'
    chatCollapsed?: boolean
  }
}

export function buildChannelAwarenessContext({
  channel,
  members,
  messages,
  activeThreadId,
  rightPanel,
}: BuildChannelAwarenessContextInput): string {
  const visibleMessages = messages.filter((message) => !message.reply_to_id)
  const activeThreadMessages = activeThreadId
    ? messages.filter(
        (message) => message.reply_to_id === activeThreadId || message.id === activeThreadId,
      )
    : []
  const pinnedMessages = messages.filter((message) => message.pinned)
  const messagesById = new Map(messages.map((message) => [message.id, message]))
  const memberLines = members.slice(0, 25).map((member) => {
    const label =
      member.member_type === 'agent'
        ? (member.agent_key ?? 'agent')
        : (member.profile?.full_name ?? member.user_id ?? 'user')
    return `- ${member.member_type}:${label} (${member.role})`
  })
  const latestMessages = visibleMessages.slice(-8).map((message) => {
    const content = typeof message.content === 'string' ? message.content.trim() : ''
    return content
      ? `- ${message.sender_type}:${message.sender_id} at ${message.created_at}: ${content.slice(0, 180)}`
      : ''
  })
  const threadMessages = activeThreadMessages.slice(-8).map((message) => {
    const content = typeof message.content === 'string' ? message.content.trim() : ''
    return content
      ? `- ${message.sender_type}:${message.sender_id} at ${message.created_at}: ${content.slice(0, 180)}`
      : ''
  })
  const viewportMessageLines = (rightPanel?.visibleMessageIds ?? []).map((id) => {
    const message = messagesById.get(id)
    const content = typeof message?.content === 'string' ? message.content.trim() : ''
    return message && content
      ? `- ${message.sender_type}:${message.sender_id} at ${message.created_at}: ${content.slice(0, 220)}`
      : ''
  })
  const composerDraft = rightPanel?.composerDraft
  const hasComposerDraft =
    Boolean(composerDraft?.text.trim()) ||
    Boolean(composerDraft?.attachmentNames.length) ||
    Boolean(composerDraft?.pastedBlockCount)

  const lines = [
    '[Channel Context]',
    'Use this as the live snapshot of what the user currently sees in the channel page right panel.',
    channel ? `Channel: ${channel.name} (id: ${channel.id})` : '',
    channel?.description ? `Description: ${channel.description}` : '',
    channel ? `Visibility: ${channel.is_private ? 'private' : 'public'}` : '',
    rightPanel ? '[Right Panel View State]' : '',
    rightPanel ? `Visible surface: ${rightPanel.activeTab}` : '',
    rightPanel?.mobileMode ? `Mobile selected surface: ${rightPanel.mobileMode}` : '',
    typeof rightPanel?.chatCollapsed === 'boolean'
      ? `Left chat collapsed: ${rightPanel.chatCollapsed ? 'yes' : 'no'}`
      : '',
    rightPanel
      ? `Thread panel: ${rightPanel.openThreadId ? `open (${rightPanel.openThreadId})` : 'closed'}`
      : '',
    rightPanel?.deliverableThreadFilter
      ? `Deliverables filtered to thread: ${rightPanel.deliverableThreadFilter}`
      : '',
    rightPanel?.previewDeliverable
      ? `Open deliverable preview: ${rightPanel.previewDeliverable.title} (${rightPanel.previewDeliverable.type}, id: ${rightPanel.previewDeliverable.id})`
      : '',
    composerDraft ? `Right-side composer draft present: ${hasComposerDraft ? 'yes' : 'no'}` : '',
    composerDraft?.text.trim()
      ? `Right-side composer draft text: ${composerDraft.text.slice(0, 600)}`
      : '',
    composerDraft?.attachmentNames.length
      ? `Right-side composer attachments: ${composerDraft.attachmentNames.join(', ')}`
      : '',
    composerDraft?.pastedBlockCount
      ? `Right-side composer pasted text blocks: ${composerDraft.pastedBlockCount}`
      : '',
    composerDraft && composerDraft.recordingState !== 'idle'
      ? `Right-side voice recording state: ${composerDraft.recordingState}`
      : '',
    composerDraft?.linkInputOpen ? 'Right-side link input is open.' : '',
    composerDraft?.uploadingAttachmentCount
      ? `Right-side attachments still uploading: ${composerDraft.uploadingAttachmentCount}`
      : '',
    viewportMessageLines.some(Boolean) ? 'Messages currently visible in right-panel viewport:' : '',
    ...viewportMessageLines,
    `Members visible: ${members.length}`,
    memberLines.length ? 'Visible members:' : '',
    ...memberLines,
    `Messages visible: ${visibleMessages.length}`,
    `Pinned messages visible: ${pinnedMessages.length}`,
    activeThreadId ? `Open thread: ${activeThreadId}` : '',
    threadMessages.some(Boolean) ? 'Visible open thread messages:' : '',
    ...threadMessages,
    latestMessages.some(Boolean) ? 'Latest visible main-channel messages:' : '',
    ...latestMessages,
  ].filter(Boolean)

  return lines.join('\n').slice(0, 4000)
}
