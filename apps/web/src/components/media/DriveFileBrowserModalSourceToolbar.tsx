'use client'

import { Folder, Grid3X3, HardDrive, Table2, Users } from 'lucide-react'
import type { DriveSource, ViewMode } from '@/components/media/drive-file-browser-modal.types'

export function DriveFileBrowserModalSourceToolbar({
  source,
  switchSource,
  viewMode,
  setViewMode,
  allowGallery = true,
}: {
  source: DriveSource
  switchSource: (s: DriveSource) => void
  viewMode: ViewMode
  setViewMode: (v: ViewMode) => void
  allowGallery?: boolean
}) {
  return (
    <div className="px-spacing-6 py-spacing-2 flex items-center justify-between">
      <div className="flex gap-1">
        {[
          { key: 'my_drive' as const, label: 'My Drive', icon: HardDrive },
          { key: 'shared_with_me' as const, label: 'Shared with me', icon: Users },
          { key: 'shared_drives' as const, label: 'Shared Drives', icon: Folder },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => switchSource(tab.key)}
            className={`body-4 rounded-spacing-2 flex items-center gap-1.5 px-3 py-1.5 transition-colors ${source === tab.key ? 'chip-glass-blue text-foreground' : 'chip-glass-neutral text-muted-foreground hover:text-foreground'}`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>
      <div className="chip-glass-neutral rounded-spacing-2 flex gap-0.5 p-0.5">
        {[
          { key: 'table' as const, icon: Table2, label: 'Table' },
          ...(allowGallery ? [{ key: 'gallery' as const, icon: Grid3X3, label: 'Gallery' }] : []),
        ].map((v) => (
          <button
            key={v.key}
            type="button"
            onClick={() => setViewMode(v.key)}
            title={`${v.label} view`}
            className={`rounded-spacing-1 p-1.5 transition-colors ${viewMode === v.key ? 'bg-primary/20 text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <v.icon className="h-3.5 w-3.5" />
          </button>
        ))}
      </div>
    </div>
  )
}
