'use client'

import type { ComponentProps } from 'react'
import { FunnelCommentsChatView } from './FunnelCommentsChatView'
import { FunnelDesignChatView } from './FunnelDesignChatView'
import { FunnelTweaksChatView } from './FunnelTweaksChatView'
import { PresentationCommentsChatView } from './PresentationCommentsChatView'
import { PresentationDesignChatView } from './PresentationDesignChatView'
import { PresentationTweaksChatView } from './PresentationTweaksChatView'
import { SpaceConversationsList } from './SpaceConversationsList'
import { SpaceVoiceRunsView } from './SpaceVoiceRunsView'
import type { SpaceChatMode } from './space-vibey-chat-mode-sync'

interface SpaceChatSubPanelProps {
  panelMode: SpaceChatMode
  selectedConversationId: string | null
  voiceRunTasks: ComponentProps<typeof SpaceVoiceRunsView>['tasks']
  voiceDelegationMessages: ComponentProps<typeof SpaceVoiceRunsView>['messages']
  setMode: (mode: SpaceChatMode) => void
  presentationCommentsSession: { presentationName: string } | null
  presentationComments: ComponentProps<typeof PresentationCommentsChatView>['comments']
  addPresentationComment: (comment: { body: string }) => void
  resolvePresentationComment: ComponentProps<typeof PresentationCommentsChatView>['onResolveComment']
  sendPresentationCommentsToVibe: ComponentProps<
    typeof PresentationCommentsChatView
  >['onSendCommentsToVibe']
  setPresentationCommentsChatActive: (active: boolean) => void
  setPresentationFullMode: (mode: 'preview') => void
  presentationDesignSession: { presentationName: string } | null
  presentationDesignBundle: ComponentProps<typeof PresentationDesignChatView>['bundle']
  presentationDesignSelectedTrace: ComponentProps<
    typeof PresentationDesignChatView
  >['selectedTrace']
  savePresentationDesignFile: ComponentProps<typeof PresentationDesignChatView>['onSaveFile']
  setPresentationDesignChatActive: (active: boolean) => void
  presentationTweaksSession: { presentationId: string; presentationName: string } | null
  presentationTweaksBundle: ComponentProps<typeof PresentationTweaksChatView>['bundle']
  setPresentationTweaksChatActive: (active: boolean) => void
  funnelCommentsSession: { funnelName: string } | null
  funnelComments: ComponentProps<typeof FunnelCommentsChatView>['comments']
  addFunnelComment: (comment: { body: string }) => void
  resolveFunnelComment: ComponentProps<typeof FunnelCommentsChatView>['onResolveComment']
  sendFunnelCommentsToVibe: ComponentProps<typeof FunnelCommentsChatView>['onSendCommentsToVibe']
  setFunnelCommentsChatActive: (active: boolean) => void
  setFunnelFullMode: (mode: 'preview') => void
  funnelDesignSession: { funnelName: string } | null
  funnelDesignBundle: ComponentProps<typeof FunnelDesignChatView>['bundle']
  funnelDesignSelectedTrace: ComponentProps<typeof FunnelDesignChatView>['selectedTrace']
  saveFunnelDesignFile: ComponentProps<typeof FunnelDesignChatView>['onSaveFile']
  setFunnelDesignChatActive: (active: boolean) => void
  funnelTweaksSession: { funnelId: string; funnelName: string } | null
  setFunnelTweaksChatActive: (active: boolean) => void
  visibleConversations: ComponentProps<typeof SpaceConversationsList>['conversations']
  conversationQuery: string
  setConversationQuery: (query: string) => void
  handleSelectConversation: (conversationId: string) => void | Promise<void>
  handleNewConversation: () => void | Promise<void>
  handleDeleteConversation: (conversationId: string) => void | Promise<void>
  handleRenameConversation: ComponentProps<typeof SpaceConversationsList>['onRenameConversation']
  handleTogglePinConversation: ComponentProps<
    typeof SpaceConversationsList
  >['onTogglePinConversation']
  handleToggleArchiveConversation: ComponentProps<
    typeof SpaceConversationsList
  >['onToggleArchiveConversation']
  handleMoveConversation: ComponentProps<typeof SpaceConversationsList>['onMoveConversation']
  handleDuplicateConversation: ComponentProps<
    typeof SpaceConversationsList
  >['onDuplicateConversation']
  handleCopyConversationLink: ComponentProps<
    typeof SpaceConversationsList
  >['onCopyConversationLink']
  handleCopyConversationId: ComponentProps<typeof SpaceConversationsList>['onCopyConversationId']
  handleOpenConversationInNewTab: ComponentProps<
    typeof SpaceConversationsList
  >['onOpenConversationInNewTab']
  setShareConversation: ComponentProps<typeof SpaceConversationsList>['onShareConversation']
  conversationsLoading: boolean
  isOrgContext: boolean
  conversationAgentScope: 'active' | 'all'
  setConversationAgentScope: (scope: 'active' | 'all') => void
  conversationAgentByKey: ComponentProps<typeof SpaceConversationsList>['agentByKey']
}

