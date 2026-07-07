'use client'

import type { ReactNode } from 'react'
import { Check, Folder } from 'lucide-react'
import { FOLDER_MIME } from '@/components/media/drive-file-browser-modal.constants'
import { getFileIcon } from '@/components/media/drive-file-browser-modal.utils'
import type { GoogleDriveFile } from '@/lib/services/google-drive-api'

export function DriveFileBrowserGalleryView({
  files,
  selectionEnabled,
  importedFileIds,
  selectedFileIds,
  toggleFileSelection,
  navigateToFolder,
  renderRowActions,
  onSpacesDocsFileActivate,
}: {
  files: GoogleDriveFile[]
  selectionEnabled: boolean
  importedFileIds: Set<string>
  selectedFileIds: Set<string>
  toggleFileSelection: (id: string) => void
  navigateToFolder: (file: GoogleDriveFile) => void
  renderRowActions: (file: GoogleDriveFile) => ReactNode
  onSpacesDocsFileActivate?: (file: GoogleDriveFile) => void
}) {
  return (
    <div className="gap-spacing-2 grid grid-cols-5">
      {files.map((file) => {
        const isFolder = file.mimeType === FOLDER_MIME
        const hasThumb = file.mimeType.startsWith('image/') && file.thumbnailLink
        const isFileSelected = selectedFileIds.has(file.id)
        const isImported = importedFileIds.has(file.id)
        return (
          <div key={file.id} className={`group relative ${isImported ? 'opacity-50' : ''}`}>
            {isFolder ? (
              <button
                type="button"
                onClick={() => navigateToFolder(file)}
                className="rounded-spacing-2 hover:bg-hover-subtle flex w-full flex-col items-center gap-2 p-3 transition-colors"
              >
                <Folder className="text-primary h-10 w-10" />
                <p className="body-4 text-foreground w-full truncate text-center">{file.name}</p>
              </button>
            ) : (
              <div
                role={onSpacesDocsFileActivate ? 'button' : undefined}
                tabIndex={onSpacesDocsFileActivate ? 0 : undefined}
                onKeyDown={(e) => {
                  if (!onSpacesDocsFileActivate) return
                  if (e.target !== e.currentTarget) return
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    if (!isImported) onSpacesDocsFileActivate(file)
                  }
                }}
                onClick={() => {
                  if (selectionEnabled && !isImported) toggleFileSelection(file.id)
                  else if (onSpacesDocsFileActivate && !isImported) onSpacesDocsFileActivate(file)
                }}
                className={`rounded-spacing-2 relative aspect-square overflow-hidden border transition-colors ${isImported ? 'border-primary/30' : isFileSelected ? 'border-primary card-glass-blue' : 'border-border hover:border-primary/50'} ${selectionEnabled && !isImported ? 'cursor-pointer' : ''} ${onSpacesDocsFileActivate && !selectionEnabled && !isImported ? 'cursor-pointer' : ''}`}
              >
                {hasThumb ? (
                  <img
                    src={file.thumbnailLink!}
                    alt={file.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="bg-muted/30 flex h-full w-full flex-col items-center justify-center gap-2">
                    {getFileIcon(file.mimeType, 'lg')}
                    <p className="body-4 text-muted-foreground w-full truncate px-2 text-center">
                      {file.name}
                    </p>
                  </div>
                )}
                {selectionEnabled && isFileSelected && (
                  <div className="absolute left-1.5 top-1.5">
                    <div className="dropdown-sort-option-selected flex h-5 w-5 items-center justify-center rounded">
                      <Check className="text-foreground h-3 w-3" />
                    </div>
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                  <p className="mb-1 truncate text-xs text-white">{file.name}</p>
                  <div className="flex justify-end">{renderRowActions(file)}</div>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
