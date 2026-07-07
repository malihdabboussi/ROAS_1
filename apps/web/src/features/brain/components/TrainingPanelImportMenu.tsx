'use client'

import type { ChangeEvent, RefObject } from 'react'
import { ChevronDown, Download, ExternalLink, FolderOpen, Upload } from 'lucide-react'
import { CloudAttachMenuItems } from '@/components/media'

const BRAIN_IMPORT_FILE_ACCEPT =
  '.txt,.md,.skill,.csv,.json,.xml,.yaml,.yml,.pdf,.docx,.doc,.pptx,.xls,.xlsx,.xlsm,.png,.jpg,.jpeg,.webp,.gif,.bmp,.tif,.tiff,.heic,.heif,.mp3,.wav,.mp4,.mov'

interface TrainingPanelImportMenuProps {
  importDropdownOpen: boolean
  importDropdownRef: RefObject<HTMLDivElement | null>
  fileInputRef: RefObject<HTMLInputElement | null>
  onToggleImportDropdown: () => void
  onCloseImportDropdown: () => void
  onFileUpload: (event: ChangeEvent<HTMLInputElement>) => void
  openDrive: () => void | Promise<void>
  openDropbox: () => void | Promise<void>
  fathomConnected: boolean
  firefliesConnected: boolean
  onOpenFathom: () => void
  onOpenFireflies: () => void
  onOpenMediaLibrary: () => void
}

export function TrainingPanelImportMenu({
  importDropdownOpen,
  importDropdownRef,
  fileInputRef,
  onToggleImportDropdown,
  onCloseImportDropdown,
  onFileUpload,
  openDrive,
  openDropbox,
  fathomConnected,
  firefliesConnected,
  onOpenFathom,
  onOpenFireflies,
  onOpenMediaLibrary,
}: TrainingPanelImportMenuProps) {
  return (
    <div ref={importDropdownRef} className="relative">
      <button
        type="button"
        onClick={onToggleImportDropdown}
        className="button-glass-neutral gap-spacing-1 px-spacing-2 body-4 flex h-9 items-center rounded-lg font-medium"
      >
        <Download className="icon-xs" />
        Import
        <ChevronDown className="icon-xs text-muted-foreground" />
      </button>
      {importDropdownOpen && (
        <div
          className="surface-card border-border z-dropdown mt-spacing-1 p-spacing-2 rounded-spacing-2 absolute right-0 top-full w-[260px] border shadow-lg"
          data-dropdown
        >
          <CloudAttachMenuItems
            onLocalUpload={() => fileInputRef.current?.click()}
            onDrive={openDrive}
            onDropbox={openDropbox}
            onSelect={onCloseImportDropdown}
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
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={BRAIN_IMPORT_FILE_ACCEPT}
        onChange={onFileUpload}
      />
    </div>
  )
}
