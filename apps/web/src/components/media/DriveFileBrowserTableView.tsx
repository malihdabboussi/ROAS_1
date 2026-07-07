'use client'

import type { Dispatch, MouseEvent, ReactNode, SetStateAction } from 'react'
import { ArrowDown, ArrowUp, Check } from 'lucide-react'
import {
  DRIVE_SELECT_COL_PX,
  DRIVE_TABLE_RESIZABLE_HEADERS,
  FOLDER_MIME,
} from '@/components/media/drive-file-browser-modal.constants'
import type { DriveTableColKey } from '@/components/media/drive-file-browser-modal.types'
import {
  formatDate,
  formatSize,
  getFileIcon,
} from '@/components/media/drive-file-browser-modal.utils'
import { FileBrowserColumnResizeHandle } from '@/components/media/file-browser-table-column-resize'
import type { GoogleDriveFile } from '@/lib/services/google-drive-api'

export function DriveFileBrowserTableView({
  sortedFiles,
  selectionEnabled,
  importedFileIds,
  selectedFileIds,
  toggleFileSelection,
  navigateToFolder,
  renameFileId,
  renameValue,
  setRenameValue,
  handleRename,
  setRenameFileId,
  driveColPct,
  driveTableColWidths,
  setDriveTableColWidths,
  resizeDriveColumn,
  sortCol,
  sortDir,
  toggleSort,
  toggleSelectAll,
  nonFolderFiles,
  renderRowActions,
  onSpacesDocsFileActivate,
}: {
  sortedFiles: GoogleDriveFile[]
  selectionEnabled: boolean
  importedFileIds: Set<string>
  selectedFileIds: Set<string>
  toggleFileSelection: (id: string) => void
  navigateToFolder: (file: GoogleDriveFile) => void
  renameFileId: string | null
  renameValue: string
  setRenameValue: (v: string) => void
  handleRename: () => void | Promise<void>
  setRenameFileId: (id: string | null) => void
  driveColPct: (px: number) => string
  driveTableColWidths: Record<DriveTableColKey, number>
  setDriveTableColWidths: Dispatch<SetStateAction<Record<DriveTableColKey, number>>>
  resizeDriveColumn: (
    e: MouseEvent,
    leftKey: DriveTableColKey,
    widths: Record<DriveTableColKey, number>,
    setWidths: Dispatch<SetStateAction<Record<DriveTableColKey, number>>>,
  ) => void
  sortCol: 'name' | 'size' | 'owner' | 'modified'
  sortDir: 'asc' | 'desc'
  toggleSort: (col: 'name' | 'size' | 'owner' | 'modified') => void
  toggleSelectAll: () => void
  nonFolderFiles: GoogleDriveFile[]
  renderRowActions: (file: GoogleDriveFile) => ReactNode
  onSpacesDocsFileActivate?: (file: GoogleDriveFile) => void
}) {
  return (
    <table className="w-full min-w-0 max-w-full table-fixed">
      <colgroup>
        {selectionEnabled && <col style={{ width: driveColPct(DRIVE_SELECT_COL_PX) }} />}
        <col style={{ width: driveColPct(driveTableColWidths.name) }} />
        <col style={{ width: driveColPct(driveTableColWidths.size) }} />
        <col style={{ width: driveColPct(driveTableColWidths.owner) }} />
        <col style={{ width: driveColPct(driveTableColWidths.modified) }} />
        <col style={{ width: driveColPct(driveTableColWidths.actions) }} />
      </colgroup>
      <thead>
        <tr className="border-border border-b text-left">
          {selectionEnabled && (
            <th className="pb-2 pl-2">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="border-border hover:border-foreground flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors"
              >
                {selectedFileIds.size === nonFolderFiles.length && nonFolderFiles.length > 0 && (
                  <Check className="text-foreground h-3 w-3" />
                )}
              </button>
            </th>
          )}
          {DRIVE_TABLE_RESIZABLE_HEADERS.map((col) => (
            <th
              key={col.key}
              className={`body-4 text-muted-foreground relative pb-2 font-medium ${col.thClass}`}
            >
              <button
                type="button"
                onClick={() => toggleSort(col.key)}
                className="hover:text-foreground flex items-center gap-1 transition-colors"
              >
                {col.label}
                {sortCol === col.key &&
                  (sortDir === 'asc' ? (
                    <ArrowUp className="h-3 w-3" />
                  ) : (
                    <ArrowDown className="h-3 w-3" />
                  ))}
              </button>
              <FileBrowserColumnResizeHandle
                onMouseDown={(e) =>
                  resizeDriveColumn(e, col.key, driveTableColWidths, setDriveTableColWidths)
                }
              />
            </th>
          ))}
          <th className="body-4 text-muted-foreground whitespace-nowrap pb-2 pr-2 text-right font-medium">
            Actions
          </th>
        </tr>
      </thead>
      <tbody>
        {sortedFiles.map((file) => {
          const isFolder = file.mimeType === FOLDER_MIME
          const isFileSelected = selectedFileIds.has(file.id)
          const isImported = importedFileIds.has(file.id)
          const ownerName = file.owners?.[0]?.displayName ?? file.sharingUser?.displayName ?? '—'
          return (
            <tr
              key={file.id}
              onClick={() => {
                if (isFolder) return
                if (selectionEnabled && !isImported) toggleFileSelection(file.id)
                else if (onSpacesDocsFileActivate && !isImported) onSpacesDocsFileActivate(file)
              }}
              className={`border-border group border-b transition-colors ${isImported ? 'opacity-50' : isFileSelected ? 'bg-primary/5' : 'hover:bg-hover-subtle'} ${!isFolder && selectionEnabled && !isImported ? 'cursor-pointer' : ''} ${!isFolder && onSpacesDocsFileActivate && !selectionEnabled && !isImported ? 'cursor-pointer' : ''}`}
            >
              {selectionEnabled && (
                <td className="py-2 pl-2">
                  {!isFolder && (
                    <div
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${isFileSelected ? 'dropdown-sort-option-selected' : 'border-border'}`}
                    >
                      {isFileSelected && <Check className="text-muted-foreground h-3 w-3" />}
                    </div>
                  )}
                </td>
              )}
              <td className="min-w-0 py-2 pl-2">
                <div className="flex min-w-0 items-center gap-2 overflow-hidden">
                  {getFileIcon(file.mimeType)}
                  {isFolder ? (
                    <button
                      type="button"
                      onClick={() => navigateToFolder(file)}
                      className="body-3 text-foreground truncate font-medium hover:underline"
                    >
                      {file.name}
                    </button>
                  ) : renameFileId === file.id ? (
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') void handleRename()
                        if (e.key === 'Escape') setRenameFileId(null)
                      }}
                      onBlur={() => void handleRename()}
                      className="body-3 text-foreground border-primary w-full border-b bg-transparent outline-none"
                    />
                  ) : (
                    <span className="body-3 text-foreground truncate">{file.name}</span>
                  )}
                  {isImported && (
                    <span className="body-4 text-primary ml-1 shrink-0">
                      <Check className="inline h-3 w-3" /> Imported
                    </span>
                  )}
                </div>
              </td>
              <td className="body-4 text-muted-foreground whitespace-nowrap py-2">
                {isFolder ? '—' : formatSize(file.size)}
              </td>
              <td className="body-4 text-muted-foreground min-w-0 truncate py-2">{ownerName}</td>
              <td className="body-4 text-muted-foreground whitespace-nowrap py-2">
                {formatDate(file.modifiedTime)}
              </td>
              <td className="py-2 pr-2 text-right align-middle">
                <div className="inline-flex justify-end">{renderRowActions(file)}</div>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
