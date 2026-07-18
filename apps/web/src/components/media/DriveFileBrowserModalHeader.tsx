'use client'

import { X } from 'lucide-react'

export function DriveFileBrowserModalHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="px-spacing-4 sm:px-spacing-6 pt-spacing-4 pb-spacing-2">
      <div className="flex items-center justify-between">
        <h2 className="title-h6">Google Drive</h2>
        <button
          type="button"
          aria-label="Close Google Drive"
          onClick={onClose}
          className="btn-icon-bare"
        >
          <X className="icon-xs" />
        </button>
      </div>
    </div>
  )
}
