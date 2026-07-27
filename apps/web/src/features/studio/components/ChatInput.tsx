'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { PastedTextComposerControls, usePastedTextBlocks } from '@/features/composer/pasted-text'
import { usePresignedUpload } from '@/lib/hooks/use-presigned-upload'
import { useWorkspaceSettingsModal } from '@/lib/settings/workspace-settings-modal-context'
import type { MessageReference } from '../types'
import type { AttachedArtifact } from './chat/ArtifactAttachments'
import {
  hasChatInputSlashCommand,
  renderChatInputHighlightBackdrop,
} from './ChatInput/chat-input-highlight-backdrop'
import { ChatInputShell } from './ChatInput/chat-input-shell'
import type { ChatInputProps } from './ChatInput/chat-input.types'
import { useChatInputAtMentionController } from './ChatInput/use-chat-input-at-mention-controller'
import { useChatInputAttachmentRemoval } from './ChatInput/use-chat-input-attachment-removal'
import { useChatInputContextController } from './ChatInput/use-chat-input-context-controller'
import { useChatInputDraft } from './ChatInput/use-chat-input-draft'
import { useChatInputDropzone } from './ChatInput/use-chat-input-dropzone'
import { useChatInputExternalAttachments } from './ChatInput/use-chat-input-external-attachments'
import { useChatInputFileUpload } from './ChatInput/use-chat-input-file-upload'
import { useChatInputFloatingMenus } from './ChatInput/use-chat-input-floating-menus'
import { useChatInputGlobalShortcuts } from './ChatInput/use-chat-input-global-shortcuts'
import { useChatInputKeyDown } from './ChatInput/use-chat-input-keydown'
import { useChatInputModelController } from './ChatInput/use-chat-input-model-controller'
import { useChatInputOutsideClose } from './ChatInput/use-chat-input-outside-close'
import { useChatInputPaste } from './ChatInput/use-chat-input-paste'
import { useChatInputPlusController } from './ChatInput/use-chat-input-plus-controller'
import { useChatInputPrewarm } from './ChatInput/use-chat-input-prewarm'
import { useChatInputRecording } from './ChatInput/use-chat-input-recording'
import { useChatInputSelectionHandlers } from './ChatInput/use-chat-input-selection-handlers'
import { useChatInputSend } from './ChatInput/use-chat-input-send'
import { useChatInputSlashData } from './ChatInput/use-chat-input-slash-data'
import { useChatInputSlashLayout } from './ChatInput/use-chat-input-slash-layout'
import { useChatInputTextAccessors } from './ChatInput/use-chat-input-text-accessors'
import { useChatInputTextareaController } from './ChatInput/use-chat-input-textarea-controller'

