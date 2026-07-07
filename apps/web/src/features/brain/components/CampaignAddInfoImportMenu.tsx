'use client'

import type { ChangeEvent, RefObject } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Download, ExternalLink, FolderOpen, Upload } from 'lucide-react'
import { CloudAttachMenuItems } from '@/components/media/CloudAttachMenuItems'

interface CampaignAddInfoImportMenuPosition {
  left: number
  top: number
  width: number
}

interface CampaignAddInfoImportMenuProps {
  buttonRef: RefObject<HTMLButtonElement | null>
  fileInputRef: RefObject<HTMLInputElement | null>
  onClose: () => void
  onDrive: () => void
  onDropbox: () => void
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void
  onOpenFathom: () => void
  onOpenFireflies: () => void
  onOpenMediaLibrary: () => void
  onToggleOpen: () => void
  open: boolean
  position: CampaignAddInfoImportMenuPosition
}

export function CampaignAddInfoImportMenu({
  buttonRef,
  fileInputRef,
  onClose,
  onDrive,
  onDropbox,
  onFileChange,
  onOpenFathom,
  onOpenFireflies,
  onOpenMediaLibrary,
  onToggleOpen,
  open,
  position,
}: CampaignAddInfoImportMenuProps) {
  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={onToggleOpen}
        className="button-glass-neutral gap-spacing-1 px-spacing-2 body-4 flex h-spacing-9 items-center rounded-lg font-medium"
      >
        <Download className="icon-xs" />
        Import
        <ChevronDown className="icon-xs text-muted-foreground" />
      </button>
      {open &&
        typeof document !== 'undefined' &&
        createPortal(
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
              onLocalUpload={() => fileInputRef.current?.click()}
              onDrive={onDrive}
              onDropbox={onDropbox}
              onSelect={onClose}
              localLabel="Upload from local"
              localIcon={<Upload className="icon-sm flex-shrink-0" />}
              driveIcon={
                <img
                  src="/Integrations/GoogleDrive.png"
                  alt="Google Drive"
                  className="icon-sm flex-shrink-0 rounded-sm object-contain"
                />
              }
              dropboxIcon={
                <img
                  src="/Integrations/Dropbox.png"
                  alt="Dropbox"
                  className="icon-sm flex-shrink-0 rounded-sm object-contain"
                />
              }
              itemClassName="gap-spacing-2 px-spacing-2 py-spacing-2 rounded-spacing-1 body-3 flex w-full items-center text-left hover:bg-hover-subtle text-muted-foreground hover:text-foreground"
            />
            <button
              type="button"
              onClick={onOpenFathom}
              className="gap-spacing-2 px-spacing-2 py-spacing-2 rounded-spacing-1 body-3 hover:bg-hover-subtle text-muted-foreground hover:text-foreground flex w-full items-center text-left"
            >
              <ExternalLink className="icon-sm flex-shrink-0" />
              Import from Fathom
            </button>
            <button
              type="button"
              onClick={onOpenFireflies}
              className="gap-spacing-2 px-spacing-2 py-spacing-2 rounded-spacing-1 body-3 hover:bg-hover-subtle text-muted-foreground hover:text-foreground flex w-full items-center text-left"
            >
              <ExternalLink className="icon-sm flex-shrink-0" />
              Import from Fireflies
            </button>
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
        )}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".txt,.md,.skill,.csv,.json,.xml,.yaml,.yml,.pdf,.docx,.doc,.pptx,.xls,.xlsx,.xlsm,.png,.jpg,.jpeg,.webp,.gif,.bmp,.tif,.tiff,.heic,.heif"
        onChange={onFileChange}
      />
    </div>
  )
}
