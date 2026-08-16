'use client'

import { useEffect, useRef, useState, type MutableRefObject } from 'react'
import { usePastedTextBlocks } from '@/components/chat/PastedTextComposerAdapter'
import type { ChannelMember } from '@/lib/channels'
import { useCloudAttach } from '@/lib/hooks/use-cloud-attach'
import type { TeamRosterEntry } from '@/lib/team'
import { ChannelComposerMainControls } from './ChannelComposerMainControls'
import { ChannelComposerPortals } from './ChannelComposerPortals'
import { useChannelComposerAttachments } from './use-channel-composer-attachments'
import { useChannelComposerDraft } from './use-channel-composer-draft'
import { useChannelComposerDropzone } from './use-channel-composer-dropzone'
import { useChannelComposerEditor } from './use-channel-composer-editor'
import { useChannelComposerEntityMention } from './use-channel-composer-entity-mention'
import { useChannelComposerFloatingControls } from './use-channel-composer-floating-controls'
import {
  useChannelComposerHandle,
  type ChannelComposerHandleValue,
} from './use-channel-composer-handle'
import { useChannelComposerLink } from './use-channel-composer-link'
import { useChannelComposerMemberMention } from './use-channel-composer-member-mention'
import {
  useChannelComposerSlashMenu,
  type ChannelComposerCommandContext,
} from './use-channel-composer-slash-menu'
import {
  useChannelComposerSlashSkills,
  type SlashSkillEntry,
} from './use-channel-composer-slash-skills'
import {
  useChannelComposerSubmit,
  type ChannelComposerPayload,
} from './use-channel-composer-submit'
import { useChannelComposerVisibleState } from './use-channel-composer-visible-state'

export type { ChannelComposerPayload } from './use-channel-composer-submit'

// ─── main composer ────────────────────────────────────────────────────────────

export interface ChannelComposerVisibleState {
  text: string
  attachmentNames: string[]
  pastedBlockCount: number
  recordingState: 'idle' | 'recording' | 'finishing'
  linkInputOpen: boolean
  uploadingAttachmentCount: number
}

export interface ChannelComposerHandle extends ChannelComposerHandleValue<ChannelComposerPayload> {}

