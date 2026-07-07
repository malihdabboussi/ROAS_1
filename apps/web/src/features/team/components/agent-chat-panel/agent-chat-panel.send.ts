import type { Dispatch, SetStateAction } from 'react'
import type {
  Conversation,
  DocumentAttachment,
  HighlightedArtifact,
  Message,
  MessageReference,
} from '@/lib/chat/studio-chat-runtime-adapter'
import type { AttachedArtifact, ChatModelSettings } from '@/lib/chat'
import type { UiSelectedArtifact } from '@/lib/chat/ui-selected-artifact'

interface AgentChatSendStreamParams {
  conversation_id: string
  content: string
  model?: string
  documents?: DocumentAttachment[]
  campaign_id?: string
  space_id?: string | null
  scope_kind?: 'personal' | 'campaign'
  highlighted_artifacts?: HighlightedArtifact[]
  message_references?: MessageReference[]
  model_settings?: ChatModelSettings
  ui_selected_artifact?: UiSelectedArtifact
  system_context?: string
}

export interface SendAgentChatMessageInput {
  content: string
  documents?: DocumentAttachment[]
  artifacts?: AttachedArtifact[]
  modelOverride?: string
  references?: MessageReference[]
  modelSettings?: ChatModelSettings
  selectedSessionId: string | null
  isStopping: boolean
  activeCampaignId: string | null
  selectedSession: Conversation | null
  modelId?: string
  agentKey: string
  systemContext?: string
  uiSelectedArtifact?: UiSelectedArtifact | null
  getNewConversationCampaignScope: () => string | null
  createAndSelectSession: (campaignId?: string | null) => Promise<Conversation>
  getSessions: () => Conversation[]
  getMessages: (conversationId: string) => Message[]
  setSessions: Dispatch<SetStateAction<Conversation[]>>
  promoteConversation: (conversationId: string) => void
  onConversationUpdated: (conversation: Conversation) => void
  sendMessageStreaming: (params: AgentChatSendStreamParams) => Promise<unknown>
  cancelTeamDraftTimer: (conversationId: string) => void
  clearConversationTeamDraft: (conversationId: string) => Promise<unknown>
  getStoredConversation: (conversationId: string) => Conversation | undefined
  fetchConversationsForAgent: (agentKey: string) => Promise<Conversation[]>
  suggestConversationTitle: (content: string) => Promise<{ title?: string | null }>
  beginSessionTitleReveal: (conversationId: string, title: string) => void
  readConversationSpaceId: (conversation: Conversation | null) => string | null
  nowIso: () => string
}

export async function sendAgentChatMessage({
  content,
  documents,
  artifacts,
  modelOverride,
  references,
  modelSettings,
  selectedSessionId,
  isStopping,
  activeCampaignId,
  selectedSession,
  modelId,
  agentKey,
  systemContext,
  uiSelectedArtifact,
  getNewConversationCampaignScope,
  createAndSelectSession,
  getSessions,
  getMessages,
  setSessions,
  promoteConversation,
  onConversationUpdated,
  sendMessageStreaming,
  cancelTeamDraftTimer,
  clearConversationTeamDraft,
  getStoredConversation,
  fetchConversationsForAgent,
  suggestConversationTitle,
  beginSessionTitleReveal,
  readConversationSpaceId,
  nowIso,
}: SendAgentChatMessageInput): Promise<void> {
  if (selectedSessionId && isStopping) return

  let convId = selectedSessionId
  let streamCampaignId: string | null = activeCampaignId

  if (!convId) {
    const scope = getNewConversationCampaignScope() ?? activeCampaignId ?? null
    const created = await createAndSelectSession(scope ?? undefined)
    convId = created.id
    streamCampaignId = (created.campaign_id as string | null) ?? scope
  }

  if (!convId) {
    throw new Error('Conversation not available')
  }

  const streamSpaceId = readConversationSpaceId(
    getSessions().find((session) => session.id === convId) ?? selectedSession,
  )
  const isFirstMessageInThread = getMessages(convId).length === 0

  const metaBefore = getSessions().find((session) => session.id === convId)?.metadata as
    | Record<string, unknown>
    | undefined
  const hadTeamDraft = metaBefore?.team_draft === true

  const promotedAt = nowIso()
  setSessions((prev) => {
    const target = prev.find((session) => session.id === convId)
    if (!target) return prev
    return [
      { ...target, updated_at: promotedAt },
      ...prev.filter((session) => session.id !== convId),
    ]
  })
  promoteConversation(convId)
  const promotedSession = getSessions().find((session) => session.id === convId)
  if (promotedSession) {
    onConversationUpdated({ ...promotedSession, updated_at: promotedAt })
  }

  const highlightedArtifacts: HighlightedArtifact[] | undefined = artifacts?.map((artifact) => ({
    id: artifact.id,
    type: artifact.type,
    label: artifact.label,
  }))
  const messageReferences = references && references.length > 0 ? references : undefined

  await sendMessageStreaming({
    conversation_id: convId,
    content,
    model: modelOverride || modelId || undefined,
    documents,
    campaign_id: streamCampaignId || undefined,
    space_id: streamSpaceId ?? null,
    scope_kind: streamSpaceId ? (streamCampaignId ? 'campaign' : 'personal') : undefined,
    highlighted_artifacts: highlightedArtifacts,
    message_references: messageReferences,
    model_settings: modelSettings,
    ui_selected_artifact: uiSelectedArtifact ?? undefined,
    system_context: systemContext,
  })

  if (hadTeamDraft) {
    cancelTeamDraftTimer(convId)
    await clearConversationTeamDraft(convId)
    const clearedDraft =
      getStoredConversation(convId) ?? getSessions().find((session) => session.id === convId)
    if (clearedDraft) {
      const metadata = { ...(clearedDraft.metadata as Record<string, unknown> | undefined) }
      delete metadata.team_draft
      delete metadata.draft_started_at
      onConversationUpdated({ ...clearedDraft, metadata })
    }
  }

  const refreshedSessions = await fetchConversationsForAgent(agentKey)
  setSessions(refreshedSessions)

  if (isFirstMessageInThread && content.trim()) {
    void suggestConversationTitle(content.trim())
      .then((result) => {
        const title = (result.title ?? '').trim().slice(0, 80)
        if (!title) return
        const session = getSessions().find((item) => item.id === convId)
        if (session) onConversationUpdated({ ...session, title })
        beginSessionTitleReveal(convId!, title)
      })
      .catch(() => {})
  }
}
