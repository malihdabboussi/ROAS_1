import { Profiler } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  WorkspaceSettingsModalProvider,
  useWorkspaceSettingsModal,
} from '@/lib/settings/workspace-settings-modal-context'
import { ChatInput } from './ChatInput'

const mockFns = vi.hoisted(() => ({
  clearAll: vi.fn(),
  clearAttachedFiles: vi.fn(),
  handleFileSelect: vi.fn(),
  handleRemoveFile: vi.fn(),
  mergeForSend: vi.fn(),
  onSend: vi.fn(),
  restoreAttachedFiles: vi.fn(),
  setAttachedFiles: vi.fn(),
  triggerPrewarmNow: vi.fn(),
  updateBlock: vi.fn(),
}))

vi.mock('@/features/composer/pasted-text', () => ({
  PastedTextComposerControls: () => <div data-testid="pasted-text-controls" />,
  usePastedTextBlocks: () => ({
    blocks: [],
    hasBlocks: false,
    editingBlock: null,
    editingBlockId: null,
    setEditingBlockId: vi.fn(),
    tryAddFromClipboard: vi.fn(),
    updateBlock: mockFns.updateBlock,
    removeBlock: vi.fn(),
    clearAll: mockFns.clearAll,
    mergeForSend: mockFns.mergeForSend,
  }),
}))

vi.mock('@/lib/hooks/use-presigned-upload', () => ({
  usePresignedUpload: () => ({ upload: vi.fn() }),
}))

vi.mock('./ChatInput/chat-input-shell', () => ({
  ChatInputShell: ({ footer, textareaProps }: { footer: any; textareaProps: any }) => (
    <div data-testid="chat-input-shell">
      <textarea
        aria-label="composer"
        disabled={textareaProps.disabled}
        onFocus={textareaProps.onFocus}
        readOnly
        value={textareaProps.value}
      />
      <button
        type="button"
        onClick={() => footer.props.modelPickerProps.onOpenWorkspaceModels()}
      >
        Open workspace models
      </button>
    </div>
  ),
}))

vi.mock('./ChatInput/use-chat-input-file-upload', () => ({
  useChatInputFileUpload: () => ({
    attachedFiles: [],
    setAttachedFiles: mockFns.setAttachedFiles,
    restoreAttachedFiles: mockFns.restoreAttachedFiles,
    clearAttachedFiles: mockFns.clearAttachedFiles,
    handleFileSelect: mockFns.handleFileSelect,
    handleRemoveFile: mockFns.handleRemoveFile,
  }),
}))

vi.mock('./ChatInput/use-chat-input-model-controller', () => ({
  useChatInputModelController: ({ onOpenWorkspaceModels }: { onOpenWorkspaceModels: () => void }) => ({
    modelOptions: [],
    modelDropdownOpen: false,
    setModelDropdownOpen: vi.fn(),
    modelButtonRef: { current: null },
    modelDropdownRef: { current: null },
    subscriptionSubmenuRef: { current: null },
    modelHoverCardRef: { current: null },
    modelEditPanelRef: { current: null },
    activeComposerModel: null,
    activeModelOption: null,
    activeModelSettings: null,
    selectedContextOption: null,
    modelPickerProps: { onOpenWorkspaceModels },
  }),
}))

vi.mock('./ChatInput/use-chat-input-slash-data', () => ({
  useChatInputSlashData: () => ({
    slashMenuOpen: false,
    setSlashMenuOpen: vi.fn(),
    slashItems: [],
    slashHighlight: 0,
    setSlashHighlight: vi.fn(),
    allSlashItems: [],
    allSlashItemsRef: { current: [] },
    syncSlashMenuFromComposer: vi.fn(),
  }),
}))

vi.mock('./ChatInput/use-chat-input-slash-layout', () => ({
  useChatInputSlashLayout: () => ({
    slashSkillsExpanded: false,
    slashWorkflowsExpanded: false,
    setSlashSkillsExpanded: vi.fn(),
    setSlashWorkflowsExpanded: vi.fn(),
    slashMenuLayout: {
      skillItems: [],
      workflowItems: [],
      skillVisible: [],
      workflowVisible: [],
      visibleFlat: [],
      skillMoreCount: 0,
      workflowMoreCount: 0,
      showSkillMore: false,
      showWorkflowMore: false,
    },
  }),
}))

