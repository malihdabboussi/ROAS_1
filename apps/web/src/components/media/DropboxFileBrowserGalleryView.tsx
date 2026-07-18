'use client'

import type { ReactNode } from 'react'
import { Check, Folder } from 'lucide-react'
import { getDropboxFileIcon } from '@/components/media/dropbox-file-browser-modal.utils'
import type { DropboxFile } from '@/lib/services/dropbox-api'

export function DropboxFileBrowserGalleryView({
  files,
  selectionEnabled,
  importedFileIds,
  selectedFileIds,
  toggleFileSelection,
  navigateToFolder,
  renderRowActions,
}: {
  files: DropboxFile[]
  selectionEnabled: boolean
  importedFileIds: Set<string>
  selectedFileIds: Set<string>
  toggleFileSelection: (id: string) => void
  navigateToFolder: (file: DropboxFile) => void
  renderRowActions: (file: DropboxFile) => ReactNode
}) {
  return (
    <div className="gap-spacing-2 grid grid-cols-5">
      {files.map((file) => {
        const isFolder = file['.tag'] === 'folder'
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
                role={selectionEnabled && !isImported ? 'button' : undefined}
                tabIndex={selectionEnabled && !isImported ? 0 : undefined}
                aria-label={
                  selectionEnabled && !isImported
                    ? `${isFileSelected ? 'Deselect' : 'Select'} ${file.name}`
                    : undefined
                }
                aria-pressed={selectionEnabled && !isImported ? isFileSelected : undefined}
                onClick={() => selectionEnabled && !isImported && toggleFileSelection(file.id)}
                onKeyDown={(event) => {
                  if (
                    !selectionEnabled ||
                    isImported ||
                    (event.key !== 'Enter' && event.key !== ' ')
                  ) {
                    return
                  }
                  event.preventDefault()
                  toggleFileSelection(file.id)
                }}
                className={`rounded-spacing-2 relative aspect-square overflow-hidden border transition-colors ${isImported ? 'border-primary/30' : isFileSelected ? 'border-primary card-glass-blue' : 'border-border hover:border-primary/50'} ${selectionEnabled && !isImported ? 'cursor-pointer' : ''}`}
              >
                <div className="bg-secondary flex h-full w-full flex-col items-center justify-center gap-2">
                  {getDropboxFileIcon(file, 'lg')}
                  <p className="body-4 text-muted-foreground w-full truncate px-2 text-center">
                    {file.name}
                  </p>
                </div>
                {selectionEnabled && isFileSelected && (
                  <div className="absolute left-1.5 top-1.5">
                    <div className="dropdown-sort-option-selected flex h-5 w-5 items-center justify-center rounded">
                      <Check className="text-foreground h-3 w-3" />
                    </div>
                  </div>
                )}
                <div className="bg-secondary/95 absolute inset-x-0 bottom-0 p-2 opacity-0 transition-opacity group-hover:opacity-100">
                  <p className="body-4 text-foreground mb-1 truncate">{file.name}</p>
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
