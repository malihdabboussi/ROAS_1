'use client'

import type { Dispatch, MouseEvent, ReactNode, RefObject, SetStateAction } from 'react'
import { HardDrive, Loader2 } from 'lucide-react'
import type {
  DropboxTableColKey,
  DropboxViewMode,
} from '@/components/media/dropbox-file-browser-modal.types'
import { DropboxFileBrowserGalleryView } from '@/components/media/DropboxFileBrowserGalleryView'
import { DropboxFileBrowserTableView } from '@/components/media/DropboxFileBrowserTableView'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import type { DropboxFile } from '@/lib/services/dropbox-api'

export function DropboxFileBrowserFileScrollArea({
  gridRef,
  onScroll,
  loading,
  files,
  search,
  viewMode,
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
  loadingMore,
}: {
  gridRef: RefObject<HTMLDivElement | null>
  onScroll: () => void
  loading: boolean
  files: DropboxFile[]
  search: string
  viewMode: DropboxViewMode
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
  loadingMore: boolean
}) {
  return (
    <div
      ref={gridRef}
      onScroll={onScroll}
      className="px-spacing-6 py-spacing-3 flex-1 overflow-y-auto"
    >
      {loading ? (
        <div className="py-spacing-8 flex flex-1 items-center justify-center">
          <VibeyLoadingOrb size="sm" text="Loading Dropbox files..." />
        </div>
      ) : files.length === 0 ? (
        <div className="py-spacing-8 flex flex-col items-center justify-center">
          <HardDrive className="text-muted-foreground/30 h-10 w-10" />
          <p className="body-3 text-muted-foreground mt-spacing-2">
            {search ? 'No files match your search' : 'This folder is empty'}
          </p>
        </div>
      ) : viewMode === 'table' ? (
        <DropboxFileBrowserTableView
          sortedFiles={sortedFiles}
          selectionEnabled={selectionEnabled}
          importedFileIds={importedFileIds}
          selectedFileIds={selectedFileIds}
          toggleFileSelection={toggleFileSelection}
          navigateToFolder={navigateToFolder}
          dropboxColPct={dropboxColPct}
          dropboxTableColWidths={dropboxTableColWidths}
          setDropboxTableColWidths={setDropboxTableColWidths}
          resizeDropboxColumn={resizeDropboxColumn}
          sortCol={sortCol}
          sortDir={sortDir}
          toggleSort={toggleSort}
          toggleSelectAll={toggleSelectAll}
          nonFolderFiles={nonFolderFiles}
          renderRowActions={renderRowActions}
        />
      ) : (
        <DropboxFileBrowserGalleryView
          files={files}
          selectionEnabled={selectionEnabled}
          importedFileIds={importedFileIds}
          selectedFileIds={selectedFileIds}
          toggleFileSelection={toggleFileSelection}
          navigateToFolder={navigateToFolder}
          renderRowActions={renderRowActions}
        />
      )}
      {loadingMore && (
        <div className="py-spacing-2 flex justify-center">
          <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
        </div>
      )}
    </div>
  )
}
