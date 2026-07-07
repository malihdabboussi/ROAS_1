'use client'

import { Cloud, HardDrive } from 'lucide-react'

export function MediaPickerGoogleDrivePanel(options: { onBrowse: () => void }) {
  const { onBrowse } = options
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <HardDrive className="text-muted-foreground h-12 w-12" />
      <p className="body-3 text-muted-foreground text-center">
        Select media from your Google Drive. Video files use the link without downloading to the
        app.
      </p>
      <button
        type="button"
        onClick={onBrowse}
        className="button-glass-blue rounded-lg px-4 py-2 font-medium"
      >
        Browse Google Drive
      </button>
    </div>
  )
}

export function MediaPickerDropboxPanel(options: { onBrowse: () => void }) {
  const { onBrowse } = options
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <Cloud className="text-muted-foreground h-12 w-12" />
      <p className="body-3 text-muted-foreground text-center">Select media from your Dropbox.</p>
      <button
        type="button"
        onClick={onBrowse}
        className="button-glass-blue rounded-lg px-4 py-2 font-medium"
      >
        Browse Dropbox
      </button>
    </div>
  )
}
