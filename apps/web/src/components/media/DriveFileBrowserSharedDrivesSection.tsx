'use client'

import { Folder } from 'lucide-react'

export function DriveFileBrowserSharedDrivesSection({
  sharedDrives,
  setSelectedDriveId,
}: {
  sharedDrives: { id: string; name: string }[]
  setSelectedDriveId: (id: string | null) => void
}) {
  return (
    <div className="px-spacing-6 py-spacing-2">
      {sharedDrives.length === 0 ? (
        <p className="body-4 text-muted-foreground">No shared drives found</p>
      ) : (
        <ul className="gap-spacing-1 flex flex-col" role="list">
          {sharedDrives.map((d) => (
            <li key={d.id}>
              <button
                type="button"
                onClick={() => setSelectedDriveId(d.id)}
                className="body-3 text-muted-foreground hover:text-foreground hover:bg-hover-subtle rounded-spacing-2 px-spacing-3 py-spacing-2 flex w-full items-center gap-2 text-left transition-colors"
              >
                <Folder className="text-primary h-4 w-4 shrink-0" />
                <span className="min-w-0 truncate">{d.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