export function ChannelComposer({
  channelId,
  campaignId,
  members,
  rosterAvatars,
  draftStorageKey,
  onSend,
  onBeforeSend,
  disabled = false,
  commandContext,
  embedded = false,
  placeholder: placeholderText,
  composerHandleRef,
  onVisibleStateChange,
  skillAgentKeys,
  entityMentionPeopleMembers,
  mentionRoster,
}: {
  channelId: string
  /** Resolved campaign for the active space — scopes channel uploads so generated
   *  media rows are linked to the same campaign as the message context. */
  campaignId?: string | null
  members: ChannelMember[]
  rosterAvatars?: Map<string, string>
  draftStorageKey?: string
  onSend: (payload: ChannelComposerPayload) => Promise<void> | void
  onBeforeSend?: (payload: ChannelComposerPayload) => Promise<boolean>
  disabled?: boolean
  commandContext?: ChannelComposerCommandContext
  /** Embedded in a parent form (e.g. send-to-agent modal): no send button, Enter = newline, no draft persistence. */
  embedded?: boolean
  placeholder?: string
  composerHandleRef?: MutableRefObject<ChannelComposerHandle | null>
  onVisibleStateChange?: (state: ChannelComposerVisibleState) => void
  /** Agent keys whose enabled skills should appear in the / skill menu. */
  skillAgentKeys?: string[]
  /** Optional source for @@ People, used when the caller already has scoped people/agents. */
  entityMentionPeopleMembers?: ChannelMember[]
  /** Full addable roster so typed @ mentions can resolve before someone joins the channel. */
  mentionRoster?: TeamRosterEntry[]
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'finishing'>('idle')
  const { slashSkillItems } = useChannelComposerSlashSkills({
    skillAgentKeys,
    commandContextKind: commandContext?.kind,
    members,
  })
  const {
    mention,
    mentionRef,
    mentionPos,
    candidatesRef,
    MemberMentionExtension,
    selectMemberMention,
    setMemberMentionHoverIndex,
  } = useChannelComposerMemberMention({ members, rosterAvatars, roster: mentionRoster })
  const {
    attachDropdownOpen,
    setAttachDropdownOpen,
    attachDropdownPos,
    attachDropdownRef,
    attachButtonRef,
    handleAttachClick,
    emojiOpen,
    setEmojiOpen,
    emojiPos,
    emojiButtonRef,
    emojiRef,
    handleEmojiClick,
  } = useChannelComposerFloatingControls()
  const composerRootRef = useRef<HTMLDivElement>(null)
  const composerDraftKey = draftStorageKey ?? `vibey-channel-draft:${channelId}:main`
  const composerAttachmentsKey = `${composerDraftKey}:attachments`
  const {
    attachedFiles,
    setAttachedFiles,
    handleFileSelect,
    removeAttachedFile,
    clearAttachedFiles,
  } = useChannelComposerAttachments({
    embedded,
    campaignId,
    attachmentsKey: composerAttachmentsKey,
  })
  const { isDragOver, dropzoneHandlers } = useChannelComposerDropzone({
    disabled,
    onFileSelect: handleFileSelect,
  })
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
  } = usePastedTextBlocks({
    persistence: { mode: 'localStorage', draftKey: composerDraftKey },
  })
  const tryAddFromClipboardRef = useRef(tryAddFromClipboard)
  useEffect(() => {
    tryAddFromClipboardRef.current = tryAddFromClipboard
  }, [tryAddFromClipboard])
  const slashSkillItemsRef = useRef<SlashSkillEntry[]>([])
  const embeddedRef = useRef(embedded)
  const attachedFilesRef = useRef(attachedFiles)
  const pastedBlocksRef = useRef(pastedBlocks)
  const { hydrateDraft, persistDraftUpdate, clearDraft } = useChannelComposerDraft({
    embedded,
    draftKey: composerDraftKey,
  })

  useEffect(() => {
    embeddedRef.current = embedded
  }, [embedded])

  useEffect(() => {
    attachedFilesRef.current = attachedFiles
  }, [attachedFiles])

  useEffect(() => {
    pastedBlocksRef.current = pastedBlocks
  }, [pastedBlocks])

  useEffect(() => {
    slashSkillItemsRef.current = slashSkillItems
  }, [slashSkillItems])

  const {
    showDrivePicker,
    setShowDrivePicker,
    showDropboxPicker,
    setShowDropboxPicker,
    openDrive,
    openDropbox,
  } = useCloudAttach({
    behavior: 'toast_if_disconnected',
    onBeforeOpen: () => setAttachDropdownOpen(false),
  })

  const {
    entityMention,
    entityMentionRef,
    entityMentionPos,
    composerRect,
    setEntityMentionEditor,
    syncEntityMention,
    handleEntityMentionKeyDown,
    loadMoreEntities,
    insertEntityMention,
    setEntityMentionTab,
    setEntityMentionHoverIndex,
  } = useChannelComposerEntityMention({
    campaignId,
    rosterAvatars,
    entityMentionPeopleMembers,
    composerRootRef,
  })

  const {
    slash,
    slashRef,
    slashPos,
    setSlashEditor,
    syncSlashMenu,
    refreshSlashMenu,
    handleSlashKeyDown,
    runSlashItem,
    setSlashSection,
    setSlashHoverIndex,
  } = useChannelComposerSlashMenu({ commandContext, slashSkillItems })

  const triggerSendRef = useRef(async () => {})
  const handleFileSelectRef = useRef<(files: FileList | File[] | null) => void>(() => {})
  const [editorIsEmpty, setEditorIsEmpty] = useState(true)

  const editor = useChannelComposerEditor({
    channelId,
    embedded,
    embeddedRef,
    placeholderText,
    memberMentionExtension: MemberMentionExtension,
    hasActiveMemberMention: mention.items.length > 0 && Boolean(mention.command),
    handleFileSelectRef,
    tryAddFromClipboardRef,
    triggerSendRef,
    handleSlashKeyDown,
    handleEntityMentionKeyDown,
    syncSlashMenu,
    syncEntityMention,
    persistDraftUpdate,
    onEmptyChange: setEditorIsEmpty,
  })
  useEffect(() => {
    setSlashEditor(editor)
  }, [editor, setSlashEditor])
  useEffect(() => {
    hydrateDraft(editor)
  }, [editor, hydrateDraft])
  useEffect(() => {
    refreshSlashMenu(editor)
  }, [editor, slashSkillItems, refreshSlashMenu])

  useEffect(() => {
    setEntityMentionEditor(editor)
  }, [editor, setEntityMentionEditor])

  const { sending, buildPayload, resetComposer, triggerSend, hasUploadingFiles } =
    useChannelComposerSubmit({
      editor,
      disabled,
      onSend,
      onBeforeSend,
      attachedFiles,
      attachedFilesRef,
      pastedBlocksRef,
      candidatesRef,
      slashSkillItemsRef,
      clearPastedBlocks,
      clearDraft,
      clearAttachedFiles,
      embedded,
      composerAttachmentsKey,
    })

  useEffect(() => {
    triggerSendRef.current = triggerSend
  }, [triggerSend])

  useChannelComposerHandle({
    composerHandleRef,
    buildPayload,
    resetComposer,
    editor,
    hasUploadingFiles,
  })

  useEffect(() => {
    handleFileSelectRef.current = handleFileSelect
  }, [handleFileSelect])

  const { linkInputOpen, linkUrl, setLinkUrl, toggleLinkInput, closeLinkInput, applyLink } =
    useChannelComposerLink(editor)

  const canSend =
    (!editorIsEmpty || attachedFiles.length > 0 || hasPastedBlocks) && !disabled && !sending

  useChannelComposerVisibleState({
    editor,
    attachedFiles,
    pastedBlockCount: pastedBlocks.length,
    recordingState,
    linkInputOpen,
    onVisibleStateChange,
  })

  if (!editor) return null

  return (
    <div
      ref={composerRootRef}
      data-dropzone
      {...dropzoneHandlers}
      className={`input-glass input-glass-flush relative flex flex-col overflow-hidden ${embedded ? 'rounded-2xl' : 'rounded-b-2xl'}`}
    >
      {isDragOver && (
        <div className="bg-background/80 border-primary pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-b-2xl border border-dashed">
          <span className="body-2 text-foreground font-medium">Drop your file</span>
        </div>
      )}

      <ChannelComposerMainControls
        editor={editor}
        pastedBlocks={pastedBlocks}
        onPastedBlockClick={(block) => setPastedEditingBlockId(block.id)}
        onPastedBlockRemove={(block) => removePastedBlock(block.id)}
        attachedFiles={attachedFiles}
        onRemoveAttachedFile={removeAttachedFile}
        linkInputOpen={linkInputOpen}
        linkUrl={linkUrl}
        onLinkUrlChange={setLinkUrl}
        onToggleLinkInput={toggleLinkInput}
        onApplyLink={applyLink}
        onCloseLinkInput={closeLinkInput}
        recordingState={recordingState}
        onRecordingStateChange={setRecordingState}
        fileInputRef={fileInputRef}
        attachButtonRef={attachButtonRef}
        emojiButtonRef={emojiButtonRef}
        disabled={disabled}
        embedded={embedded}
        canSend={canSend}
        onFileSelect={(files) => void handleFileSelect(files)}
        onAttachClick={handleAttachClick}
        onEmojiClick={handleEmojiClick}
        onMentionEntity={() => editor.chain().focus().insertContent('@@').run()}
        onStartRecording={() => setRecordingState('recording')}
        onSend={() => void triggerSend()}
      />

      <ChannelComposerPortals
        editor={editor}
        fileInputRef={fileInputRef}
        attachDropdownOpen={attachDropdownOpen}
        attachDropdownRef={attachDropdownRef}
        attachDropdownPos={attachDropdownPos}
        onCloseAttachDropdown={() => setAttachDropdownOpen(false)}
        onOpenDrive={openDrive}
        onOpenDropbox={openDropbox}
        emojiOpen={emojiOpen}
        emojiRef={emojiRef}
        emojiPos={emojiPos}
        onCloseEmoji={() => setEmojiOpen(false)}
        slash={slash}
        slashRef={slashRef}
        slashPos={slashPos}
        onSlashSectionChange={setSlashSection}
        onSlashSelect={runSlashItem}
        onSlashHover={setSlashHoverIndex}
        entityMention={entityMention}
        entityMentionRef={entityMentionRef}
        entityMentionPos={entityMentionPos}
        composerRect={composerRect}
        onEntityTabChange={setEntityMentionTab}
        onLoadMoreEntities={loadMoreEntities}
        onEntitySelect={insertEntityMention}
        onEntityHover={setEntityMentionHoverIndex}
        mention={mention}
        mentionRef={mentionRef}
        mentionPos={mentionPos}
        onMentionSelect={selectMemberMention}
        onMentionHover={setMemberMentionHoverIndex}
        showDrivePicker={showDrivePicker}
        setShowDrivePicker={setShowDrivePicker}
        showDropboxPicker={showDropboxPicker}
        setShowDropboxPicker={setShowDropboxPicker}
        setAttachedFiles={setAttachedFiles}
        onFileSelect={handleFileSelect}
        pastedEditingBlock={pastedEditingBlock}
        pastedEditingBlockId={pastedEditingBlockId}
        setPastedEditingBlockId={setPastedEditingBlockId}
        updatePastedBlock={updatePastedBlock}
        removePastedBlock={removePastedBlock}
      />
    </div>
  )
}
