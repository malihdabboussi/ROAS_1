'use client'

import { Fragment, type ComponentProps, type Dispatch, type RefObject, type SetStateAction } from 'react'
import { createPortal } from 'react-dom'
import type { Editor } from '@tiptap/react'
import { Bot, Cloud, HardDrive, Upload } from 'lucide-react'
import { PastedTextEditorModal } from '@/components/chat/PastedTextComposerAdapter'
import { CloudAttachMenuItems } from '@/components/media/CloudAttachMenuItems'
import { DriveFileBrowserModal } from '@/components/media/DriveFileBrowserModal'
import { DropboxFileBrowserModal } from '@/components/media/DropboxFileBrowserModal'
import { fixedFloatingPortalStyle } from '@/lib/ui'
import type { EntitySearchResult } from '../services/entity-search.service'
import { driveFileShareUrl, type AttachedFile } from './ChannelComposerAttachments'
import { BrandedEmojiPicker } from './BrandedEmojiPicker'
import type { SlashItem, SlashItemSection } from './slash-command-types'
import { SlashCommandTabbedMenu } from './SlashCommandTabbedMenu'
import { TabbedEntityMentionMenu, type EntityMentionUiTab } from './TabbedEntityMentionMenu'

type PortalPosition = { top: number; left: number }
type ComposerRect = { left: number; width: number }

interface MentionItem {
  id: string
  label: string
  handle: string
  type: 'user' | 'agent'
  avatarUrl: string | null
}

interface MentionState {
  items: MentionItem[]
  selectedIndex: number
  command: ((item: { id: string; label: string }) => void) | null
}

interface EntityMentionState {
  items: EntitySearchResult[]
  selectedIndex: number
  range: { from: number; to: number } | null
  query: string
  tab: EntityMentionUiTab
  loading: boolean
  hasMore: boolean
}

interface SlashState {
  items: SlashItem[]
  selectedIndex: number
  range: { from: number; to: number } | null
  query: string
  section: SlashItemSection
  availableSections: SlashItemSection[]
}

type PastedTextEditorModalProps = ComponentProps<typeof PastedTextEditorModal>
const LIFTED_PORTAL_STYLE = { transform: 'translateY(-100%)' } as const