export function ChatInput({
  onSend,
  disabled = false,
  sendDisabled = false,
  creditsExhausted = false,
  isStreaming = false,
  onStop,
  placeholder = 'Message ROAS... (@ to tag offers or docs)',
  initialValue,
  initialDocuments,
  restoreNonce,
  draftContextKeyOverride,
  consumePendingComposerText = true,
  roundedClass = 'rounded-2xl',
  wrapperClass,
  insertTextRef,
  setTextRef,
  composerMirrorRef,
  onComposerValueChange,
  activeCapabilityChip,
  onClearCapabilityChip,
  compact = false,
  campaignId,
  spaceId,
  scopeKind,
  conversationId = null,
  defaultModel = null,
  defaultModelSettings = null,
  campaignModelStrategy = null,
  onEnqueue,
  onSendNow,
  queueLength = 0,
  portalTargetRef,
  onVoiceStart,
  agentKey = 'vibey',
  dropZoneRef,
  spaceComposerSpaceTasks,
  spaceComposerListenExternalAttach = false,
  composerFooterAfterIntegrationsSlot,
  plusMenuSpacePicker,
  footerWrapperClassName,
}: ChatInputProps) {
  const { openWorkspaceSettings } = useWorkspaceSettingsModal()
  const draftContextKey = draftContextKeyOverride ?? conversationId ?? 'new'
  const {
    blocks: pastedBlocks,
    hasBlocks: hasPastedBlocks,
    editingBlock: pastedEditingBlock,
    editingBlockId: pastedEditingBlockId,
    setEditingBlockId: setPastedEditingBlockId,
    tryAddFromClipboard,
    updateBlock: updatePastedBlock,
    removeBlock: removePastedBlock,
    clearAll: clearPastedBlocks,
    mergeForSend,
  } = usePastedTextBlocks({
    persistence: { mode: 'zustand', contextKey: draftContextKey },
  })
  const [value, setValue] = useState(() => (initialValue ? initialValue : ''))
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const highlightBackdropRef = useRef<HTMLDivElement>(null)
  /** Measure shell for @ menu width (aligned with ChannelComposer entity mention sizing). */
  const composerShellRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const valueRef = useRef(value)
  valueRef.current = value

  useEffect(() => {
    onComposerValueChange?.(value)
  }, [onComposerValueChange, value])

  const { upload: presignedUpload } = usePresignedUpload()
  const {
    attachedFiles,
    setAttachedFiles,
    restoreAttachedFiles,
    clearAttachedFiles,
    handleFileSelect,
    handleRemoveFile,
  } = useChatInputFileUpload({
    initialDocuments,
    campaignId,
    uploadFile: presignedUpload,
  })
  const [attachedArtifacts, setAttachedArtifacts] = useState<AttachedArtifact[]>([])

  const modelController = useChatInputModelController({
    conversationId,
    defaultModel,
    defaultModelSettings,
    campaignModelStrategy,
    portalTargetRef,
    onOpenWorkspaceModels: () => openWorkspaceSettings('models'),
  })

  const {
    slashMenuOpen,
    setSlashMenuOpen,
    slashItems,
    slashHighlight,
    setSlashHighlight,
    allSlashItems,
    allSlashItemsRef,
    syncSlashMenuFromComposer,
  } = useChatInputSlashData({ agentKey, valueRef })
  const {
    slashPlaybooksExpanded: _slashPlaybooksExpanded,
    slashSkillsExpanded,
    slashWorkflowsExpanded,
    setSlashPlaybooksExpanded,
    setSlashSkillsExpanded,
    setSlashWorkflowsExpanded,
    slashMenuLayout,
  } = useChatInputSlashLayout({
    slashMenuOpen,
    slashItems,
    slashHighlight,
    setSlashHighlight,
  })

  const [attachedReferences, setAttachedReferences] = useState<MessageReference[]>([])
  const { handleArtifactRemove, handleReferenceRemove } = useChatInputAttachmentRemoval({
    setAttachedArtifacts,
    setAttachedReferences,
  })
  const atMentionController = useChatInputAtMentionController({
    campaignId,
    textareaRef,
    spaceComposerSpaceTasks,
  })

  const floatingMenus = useChatInputFloatingMenus({
    textareaRef,
    composerShellRef,
    value,
    slashMenuOpen,
    slashItems,
    slashSkillsExpanded,
    slashWorkflowsExpanded,
    atMenuOpen: atMentionController.atMenuOpen,
    atItems: atMentionController.atItems,
  })

  const { triggerPrewarmNow, triggerPrewarmDebounced } = useChatInputPrewarm({
    textareaRef,
    conversationId,
    campaignId,
    spaceId,
    scopeKind,
    activeComposerModel: modelController.activeComposerModel,
    activeModelSettings: modelController.activeModelSettings,
  })

  const {
    recordingState,
    displayText,
    setDisplayText,
    handleStartRecording,
    handleStopRecording,
    handleCancelRecording,
    handleTranscriptionUpdate,
    handleTranscriptionComplete,
    handleRecordingError,
  } = useChatInputRecording({ value, setValue, textareaRef })

  const {
    resizeTextarea,
    handleTextareaScroll,
    handleTextareaChange,
    handleTextareaSelect,
    openAtMenu: handleComposerOpenAtMenu,
  } = useChatInputTextareaController({
    textareaRef,
    highlightBackdropRef,
    recordingState,
    value,
    displayText,
    setValue,
    setDisplayText,
    onInputPrewarm: triggerPrewarmDebounced,
    syncSlashMenuFromComposer,
    syncAtMenuFromComposer: atMentionController.syncAtMenuFromComposer,
    updateSlashFloating: floatingMenus.updateSlashFloating,
    updateAtFloating: floatingMenus.updateAtFloating,
    slashMenuOpen,
    atMenuOpen: atMentionController.atMenuOpen,
    setAtMenuTab: atMentionController.setAtMenuTab,
  })

  const { isDragOver, handleDragEnter, handleDragLeave, handleDragOver, handleDrop } =
    useChatInputDropzone({
      disabled,
      recordingState,
      dropZoneRef,
      handleFileSelect,
      setAttachedArtifacts,
      setAttachedReferences,
    })

  useChatInputDraft({
    value,
    draftContextKey,
    initialValue,
    initialDocuments,
    restoreNonce,
    textareaRef,
    setValue,
    setDisplayText,
    clearPastedBlocks,
    restoreAttachedFiles,
  })

  const { setText } = useChatInputTextAccessors({
    value,
    textareaRef,
    setValue,
    setDisplayText,
    insertTextRef,
    setTextRef,
    composerMirrorRef,
    consumePendingComposerText,
  })

  useChatInputGlobalShortcuts({
    disabled,
    recordingState,
    onStartRecording: handleStartRecording,
    onStopRecording: handleStopRecording,
    onVoiceStart,
  })

  const contextController = useChatInputContextController({
    recordingState,
    value,
    displayText,
    selectedContextOption: modelController.selectedContextOption,
    activeModelOption: modelController.activeModelOption,
    attachedFiles,
    attachedArtifacts,
    attachedReferences,
    pastedBlocks,
    composerShellRef,
  })

  const plusController = useChatInputPlusController({
    agentKey,
    portalTargetRef,
    fileInputRef,
    handleFileSelect,
    allSlashItems,
    onOpenAtMenu: handleComposerOpenAtMenu,
    onGenerateImage: () => {
      setText('Generate an image: ')
    },
    plusMenuSpacePicker,
  })

  useChatInputOutsideClose({
    plusMenuOpen: plusController.plusMenuOpen,
    modelDropdownOpen: modelController.modelDropdownOpen,
    slashMenuOpen,
    atMenuOpen: atMentionController.atMenuOpen,
    contextPopoverOpen: contextController.contextPopoverOpen,
    plusMenuRef: plusController.plusMenuRef,
    plusSubmenuRef: plusController.plusSubmenuRef,
    plusButtonRef: plusController.plusButtonRef,
    modelDropdownRef: modelController.modelDropdownRef,
    subscriptionSubmenuRef: modelController.subscriptionSubmenuRef,
    modelHoverCardRef: modelController.modelHoverCardRef,
    modelEditPanelRef: modelController.modelEditPanelRef,
    modelButtonRef: modelController.modelButtonRef,
    slashDropdownRef: floatingMenus.slashDropdownRef,
    atDropdownRef: floatingMenus.atDropdownRef,
    textareaRef,
    contextPopoverPanelRef: contextController.contextPopoverPanelRef,
    contextPopoverTriggerRef: contextController.contextPopoverTriggerRef,
    setPlusMenuOpen: plusController.setPlusMenuOpen,
    setPlusSubmenu: plusController.setPlusSubmenu,
    setModelDropdownOpen: modelController.setModelDropdownOpen,
    setSlashMenuOpen,
    setAtMenuOpen: atMentionController.setAtMenuOpen,
    setContextPopoverOpen: contextController.setContextPopoverOpen,
  })

  const renderHighlightBackdrop = useCallback(
    (text: string) => renderChatInputHighlightBackdrop(text, allSlashItemsRef.current),
    [allSlashItemsRef],
  )

  const hasSlashCommand = hasChatInputSlashCommand(contextController.inputValue)

  const { attachComposerSpaceTask } = useChatInputExternalAttachments({
    enabled: spaceComposerListenExternalAttach,
    setAttachedArtifacts,
    setAttachedFiles,
    setText,
    handleFileSelect,
  })

  const { handleSlashSelect, handleCampaignSelect, handleAtSelect } = useChatInputSelectionHandlers(
    {
      textareaRef,
      recordingState,
      value,
      displayText,
      setValue,
      setDisplayText,
      setSlashMenuOpen,
      setAtMenuOpen: atMentionController.setAtMenuOpen,
      setCrossCampaignMode: atMentionController.setCrossCampaignMode,
      setCrossCampaignId: atMentionController.setCrossCampaignId,
      setAtItems: atMentionController.setAtItems,
      setAtQuery: atMentionController.setAtQuery,
      setAtMenuTab: atMentionController.setAtMenuTab,
      setAtHighlight: atMentionController.setAtHighlight,
      setAttachedReferences,
      setAttachedArtifacts,
      attachComposerSpaceTask,
    },
  )

  const { handleComposerPaste } = useChatInputPaste({
    disabled,
    recordingState,
    handleFileSelect,
    tryAddFromClipboard,
  })

  const handleSend = useChatInputSend({
    value,
    displayText,
    recordingState,
    disabled,
    sendDisabled,
    isStreaming,
    onSend,
    onEnqueue,
    activeComposerModel: modelController.activeComposerModel,
    activeModelSettings: modelController.activeModelSettings,
    modelOptions: modelController.modelOptions,
    attachedFiles,
    attachedArtifacts,
    attachedReferences,
    draftContextKey,
    mergeForSend,
    textareaRef,
    setValue,
    setDisplayText,
    clearPastedBlocks,
    clearAttachedFiles,
    setAttachedArtifacts,
    setAttachedReferences,
  })

  const handleKeyDown = useChatInputKeyDown({
    disabled,
    recordingState,
    onStartRecording: handleStartRecording,
    onStopRecording: handleStopRecording,
    onVoiceStart,
    atMenuOpen: atMentionController.atMenuOpen,
    atNavCount: atMentionController.atNavCount,
    atHighlight: atMentionController.atHighlight,
    atMenuTab: atMentionController.atMenuTab,
    crossCampaignMode: atMentionController.crossCampaignMode,
    atNavSlice: atMentionController.atComposerNavSlice,
    artifactRows: atMentionController.atArtifactNavRows,
    mediaRows: atMentionController.atMediaNavRows,
    setAtMenuOpen: atMentionController.setAtMenuOpen,
    setCrossCampaignMode: atMentionController.setCrossCampaignMode,
    setCrossCampaignId: atMentionController.setCrossCampaignId,
    setAtHighlight: atMentionController.setAtHighlight,
    setAtArtifactCollapsedByType: atMentionController.setAtArtifactCollapsedByType,
    setAtArtifactMoreByType: atMentionController.setAtArtifactMoreByType,
    setAtMediaCollapsedByType: atMentionController.setAtMediaCollapsedByType,
    setAtMediaMoreByType: atMentionController.setAtMediaMoreByType,
    onCampaignSelect: handleCampaignSelect,
    onAtSelect: handleAtSelect,
    slashMenuOpen,
    slashVisibleItems: slashMenuLayout.visibleFlat,
    slashHighlight,
    setSlashMenuOpen,
    setSlashHighlight,
    onSlashSelect: handleSlashSelect,
    textareaRef,
    value,
    displayText,
    allSlashItemsRef,
    setValue,
    setDisplayText,
    resizeTextarea,
    hasPastedBlocks,
    queueLength,
    onSendNow,
    onSend: handleSend,
  })

  const composerPadX = compact ? 'px-spacing-1' : 'px-spacing-2'
  const composerStripPb = compact ? 'pb-spacing-1' : 'pb-spacing-2'
  const composerChipRowPad = `${composerPadX} ${composerStripPb}`
  const portalTarget = portalTargetRef?.current ?? null

  const handleTextareaFocus = useCallback(() => {
    triggerPrewarmNow()
  }, [triggerPrewarmNow])

  return (
    <ChatInputShell
      shellRef={composerShellRef}
      wrapperClass={wrapperClass}
      roundedClass={roundedClass}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      pastedTextControls={
        <PastedTextComposerControls
          blocks={pastedBlocks}
          editingBlock={pastedEditingBlock}
          editingBlockId={pastedEditingBlockId}
          stripClassName={composerChipRowPad}
          onEditBlock={setPastedEditingBlockId}
          onCloseEditor={() => setPastedEditingBlockId(null)}
          onSaveBlock={updatePastedBlock}
          onRemoveBlock={removePastedBlock}
        />
      }
      attachmentsProps={{
        fileInputRef,
        attachedFiles,
        attachedArtifacts,
        attachedReferences,
        creditsExhausted,
        composerPadX,
        composerChipRowPad,
        onFileSelect: handleFileSelect,
        onFileRemove: handleRemoveFile,
        onArtifactRemove: handleArtifactRemove,
        onReferenceRemove: handleReferenceRemove,
      }}
      slashMenuProps={{
        open: slashMenuOpen,
        floatingRef: floatingMenus.slashFloatingContainerRef,
        floatingStyles: floatingMenus.slashFloatingStyles,
        portalTarget,
        layout: slashMenuLayout,
        slashItemsCount: slashItems.length,
        slashHighlight,
        onSelect: handleSlashSelect,
        onHighlight: setSlashHighlight,
        onShowMorePlaybooks: () => setSlashPlaybooksExpanded(true),
        onShowMoreSkills: () => setSlashSkillsExpanded(true),
        onShowMoreWorkflows: () => setSlashWorkflowsExpanded(true),
      }}
      atMentionMenuProps={{
        open: atMentionController.atMenuOpen,
        portalTarget,
        floatingRef: floatingMenus.atFloatingContainerRef,
        floatingStyles: floatingMenus.atFloatingStyles,
        composerShellRect: floatingMenus.atComposerShellRect,
        crossCampaignMode: atMentionController.crossCampaignMode,
        activeTab: atMentionController.atMenuTab,
        tabs: atMentionController.studioAtTabsForMenu,
        atQuery: atMentionController.atQuery,
        atHighlight: atMentionController.atHighlight,
        crossCampaignLoading: atMentionController.crossCampaignLoading,
        atDataLoading: atMentionController.atDataLoading,
        artifactRows: atMentionController.atArtifactNavRows,
        mediaRows: atMentionController.atMediaNavRows,
        navSlice: atMentionController.atComposerNavSlice,
        showSpaceTaskMore: atMentionController.atMenuLayout.showSpaceTaskMore,
        showMissionMore: atMentionController.atMenuLayout.showMissionMore,
        onBackFromCrossCampaign: atMentionController.handleBackFromCrossCampaign,
        onTabChange: atMentionController.handleAtMenuTabChange,
        onHighlight: atMentionController.setAtHighlight,
        onCampaignSelect: handleCampaignSelect,
        onAtSelect: handleAtSelect,
        onToggleArtifactCollapsed: atMentionController.handleToggleArtifactCollapsed,
        onShowAllArtifacts: atMentionController.handleShowAllArtifacts,
        onToggleMediaCollapsed: atMentionController.handleToggleMediaCollapsed,
        onShowAllMedia: atMentionController.handleShowAllMedia,
        onShowMoreSpaceTasks: () => atMentionController.setAtSpaceTasksExpanded(true),
        onShowMoreMissions: () => atMentionController.setAtMissionsExpanded(true),
      }}
      textareaProps={{
        textareaRef,
        highlightBackdropRef,
        value: contextController.inputValue,
        showHighlight: Boolean(hasSlashCommand),
        renderHighlightBackdrop,
        composerPadX,
        compact,
        placeholder: creditsExhausted ? 'Credits required to send messages' : placeholder,
        disabled: disabled || recordingState === 'recording',
        onFocus: handleTextareaFocus,
        onChange: handleTextareaChange,
        onKeyDown: handleKeyDown,
        onPaste: handleComposerPaste,
        onSelect: handleTextareaSelect,
        onScroll: handleTextareaScroll,
      }}
      footer={
        recordingState !== 'idle'
          ? {
              kind: 'recording',
              props: {
                recordingState,
                disabled,
                composerPadX,
                onStopRecording: handleStopRecording,
                onCancelRecording: handleCancelRecording,
                onTranscriptionUpdate: handleTranscriptionUpdate,
                onTranscriptionComplete: handleTranscriptionComplete,
                onError: handleRecordingError,
              },
            }
          : {
              kind: 'normal',
              props: {
                composerPadX,
                compact,
                disabled,
                plusButtonRef: plusController.plusButtonRef,
                onTogglePlusMenu: plusController.togglePlusMenu,
                modelPickerProps: modelController.modelPickerProps,
                composerFooterAfterIntegrationsSlot,
                activeCapabilityChip,
                onClearCapabilityChip,
                plusMenuProps: plusController.plusMenuProps,
                contextMeter: contextController.contextMeter,
                breakdownPanelEnabled: contextController.breakdownPanelEnabled,
                contextPopoverOpen: contextController.contextPopoverOpen,
                contextMeterAnchorRef: contextController.contextPopoverAnchorRef,
                contextMeterTriggerRef: contextController.contextPopoverTriggerRef,
                onOpenContextPopoverBeforeToggle: contextController.updateContextPopoverPosition,
                onToggleContextPopover: contextController.toggleContextPopover,
                contextPopoverPanelRef: contextController.contextPopoverPanelRef,
                contextPopoverPosition: contextController.contextPopoverPosition,
                portalTarget,
                footerWrapperClassName,
                voiceSendProps: {
                  disabled,
                  sendDisabled:
                    disabled ||
                    sendDisabled ||
                    (!contextController.inputValue.trim() && !hasPastedBlocks) ||
                    attachedFiles.some((f) => f.uploading),
                  isStreaming,
                  spaceId,
                  onStartRecording: handleStartRecording,
                  onVoiceStart,
                  onSend: handleSend,
                  onStop,
                },
              },
            }
      }
      driveModalProps={{
        open: plusController.showDrivePicker,
        onClose: () => plusController.setShowDrivePicker(false),
        onSelectFileForChat: plusController.handleFileFromCloud,
      }}
      dropboxModalProps={{
        open: plusController.showDropboxPicker,
        onClose: () => plusController.setShowDropboxPicker(false),
        onSelectFileForChat: plusController.handleFileFromCloud,
      }}
      dragOverlayVisible={isDragOver}
    />
  )
}