vi.mock('./ChatInput/use-chat-input-attachment-removal', () => ({
  useChatInputAttachmentRemoval: () => ({
    handleArtifactRemove: vi.fn(),
    handleReferenceRemove: vi.fn(),
  }),
}))

vi.mock('./ChatInput/use-chat-input-at-mention-controller', () => ({
  useChatInputAtMentionController: () => ({
    atMenuOpen: false,
    atItems: [],
    syncAtMenuFromComposer: vi.fn(),
    setAtMenuTab: vi.fn(),
    setAtMenuOpen: vi.fn(),
    atNavCount: 0,
    atHighlight: 0,
    atMenuTab: 'artifacts',
    crossCampaignMode: false,
    atComposerNavSlice: { kind: 'items', items: [] },
    atArtifactNavRows: [],
    atMediaNavRows: [],
    setCrossCampaignMode: vi.fn(),
    setCrossCampaignId: vi.fn(),
    setAtItems: vi.fn(),
    setAtQuery: vi.fn(),
    setAtHighlight: vi.fn(),
    setAtArtifactCollapsedByType: vi.fn(),
    setAtArtifactMoreByType: vi.fn(),
    setAtMediaCollapsedByType: vi.fn(),
    setAtMediaMoreByType: vi.fn(),
    studioAtTabsForMenu: [],
    atQuery: '',
    crossCampaignLoading: false,
    atDataLoading: false,
    atMenuLayout: { showSpaceTaskMore: false, showMissionMore: false },
    handleBackFromCrossCampaign: vi.fn(),
    handleAtMenuTabChange: vi.fn(),
    handleToggleArtifactCollapsed: vi.fn(),
    handleShowAllArtifacts: vi.fn(),
    handleToggleMediaCollapsed: vi.fn(),
    handleShowAllMedia: vi.fn(),
    setAtSpaceTasksExpanded: vi.fn(),
    setAtMissionsExpanded: vi.fn(),
  }),
}))

vi.mock('./ChatInput/use-chat-input-floating-menus', () => ({
  useChatInputFloatingMenus: () => ({
    slashDropdownRef: { current: null },
    atDropdownRef: { current: null },
    slashFloatingContainerRef: vi.fn(),
    slashFloatingStyles: {},
    atFloatingContainerRef: vi.fn(),
    atFloatingStyles: {},
    atComposerShellRect: null,
    updateSlashFloating: vi.fn(),
    updateAtFloating: vi.fn(),
  }),
}))

vi.mock('./ChatInput/use-chat-input-prewarm', () => ({
  useChatInputPrewarm: () => ({
    triggerPrewarmNow: mockFns.triggerPrewarmNow,
    triggerPrewarmDebounced: vi.fn(),
  }),
}))

vi.mock('./ChatInput/use-chat-input-recording', () => ({
  useChatInputRecording: () => ({
    recordingState: 'idle',
    displayText: '',
    setDisplayText: vi.fn(),
    handleStartRecording: vi.fn(),
    handleStopRecording: vi.fn(),
    handleCancelRecording: vi.fn(),
    handleTranscriptionUpdate: vi.fn(),
    handleTranscriptionComplete: vi.fn(),
    handleRecordingError: vi.fn(),
  }),
}))

vi.mock('./ChatInput/use-chat-input-textarea-controller', () => ({
  useChatInputTextareaController: () => ({
    resizeTextarea: vi.fn(),
    handleTextareaScroll: vi.fn(),
    handleTextareaChange: vi.fn(),
    handleTextareaSelect: vi.fn(),
    openAtMenu: vi.fn(),
  }),
}))

vi.mock('./ChatInput/use-chat-input-dropzone', () => ({
  useChatInputDropzone: () => ({
    isDragOver: false,
    handleDragEnter: vi.fn(),
    handleDragLeave: vi.fn(),
    handleDragOver: vi.fn(),
    handleDrop: vi.fn(),
  }),
}))

