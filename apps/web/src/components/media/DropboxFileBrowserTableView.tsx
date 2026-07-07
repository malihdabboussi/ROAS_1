'use client'

import type { Dispatch, MouseEvent, ReactNode, SetStateAction } from 'react'
import { ArrowDown, ArrowUp, Check } from 'lucide-react'
import {
  DROPBOX_SELECT_COL_PX,
  DROPBOX_TABLE_RESIZABLE_HEADERS,
} from '@/components/media/dropbox-file-browser-modal.constants'
import type { DropboxTableColKey } from '@/components/media/dropbox-file-browser-modal.types'
import {
  formatDropboxDate,
  formatDropboxSize,
  getDropboxFileIcon,
} from '@/components/media/dropbox-file-browser-modal.utils'
import { FileBrowserColumnResizeHandle } from '@/components/media/file-browser-table-column-resize'
import type { DropboxFile } from '@/lib/services/dropbox-api'

export function DropboxFileBrowserTableView({
  sortedFiles,
  selectionEnabled,
  importedFileIds,
  selectedFileIds,
  toggleFileSelection,
  navigateToFolder,
  dropboxColPct,
  dropboxTableColWidths,
  setDropboxTableColWidths,
  resizeDropboxColumn,
  sortCol,
  sortDir,
  toggleSort,
  toggleSelectAll,
  nonFolderFiles,
  renderRowActions,
}: {
  sortedFiles: DropboxFile[]
  selectionEnabled: boolean
  importedFileIds: Set<string>
  selectedFileIds: Set<string>
  toggleFileSelection: (id: string) => void
  navigateToFolder: (file: DropboxFile) => void
  dropboxColPct: (px: number) => string
  dropboxTableColWidths: Record<DropboxTableColKey, number>
  setDropboxTableColWidths: Dispatch<SetStateAction<Record<DropboxTableColKey, number>>>
  resizeDropboxColumn: (
    e: MouseEvent,
    leftKey: DropboxTableColKey,
    widths: Record<DropboxTableColKey, number>,
    setWidths: Dispatch<SetStateAction<Record<DropboxTableColKey, number>>>,
  ) => void
  sortCol: 'name' | 'size' | 'modified'
  sortDir: 'asc' | 'desc'
  toggleSort: (col: 'name' | 'size' | 'modified') => void
  toggleSelectAll: () => void
  nonFolderFiles: DropboxFile[]
  renderRowActions: (file: DropboxFile) => ReactNode
}) {
  return (
    <table className="w-full min-w-0 max-w-full table-fixed">
      <colgroup>
        {selectionEnabled && <col style={{ width: dropboxColPct(DROPBOX_SELECT_COL_PX) }} />}
        <col style={{ width: dropboxColPct(dropboxTableColWidths.name) }} />
        <col style={{ width: dropboxColPct(dropboxTableColWidths.size) }} />
        <col style={{ width: dropboxColPct(dropboxTableColWidths.modified) }} />
        <col style={{ width: dropboxColPct(dropboxTableColWidths.actions) }} />
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
          {DROPBOX_TABLE_RESIZABLE_HEADERS.map((col) => (
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
                  resizeDropboxColumn(e, col.key, dropboxTableColWidths, setDropboxTableColWidths)
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
          const isFolder = file['.tag'] === 'folder'
          const isFileSelected = selectedFileIds.has(file.id)
          const isImported = importedFileIds.has(file.id)
          return (
            <tr
              key={file.id}
              onClick={() => {
                if (!isFolder && selectionEnabled && !isImported) toggleFileSelection(file.id)
              }}
              className={`border-border group border-b transition-colors ${isImported ? 'opacity-50' : isFileSelected ? 'bg-primary/5' : 'hover:bg-hover-subtle'} ${!isFolder && selectionEnabled && !isImported ? 'cursor-pointer' : ''}`}
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
                  {getDropboxFileIcon(file)}
                  {isFolder ? (
                    <button
                      type="button"
                      onClick={() => navigateToFolder(file)}
                      className="body-3 text-foreground truncate font-medium hover:underline"
                    >
                      {file.name}
                    </button>
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
              <td className="body-4 text-muted-foreground py-2">
                {isFolder ? '—' : formatDropboxSize(file.size)}
              </td>
              <td className="body-4 text-muted-foreground py-2">
                {formatDropboxDate(file.server_modified)}
              </td>
              <td className="py-2 pr-2 text-right">
                <div className="inline-flex">{renderRowActions(file)}</div>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
