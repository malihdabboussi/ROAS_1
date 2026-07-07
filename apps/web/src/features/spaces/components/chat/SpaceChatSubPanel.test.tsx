import type { ComponentProps } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { SpaceChatSubPanel } from './SpaceChatSubPanel'

vi.mock('./SpaceVoiceRunsView', () => ({
  SpaceVoiceRunsView: ({ onBack }: { onBack: () => void }) => (
    <button type="button" onClick={onBack}>
      voice runs
    </button>
  ),
}))

vi.mock('./PresentationCommentsChatView', () => ({
  PresentationCommentsChatView: ({ onBack }: { onBack: () => void }) => (
    <button type="button" onClick={onBack}>
      presentation comments
    </button>
  ),
}))

vi.mock('./SpaceConversationsList', () => ({
  SpaceConversationsList: ({ onBack }: { onBack: () => void }) => (
    <button type="button" onClick={onBack}>
      conversations
    </button>
  ),
}))

vi.mock('./PresentationDesignChatView', () => ({
  PresentationDesignChatView: () => <div>presentation design</div>,
}))

vi.mock('./PresentationTweaksChatView', () => ({
  PresentationTweaksChatView: () => <div>presentation tweaks</div>,
}))

vi.mock('./FunnelCommentsChatView', () => ({
  FunnelCommentsChatView: () => <div>funnel comments</div>,
}))

vi.mock('./FunnelDesignChatView', () => ({
  FunnelDesignChatView: () => <div>funnel design</div>,
}))

vi.mock('./FunnelTweaksChatView', () => ({
  FunnelTweaksChatView: () => <div>funnel tweaks</div>,
}))

type SpaceChatSubPanelProps = ComponentProps<typeof SpaceChatSubPanel>

function createProps(overrides: Partial<SpaceChatSubPanelProps> = {}): SpaceChatSubPanelProps {
  return {
    panelMode: 'conversations',
    selectedConversationId: null,
    voiceRunTasks: [],
    voiceDelegationMessages: [],
    setMode: vi.fn(),
    presentationCommentsSession: null,
    presentationComments: [],
    addPresentationComment: vi.fn(),
    resolvePresentationComment: vi.fn(),
    sendPresentationCommentsToVibe: vi.fn(),
    setPresentationCommentsChatActive: vi.fn(),
    setPresentationFullMode: vi.fn(),
    presentationDesignSession: null,
    presentationDesignBundle: null,
    presentationDesignSelectedTrace: null,
    savePresentationDesignFile: vi.fn(),
    setPresentationDesignChatActive: vi.fn(),
    presentationTweaksSession: null,
    presentationTweaksBundle: null,
    setPresentationTweaksChatActive: vi.fn(),
    funnelCommentsSession: null,
    funnelComments: [],
    addFunnelComment: vi.fn(),
    resolveFunnelComment: vi.fn(),
    sendFunnelCommentsToVibe: vi.fn(),
    setFunnelCommentsChatActive: vi.fn(),
    setFunnelFullMode: vi.fn(),
    funnelDesignSession: null,
    funnelDesignBundle: null,
    funnelDesignSelectedTrace: null,
    saveFunnelDesignFile: vi.fn(),
    setFunnelDesignChatActive: vi.fn(),
    funnelTweaksSession: null,
    setFunnelTweaksChatActive: vi.fn(),
    visibleConversations: [],
    conversationQuery: '',
    setConversationQuery: vi.fn(),
    handleSelectConversation: vi.fn(),
    handleNewConversation: vi.fn(),
    handleDeleteConversation: vi.fn(),
    handleRenameConversation: vi.fn(),
    handleTogglePinConversation: vi.fn(),
    handleToggleArchiveConversation: vi.fn(),
    handleMoveConversation: vi.fn(),
    handleDuplicateConversation: vi.fn(),
    handleCopyConversationLink: vi.fn(),
    handleCopyConversationId: vi.fn(),
    handleOpenConversationInNewTab: vi.fn(),
    setShareConversation: vi.fn(),
    conversationsLoading: false,
    isOrgContext: false,
    conversationAgentScope: 'active',
    setConversationAgentScope: vi.fn(),
    conversationAgentByKey: {},
    ...overrides,
  }
}

afterEach(() => {
  cleanup()
})

describe('SpaceChatSubPanel', () => {
  it('renders voice runs and delegates back', () => {
    const setMode = vi.fn()

    render(
      <SpaceChatSubPanel
        {...createProps({
          panelMode: 'voice-runs',
          setMode,
        })}
      />,
    )

    fireEvent.click(screen.getByText('voice runs'))

    expect(setMode).toHaveBeenCalledWith('chat')
  })

  it('renders presentation comments when that panel has props', () => {
    const setMode = vi.fn()
    const setPresentationCommentsChatActive = vi.fn()
    const setPresentationFullMode = vi.fn()

    render(
      <SpaceChatSubPanel
        {...createProps({
          panelMode: 'presentation-comments',
          setMode,
          setPresentationCommentsChatActive,
          setPresentationFullMode,
          presentationCommentsSession: {
            presentationName: 'Launch deck',
          },
        })}
      />,
    )

    fireEvent.click(screen.getByText('presentation comments'))

    expect(setPresentationCommentsChatActive).toHaveBeenCalledWith(false)
    expect(setPresentationFullMode).toHaveBeenCalledWith('preview')
    expect(setMode).toHaveBeenCalledWith('chat')
  })

  it('falls back to conversations when a specialized panel has no props', () => {
    render(<SpaceChatSubPanel {...createProps({ panelMode: 'funnel-design' })} />)

    expect(screen.getByText('conversations')).toBeTruthy()
  })
})
