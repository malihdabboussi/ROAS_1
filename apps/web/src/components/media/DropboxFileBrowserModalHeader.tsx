'use client'

import { HardDrive, X } from 'lucide-react'

export function DropboxFileBrowserModalHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="px-spacing-4 sm:px-spacing-6 pt-spacing-4 pb-spacing-2">
      <div className="flex items-center justify-between">
        <div className="gap-spacing-2 flex items-center">
          <HardDrive className="text-primary h-5 w-5" />
          <h2 className="title-h6">Dropbox</h2>
        </div>
        <button
          type="button"
          aria-label="Close Dropbox"
          onClick={onClose}
          className="btn-icon-bare"
        >
          <X className="icon-xs" />
        </button>
      </div>
    </div>
  )
}
