'use client'

import { Import, MessageSquarePlus, Share2, Trash2 } from 'lucide-react'
import type { DropboxFileBrowserContextConfig } from '@/components/media/dropbox-file-browser-modal.types'
import { DropboxFileBrowserActionButton } from '@/components/media/DropboxFileBrowserActionButton'
import type { DropboxFile } from '@/lib/services/dropbox-api'

export function DropboxFileBrowserRowActions({
  file,
  contextConfig,
  onSelectFileForChat,
  handleAddToChat,
  handleExportToVibey,
  handleShare,
  setDeleteTarget,
  isLoadingAction,
}: {
  file: DropboxFile
  contextConfig: DropboxFileBrowserContextConfig
  onSelectFileForChat?: (file: File) => void
  handleAddToChat: (file: DropboxFile) => void | Promise<void>
  handleExportToVibey: (file: DropboxFile) => void | Promise<void>
  handleShare: (file: DropboxFile) => void | Promise<void>
  setDeleteTarget: (file: DropboxFile | null) => void
  isLoadingAction: (
    fileId: string,
    action: 'export' | 'share' | 'delete' | 'chat',
  ) => boolean
}) {
  if (file['.tag'] === 'folder') return null

  return (
    <div className="flex items-center gap-0.5">
      {contextConfig.showSelect && onSelectFileForChat && (
        <DropboxFileBrowserActionButton
          icon={MessageSquarePlus}
          label={contextConfig.selectLabel}
          onClick={() => void handleAddToChat(file)}
          loading={isLoadingAction(file.id, 'chat')}
        />
      )}
      {contextConfig.showExport && (
        <DropboxFileBrowserActionButton
          icon={Import}
          label={contextConfig.exportLabel}
          onClick={() => void handleExportToVibey(file)}
          loading={isLoadingAction(file.id, 'export')}
        />
      )}
      {contextConfig.showShare && (
        <DropboxFileBrowserActionButton
          icon={Share2}
          label="Get shared link"
          onClick={() => void handleShare(file)}
          loading={isLoadingAction(file.id, 'share')}
        />
      )}
      {contextConfig.showDelete && (
        <DropboxFileBrowserActionButton
          icon={Trash2}
          label="Delete"
          onClick={() => setDeleteTarget(file)}
          loading={isLoadingAction(file.id, 'delete')}
        />
      )}
    </div>
  )
}
