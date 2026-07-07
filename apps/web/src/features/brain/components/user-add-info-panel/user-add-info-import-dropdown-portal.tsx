'use client'

import { createPortal } from 'react-dom'
import { ExternalLink, FolderOpen, Upload } from 'lucide-react'
import { CloudAttachMenuItems } from '@/components/media/CloudAttachMenuItems'

export interface UserAddInfoImportDropdownPortalProps {
  open: boolean
  position: { top: number; left: number; width: number }
  fathomConnected: boolean
  firefliesConnected: boolean
  onLocalUpload: () => void
  onDrive: () => void
  onDropbox: () => void
  onCloseAfterSelect: () => void
  onOpenFathom: () => void
  onOpenFireflies: () => void
  onOpenMediaLibrary: () => void
}

export function UserAddInfoImportDropdownPortal({
  open,
  position,
  fathomConnected,
  firefliesConnected,
  onLocalUpload,
  onDrive,
  onDropbox,
  onCloseAfterSelect,
  onOpenFathom,
  onOpenFireflies,
  onOpenMediaLibrary,
}: UserAddInfoImportDropdownPortalProps) {
  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="surface-card border-border z-dropdown p-spacing-2 rounded-spacing-2 fixed border shadow-lg"
      style={{
        top: position.top,
        left: position.left,
        width: position.width,
      }}
      data-import-dropdown
    >
      <CloudAttachMenuItems
        onLocalUpload={onLocalUpload}
        onDrive={onDrive}
        onDropbox={onDropbox}
        onSelect={onCloseAfterSelect}
        localLabel="Upload from local"
        localIcon={<Upload className="icon-sm flex-shrink-0" />}
        driveIcon={
          <img
            src="/Integrations/GoogleDrive.png"
            alt="Google Drive"
            className="h-4 w-4 flex-shrink-0 rounded-sm object-contain"
          />
        }
        dropboxIcon={
          <img
            src="/Integrations/Dropbox.png"
            alt="Dropbox"
            className="h-4 w-4 flex-shrink-0 rounded-sm object-contain"
          />
        }
        itemClassName="gap-spacing-2 px-spacing-2 py-spacing-2 rounded-spacing-1 body-3 flex w-full items-center text-left hover:bg-hover-subtle text-muted-foreground hover:text-foreground"
      />
      {fathomConnected && (
        <button
          type="button"
          onClick={onOpenFathom}
          className="gap-spacing-2 px-spacing-2 py-spacing-2 rounded-spacing-1 body-3 hover:bg-hover-subtle text-muted-foreground hover:text-foreground flex w-full items-center text-left"
        >
          <ExternalLink className="icon-sm flex-shrink-0" />
          Import from Fathom
        </button>
      )}
      {firefliesConnected && (
        <button
          type="button"
          onClick={onOpenFireflies}
          className="gap-spacing-2 px-spacing-2 py-spacing-2 rounded-spacing-1 body-3 hover:bg-hover-subtle text-muted-foreground hover:text-foreground flex w-full items-center text-left"
        >
          <ExternalLink className="icon-sm flex-shrink-0" />
          Import from Fireflies
        </button>
      )}
      <button
        type="button"
        onClick={onOpenMediaLibrary}
        className="gap-spacing-2 px-spacing-2 py-spacing-2 rounded-spacing-1 body-3 hover:bg-hover-subtle text-muted-foreground hover:text-foreground flex w-full items-center text-left"
      >
        <FolderOpen className="icon-sm flex-shrink-0" />
        Import from Media Library
      </button>
    </div>,
    document.body,
  )
}
