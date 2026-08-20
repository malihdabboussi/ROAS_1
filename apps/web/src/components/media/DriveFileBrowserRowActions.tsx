'use client'

import type { RefObject } from 'react'
import {
  Download,
  Edit3,
  ExternalLink,
  Image as ImageIcon,
  Import,
  Link2,
  MessageSquarePlus,
  MoreVertical,
  Share2,
  Trash2,
} from 'lucide-react'
import { FOLDER_MIME } from '@/components/media/drive-file-browser-modal.constants'
import type { DriveFileBrowserContextConfig } from '@/components/media/drive-file-browser-modal.types'
import { DriveFileBrowserActionButton } from '@/components/media/DriveFileBrowserActionButton'
import type { GoogleDriveFile } from '@/lib/services/google-drive-api'
import { driveOpenHref } from '@/lib/spaces/google-open-href'

export function DriveFileBrowserRowActions({
  file,
  contextConfig,
  onSelectDriveFile,
  onInsertDriveLink,
  onClose,
  onSelectFileForChat,
  moreMenuFileId,
  setMoreMenuFileId,
  moreMenuRef,
  setActionType,
  handleAddToChat,
  handleExportToVibey,
  isLoadingAction,
  setRenameFileId,
  setRenameValue,
  handleDownload,
  setShareFileId,
  setShareEmail,
  handleDelete,
}: {
  file: GoogleDriveFile
  contextConfig: DriveFileBrowserContextConfig
  onSelectDriveFile?: (file: { id: string; name: string; mimeType?: string }) => void
  onInsertDriveLink?: (file: {
    id: string
    name: string
    mimeType?: string
    thumbnailLink?: string
  }) => void
  onClose: () => void
  onSelectFileForChat?: (file: File) => void
  moreMenuFileId: string | null
  setMoreMenuFileId: (id: string | null) => void
  moreMenuRef: RefObject<HTMLDivElement | null>
  setActionType: (t: 'chat' | 'export' | null) => void
  handleAddToChat: (file: GoogleDriveFile) => void | Promise<void>
  handleExportToVibey: (file: GoogleDriveFile) => void | Promise<void>
  isLoadingAction: (fileId: string, type: 'chat' | 'export') => boolean
  setRenameFileId: (id: string | null) => void
  setRenameValue: (v: string) => void
  handleDownload: (file: GoogleDriveFile) => void | Promise<void>
  setShareFileId: (id: string | null) => void
  setShareEmail: (v: string) => void
  handleDelete: (file: GoogleDriveFile) => void | Promise<void>
}) {
  const isFolder = file.mimeType === FOLDER_MIME
  if (isFolder) return null
  const isMenuOpen = moreMenuFileId === file.id
  const isImageOrVideo =
    file.mimeType?.startsWith('image/') === true || file.mimeType?.startsWith('video/') === true
  return (
    <div className="flex items-center gap-0.5">
      {onSelectDriveFile && isImageOrVideo && (
        <DriveFileBrowserActionButton
          icon={ImageIcon}
          label="Use for ad"
          onClick={() => {
            onSelectDriveFile({ id: file.id, name: file.name, mimeType: file.mimeType })
            onClose()
          }}
        />
      )}
      {onInsertDriveLink && (
        <DriveFileBrowserActionButton
          icon={Link2}
          label="Insert link"
          onClick={() => {
            onInsertDriveLink({
              id: file.id,
              name: file.name,
              mimeType: file.mimeType,
              thumbnailLink: file.thumbnailLink,
            })
            onClose()
          }}
        />
      )}
      {contextConfig.showSelect && onSelectFileForChat && (
        <DriveFileBrowserActionButton
          icon={MessageSquarePlus}
          label={contextConfig.selectLabel}
          onClick={() => {
            setActionType('chat')
            void handleAddToChat(file)
          }}
          loading={isLoadingAction(file.id, 'chat')}
        />
      )}
      {contextConfig.showExport && (
        <DriveFileBrowserActionButton
          icon={Import}
          label={contextConfig.exportLabel}
          onClick={() => {
            setActionType('export')
            void handleExportToVibey(file)
          }}
          loading={isLoadingAction(file.id, 'export')}
        />
      )}
      {contextConfig.showRename && (
        <DriveFileBrowserActionButton
          icon={Edit3}
          label="Rename"
          onClick={() => {
            setRenameFileId(file.id)
            setRenameValue(file.name)
          }}
        />
      )}
      {contextConfig.showOpenInDrive && (
        <DriveFileBrowserActionButton
          icon={ExternalLink}
          label="Open in Drive"
          href={driveOpenHref(file.id, file.webViewLink, file.mimeType)}
        />
      )}
      {contextConfig.showMoreMenu && (
        <div className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setMoreMenuFileId(isMenuOpen ? null : file.id)
            }}
            aria-label="File actions"
            className="tooltip rounded-spacing-1 text-muted-foreground hover:bg-hover-subtle hover:text-foreground flex h-7 w-7 items-center justify-center transition-colors"
            data-tooltip="More"
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </button>
          {isMenuOpen && (
            <div
              ref={moreMenuRef}
              className="dropdown-menu-solid z-dropdown rounded-spacing-2 p-spacing-2 absolute right-0 top-full mt-1 min-w-36"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  void handleDownload(file)
                  setMoreMenuFileId(null)
                }}
                className="gap-spacing-2 px-spacing-2 py-spacing-2 rounded-spacing-1 hover:bg-hover-subtle body-3 text-muted-foreground hover:text-foreground flex w-full items-center text-left"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setShareFileId(file.id)
                  setShareEmail('')
                  setMoreMenuFileId(null)
                }}
                className="gap-spacing-2 px-spacing-2 py-spacing-2 rounded-spacing-1 hover:bg-hover-subtle body-3 text-muted-foreground hover:text-foreground flex w-full items-center text-left"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span>Share</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  void handleDelete(file)
                  setMoreMenuFileId(null)
                }}
                className="gap-spacing-2 px-spacing-2 py-spacing-2 rounded-spacing-1 hover:bg-destructive/10 body-3 text-destructive flex w-full items-center text-left"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