vi.mock('./ChatInput/use-chat-input-draft', () => ({
  useChatInputDraft: vi.fn(),
}))

vi.mock('./ChatInput/use-chat-input-text-accessors', () => ({
  useChatInputTextAccessors: () => ({ setText: vi.fn() }),
}))

vi.mock('./ChatInput/use-chat-input-global-shortcuts', () => ({
  useChatInputGlobalShortcuts: vi.fn(),
}))

vi.mock('./ChatInput/use-chat-input-context-controller', () => ({
  useChatInputContextController: () => ({
    inputValue: '',
    contextMeter: null,
    breakdownPanelEnabled: false,
    contextPopoverOpen: false,
    contextPopoverAnchorRef: { current: null },
    contextPopoverTriggerRef: { current: null },
    updateContextPopoverPosition: vi.fn(),
    toggleContextPopover: vi.fn(),
    contextPopoverPanelRef: { current: null },
    contextPopoverPosition: null,
    contextPopoverPanelRefCallback: vi.fn(),
  }),
}))

vi.mock('./ChatInput/use-chat-input-plus-controller', () => ({
  useChatInputPlusController: () => ({
    plusMenuOpen: false,
    plusMenuRef: { current: null },
    plusSubmenuRef: { current: null },
    plusButtonRef: { current: null },
    setPlusMenuOpen: vi.fn(),
    setPlusSubmenu: vi.fn(),
    togglePlusMenu: vi.fn(),
    showDrivePicker: false,
    setShowDrivePicker: vi.fn(),
    showDropboxPicker: false,
    setShowDropboxPicker: vi.fn(),
    handleFileFromCloud: vi.fn(),
    plusMenuProps: {},
  }),
}))

vi.mock('./ChatInput/use-chat-input-outside-close', () => ({
  useChatInputOutsideClose: vi.fn(),
}))

vi.mock('./ChatInput/chat-input-highlight-backdrop', () => ({
  hasChatInputSlashCommand: () => false,
  renderChatInputHighlightBackdrop: vi.fn(),
}))

vi.mock('./ChatInput/use-chat-input-external-attachments', () => ({
  useChatInputExternalAttachments: () => ({ attachComposerSpaceTask: vi.fn() }),
}))

vi.mock('./ChatInput/use-chat-input-selection-handlers', () => ({
  useChatInputSelectionHandlers: () => ({
    handleSlashSelect: vi.fn(),
    handleCampaignSelect: vi.fn(),
    handleAtSelect: vi.fn(),
  }),
}))

vi.mock('./ChatInput/use-chat-input-paste', () => ({
  useChatInputPaste: () => ({ handleComposerPaste: vi.fn() }),
}))

vi.mock('./ChatInput/use-chat-input-send', () => ({
  useChatInputSend: () => vi.fn(),
}))

vi.mock('./ChatInput/use-chat-input-keydown', () => ({
  useChatInputKeyDown: () => vi.fn(),
}))

function SettingsProbe() {
  const { isOpen, initialSection } = useWorkspaceSettingsModal()
  return (
    <output data-testid="workspace-settings-state">
      {isOpen ? 'open' : 'closed'}:{initialSection}
    </output>
  )
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('ChatInput', () => {
  it('opens workspace model settings through the shared provider without render churn', async () => {
    let commitCount = 0

    render(
      <Profiler id="chat-input" onRender={() => commitCount++}>
        <WorkspaceSettingsModalProvider>
          <ChatInput onSend={mockFns.onSend} />
          <SettingsProbe />
        </WorkspaceSettingsModalProvider>
      </Profiler>,
    )

    expect(screen.getByTestId('workspace-settings-state').textContent).toBe('closed:properties')

    fireEvent.focus(screen.getByLabelText('composer'))
    fireEvent.click(screen.getByRole('button', { name: 'Open workspace models' }))

    await waitFor(() =>
      expect(screen.getByTestId('workspace-settings-state').textContent).toBe('open:models'),
    )
    expect(mockFns.triggerPrewarmNow).toHaveBeenCalledTimes(1)
    expect(commitCount).toBeLessThan(8)
  })
})