export function ChannelComposerPortals({
  editor,
  fileInputRef,
  attachDropdownOpen,
  attachDropdownRef,
  attachDropdownPos,
  onCloseAttachDropdown,
  onOpenDrive,
  onOpenDropbox,
  emojiOpen,
  emojiRef,
  emojiPos,
  onCloseEmoji,
  slash,
  slashRef,
  slashPos,
  onSlashSectionChange,
  onSlashSelect,
  onSlashHover,
  entityMention,
  entityMentionRef,
  entityMentionPos,
  composerRect,
  onEntityTabChange,
  onLoadMoreEntities,
  onEntitySelect,
  onEntityHover,
  mention,
  mentionRef,
  mentionPos,
  onMentionSelect,
  onMentionHover,
  showDrivePicker,
  setShowDrivePicker,
  showDropboxPicker,
  setShowDropboxPicker,
  setAttachedFiles,
  onFileSelect,
  pastedEditingBlock,
  pastedEditingBlockId,
  setPastedEditingBlockId,
  updatePastedBlock,
  removePastedBlock,
}: {
  editor: Editor
  fileInputRef: RefObject<HTMLInputElement | null>
  attachDropdownOpen: boolean
  attachDropdownRef: RefObject<HTMLDivElement | null>
  attachDropdownPos: PortalPosition
  onCloseAttachDropdown: () => void
  onOpenDrive: () => void
  onOpenDropbox: () => void
  emojiOpen: boolean
  emojiRef: RefObject<HTMLDivElement | null>
  emojiPos: PortalPosition
  onCloseEmoji: () => void
  slash: SlashState
  slashRef: RefObject<HTMLDivElement | null>
  slashPos: PortalPosition
  onSlashSectionChange: (section: SlashItemSection) => void
  onSlashSelect: (item: SlashItem) => void
  onSlashHover: (index: number) => void
  entityMention: EntityMentionState
  entityMentionRef: RefObject<HTMLDivElement | null>
  entityMentionPos: PortalPosition
  composerRect: ComposerRect
  onEntityTabChange: (tab: EntityMentionUiTab) => void
  onLoadMoreEntities: () => void
  onEntitySelect: (item: EntitySearchResult) => void
  onEntityHover: (index: number) => void
  mention: MentionState
  mentionRef: RefObject<HTMLDivElement | null>
  mentionPos: PortalPosition
  onMentionSelect: (item: MentionItem) => void
  onMentionHover: (index: number) => void
  showDrivePicker: boolean
  setShowDrivePicker: (open: boolean) => void
  showDropboxPicker: boolean
  setShowDropboxPicker: (open: boolean) => void
  setAttachedFiles: Dispatch<SetStateAction<AttachedFile[]>>
  onFileSelect: (files: FileList | File[] | null) => Promise<void> | void
  pastedEditingBlock: PastedTextEditorModalProps['block']
  pastedEditingBlockId: string | null
  setPastedEditingBlockId: (blockId: string | null) => void
  updatePastedBlock: PastedTextEditorModalProps['onSave']
  removePastedBlock: PastedTextEditorModalProps['onRemove']
}) {
  if (typeof document === 'undefined') {
    return (
      <>
        <DriveFileBrowserModal
          open={showDrivePicker}
          onClose={() => setShowDrivePicker(false)}
          onInsertDriveLink={() => {}}
        />
        <DropboxFileBrowserModal
          open={showDropboxPicker}
          onClose={() => setShowDropboxPicker(false)}
          onSelectFileForChat={(file) => void onFileSelect([file])}
        />
        <PastedTextEditorModal
          block={pastedEditingBlock}
          open={pastedEditingBlockId !== null}
          onOpenChange={(open) => {
            if (!open) setPastedEditingBlockId(null)
          }}
          onSave={updatePastedBlock}
          onRemove={removePastedBlock}
        />
      </>
    )
  }

  const entityMenuWidth =
    entityMention.range && composerRect.width > 0
      ? Math.min(
          Math.max(320, composerRect.width * 0.85),
          Math.max(320, window.innerWidth - 32),
        )
      : 448
  const entityMenuLeft =
    entityMention.range && composerRect.width > 0
      ? composerRect.left + (composerRect.width - entityMenuWidth) / 2
      : entityMentionPos.left

  return (
    <>
      {attachDropdownOpen &&
        createPortal(
          <div
            ref={attachDropdownRef}
            className="dropdown-menu-solid z-dropdown fixed w-52 py-1"
            style={fixedFloatingPortalStyle(attachDropdownPos, LIFTED_PORTAL_STYLE)}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <CloudAttachMenuItems
              onLocalUpload={() => {
                fileInputRef.current?.click()
                onCloseAttachDropdown()
              }}
              onDrive={onOpenDrive}
              onDropbox={onOpenDropbox}
              onSelect={onCloseAttachDropdown}
              localIcon={<Upload className="h-4 w-4" />}
              driveIcon={<HardDrive className="h-4 w-4" />}
              dropboxIcon={<Cloud className="h-4 w-4" />}
              itemClassName="body-3 flex w-full items-center gap-2 px-3 py-2 text-left text-foreground transition-colors hover:bg-hover-subtle"
            />
          </div>,
          document.body,
        )}

      {emojiOpen &&
        createPortal(
          <div
            ref={emojiRef}
            className="z-dropdown fixed"
            style={fixedFloatingPortalStyle(emojiPos, LIFTED_PORTAL_STYLE)}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <BrandedEmojiPicker
              onEmojiClick={(data) => {
                editor.chain().focus().insertContent(data.emoji).run()
                onCloseEmoji()
              }}
            />
          </div>,
          document.body,
        )}

      {slash.range &&
        createPortal(
          <div
            ref={slashRef}
            data-vibey-mention-suggestions
            className="dropdown-menu-solid z-dropdown rounded-spacing-2 fixed w-80 overflow-hidden"
            style={fixedFloatingPortalStyle(slashPos, LIFTED_PORTAL_STYLE)}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <SlashCommandTabbedMenu
              availableSections={slash.availableSections}
              activeSection={slash.section}
              onSectionChange={onSlashSectionChange}
              items={slash.items.filter((item) => item.section === slash.section)}
              selectedIndex={slash.selectedIndex}
              queryLen={slash.query.length}
              onSelect={onSlashSelect}
              onHover={onSlashHover}
            />
          </div>,
          document.body,
        )}

      {entityMention.range &&
        createPortal(
          <div
            ref={entityMentionRef}
            data-vibey-mention-suggestions
            className="dropdown-menu-solid z-dropdown rounded-spacing-2 fixed overflow-hidden"
            style={fixedFloatingPortalStyle(
              { top: entityMentionPos.top, left: entityMenuLeft },
              { ...LIFTED_PORTAL_STYLE, width: entityMenuWidth },
            )}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <TabbedEntityMentionMenu
              activeTab={entityMention.tab}
              onTabChange={onEntityTabChange}
              items={entityMention.items}
              selectedIndex={entityMention.selectedIndex}
              queryLen={entityMention.query.length}
              loading={entityMention.loading}
              hasMore={entityMention.hasMore}
              onLoadMore={onLoadMoreEntities}
              onSelect={onEntitySelect}
              onHover={onEntityHover}
            />
          </div>,
          document.body,
        )}

      {mention.command &&
        mention.items.length > 0 &&
        createPortal(
          <div
            ref={mentionRef}
            data-vibey-mention-suggestions
            className="dropdown-menu-solid z-dropdown fixed max-h-64 w-72 overflow-y-auto"
            style={fixedFloatingPortalStyle(mentionPos, LIFTED_PORTAL_STYLE)}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="py-spacing-1">
              {mention.items.map((item, idx) => {
                const prev = idx > 0 ? mention.items[idx - 1] : undefined
                const showPeopleHeader = item.type === 'user' && (!prev || prev.type !== 'user')
                const showAgentsHeader = item.type === 'agent' && (!prev || prev.type !== 'agent')
                return (
                  <Fragment key={item.id}>
                    {showPeopleHeader && (
                      <div className="typo-caption text-muted-foreground px-spacing-3 pb-0.5 pt-1.5 font-semibold">
                        People
                      </div>
                    )}
                    {showAgentsHeader && (
                      <div
                        className={`typo-caption text-muted-foreground px-spacing-3 pb-0.5 font-semibold ${
                          prev && prev.type === 'user'
                            ? 'border-border mt-0.5 border-t pt-2'
                            : 'pt-1.5'
                        }`}
                      >
                        Agents
                      </div>
                    )}
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault()
                        onMentionSelect(item)
                      }}
                      onMouseEnter={() => onMentionHover(idx)}
                      className={`px-spacing-3 py-spacing-2 flex w-full items-center gap-2.5 text-left transition-colors ${
                        idx === mention.selectedIndex ? 'bg-hover-subtle' : 'hover:bg-hover-subtle'
                      }`}
                    >
                      {item.avatarUrl ? (
                        <img
                          src={item.avatarUrl}
                          alt={item.label}
                          className="h-7 w-7 shrink-0 rounded-full object-cover"
                        />
                      ) : item.type === 'agent' ? (
                        <span className="bg-muted text-muted-foreground inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full">
                          <Bot className="h-3.5 w-3.5" />
                        </span>
                      ) : (
                        <span className="bg-muted text-muted-foreground inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold uppercase">
                          {item.label.charAt(0)}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <span className="body-3 text-foreground block truncate font-medium">
                          {item.label}
                        </span>
                        <span className="body-4 text-muted-foreground block truncate">
                          @{item.handle}
                        </span>
                      </div>
                    </button>
                  </Fragment>
                )
              })}
            </div>
          </div>,
          document.body,
        )}

      <DriveFileBrowserModal
        open={showDrivePicker}
        onClose={() => setShowDrivePicker(false)}
        onInsertDriveLink={(driveFile) => {
          const mime = driveFile.mimeType ?? ''
          const url = driveFileShareUrl(driveFile.id, mime)
          setAttachedFiles((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              filename: driveFile.name,
              mimeType: mime || 'application/vnd.google-apps.unknown',
              uploading: false,
              url,
              isDriveLink: true,
              previewUrl: driveFile.thumbnailLink ?? undefined,
            },
          ])
        }}
      />
      <DropboxFileBrowserModal
        open={showDropboxPicker}
        onClose={() => setShowDropboxPicker(false)}
        onSelectFileForChat={(file) => void onFileSelect([file])}
      />
      <PastedTextEditorModal
        block={pastedEditingBlock}
        open={pastedEditingBlockId !== null}
        onOpenChange={(open) => {
          if (!open) setPastedEditingBlockId(null)
        }}
        onSave={updatePastedBlock}
        onRemove={removePastedBlock}
      />
    </>
  )
}