export function SpaceChatSubPanel({
  panelMode,
  selectedConversationId,
  voiceRunTasks,
  voiceDelegationMessages,
  setMode,
  presentationCommentsSession,
  presentationComments,
  addPresentationComment,
  resolvePresentationComment,
  sendPresentationCommentsToVibe,
  setPresentationCommentsChatActive,
  setPresentationFullMode,
  presentationDesignSession,
  presentationDesignBundle,
  presentationDesignSelectedTrace,
  savePresentationDesignFile,
  setPresentationDesignChatActive,
  presentationTweaksSession,
  presentationTweaksBundle,
  setPresentationTweaksChatActive,
  funnelCommentsSession,
  funnelComments,
  addFunnelComment,
  resolveFunnelComment,
  sendFunnelCommentsToVibe,
  setFunnelCommentsChatActive,
  setFunnelFullMode,
  funnelDesignSession,
  funnelDesignBundle,
  funnelDesignSelectedTrace,
  saveFunnelDesignFile,
  setFunnelDesignChatActive,
  funnelTweaksSession,
  setFunnelTweaksChatActive,
  visibleConversations,
  conversationQuery,
  setConversationQuery,
  handleSelectConversation,
  handleNewConversation,
  handleDeleteConversation,
  handleRenameConversation,
  handleTogglePinConversation,
  handleToggleArchiveConversation,
  handleMoveConversation,
  handleDuplicateConversation,
  handleCopyConversationLink,
  handleCopyConversationId,
  handleOpenConversationInNewTab,
  setShareConversation,
  conversationsLoading,
  isOrgContext,
  conversationAgentScope,
  setConversationAgentScope,
  conversationAgentByKey,
}: SpaceChatSubPanelProps) {
  if (panelMode === 'voice-runs') {
    return (
      <SpaceVoiceRunsView
        conversationId={selectedConversationId}
        tasks={voiceRunTasks}
        messages={voiceDelegationMessages}
        onBack={() => setMode('chat')}
      />
    )
  }
  if (panelMode === 'presentation-comments' && presentationCommentsSession) {
    return (
      <PresentationCommentsChatView
        presentationName={presentationCommentsSession.presentationName}
        comments={presentationComments}
        onAddComment={(body) => addPresentationComment({ body })}
        onResolveComment={resolvePresentationComment}
        onSendCommentsToVibe={sendPresentationCommentsToVibe}
        onBack={() => {
          setPresentationCommentsChatActive(false)
          setPresentationFullMode('preview')
          setMode('chat')
        }}
      />
    )
  }
  if (panelMode === 'presentation-design' && presentationDesignSession) {
    return (
      <PresentationDesignChatView
        presentationName={presentationDesignSession.presentationName}
        bundle={presentationDesignBundle}
        selectedTrace={presentationDesignSelectedTrace}
        onSaveFile={savePresentationDesignFile}
        onBack={() => {
          setPresentationDesignChatActive(false)
          setPresentationFullMode('preview')
          setMode('chat')
        }}
      />
    )
  }
  if (panelMode === 'presentation-tweaks' && presentationTweaksSession) {
    return (
      <PresentationTweaksChatView
        presentationId={presentationTweaksSession.presentationId}
        presentationName={presentationTweaksSession.presentationName}
        bundle={presentationTweaksBundle}
        onBack={() => {
          setPresentationTweaksChatActive(false)
          setPresentationFullMode('preview')
          setMode('chat')
        }}
      />
    )
  }
  if (panelMode === 'funnel-comments' && funnelCommentsSession) {
    return (
      <FunnelCommentsChatView
        funnelName={funnelCommentsSession.funnelName}
        comments={funnelComments}
        onAddComment={(body) => addFunnelComment({ body })}
        onResolveComment={resolveFunnelComment}
        onSendCommentsToVibe={sendFunnelCommentsToVibe}
        onBack={() => {
          setFunnelCommentsChatActive(false)
          setFunnelFullMode('preview')
          setMode('chat')
        }}
      />
    )
  }
  if (panelMode === 'funnel-design' && funnelDesignSession) {
    return (
      <FunnelDesignChatView
        funnelName={funnelDesignSession.funnelName}
        bundle={funnelDesignBundle}
        selectedTrace={funnelDesignSelectedTrace}
        onSaveFile={saveFunnelDesignFile}
        onBack={() => {
          setFunnelDesignChatActive(false)
          setFunnelFullMode('preview')
          setMode('chat')
        }}
      />
    )
  }
  if (panelMode === 'funnel-tweaks' && funnelTweaksSession) {
    return (
      <FunnelTweaksChatView
        funnelId={funnelTweaksSession.funnelId}
        funnelName={funnelTweaksSession.funnelName}
        onBack={() => {
          setFunnelTweaksChatActive(false)
          setFunnelFullMode('preview')
          setMode('chat')
        }}
      />
    )
  }
  return (
    <SpaceConversationsList
      conversations={visibleConversations}
      selectedConversationId={selectedConversationId}
      query={conversationQuery}
      onQueryChange={setConversationQuery}
      onSelectConversation={(conversationId) => void handleSelectConversation(conversationId)}
      onNewConversation={() => void handleNewConversation()}
      onDeleteConversation={(conversationId) => void handleDeleteConversation(conversationId)}
      onRenameConversation={handleRenameConversation}
      onTogglePinConversation={handleTogglePinConversation}
      onToggleArchiveConversation={handleToggleArchiveConversation}
      onMoveConversation={handleMoveConversation}
      onDuplicateConversation={handleDuplicateConversation}
      onCopyConversationLink={handleCopyConversationLink}
      onCopyConversationId={handleCopyConversationId}
      onOpenConversationInNewTab={handleOpenConversationInNewTab}
      onShareConversation={setShareConversation}
      onBack={() => setMode('chat')}
      loading={conversationsLoading}
      isOrgContext={isOrgContext}
      showAllAgentsToggle
      allAgentsMode={conversationAgentScope === 'all'}
      onAllAgentsModeChange={(enabled) =>
        setConversationAgentScope(enabled ? 'all' : 'active')
      }
      agentByKey={conversationAgentByKey}
    />
  )
}
