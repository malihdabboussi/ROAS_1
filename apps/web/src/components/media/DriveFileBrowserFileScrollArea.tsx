'use client'

import type { Dispatch, MouseEvent, ReactNode, RefObject, SetStateAction } from 'react'
import { HardDrive, Loader2 } from 'lucide-react'
import type { DriveTableColKey, ViewMode } from '@/components/media/drive-file-browser-modal.types'
import { DriveFileBrowserGalleryView } from '@/components/media/DriveFileBrowserGalleryView'
import { DriveFileBrowserTableView } from '@/components/media/DriveFileBrowserTableView'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import type { GoogleDriveFile } from '@/lib/services/google-drive-api'

export function DriveFileBrowserFileScrollArea({
  gridRef,
  onScroll,
  loading,
  showFilesArea,
  files,
  search,
  viewMode,
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
  loadingMore,
  onSpacesDocsFileActivate,
}: {
  gridRef: RefObject<HTMLDivElement | null>
  onScroll: () => void
  loading: boolean
  showFilesArea: boolean
  files: GoogleDriveFile[]
  search: string
  viewMode: ViewMode
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
  loadingMore: boolean
  onSpacesDocsFileActivate?: (file: GoogleDriveFile) => void
}) {
  return (
    <div
      ref={gridRef}
      onScroll={onScroll}
      className="px-spacing-6 py-spacing-3 flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden"
    >
      {loading ? (
        <div className="py-spacing-8 flex flex-1 items-center justify-center">
          <VibeyLoadingOrb size="sm" text="Loading Drive files..." />
        </div>
      ) : !showFilesArea ? null : files.length === 0 ? (
        <div className="py-spacing-8 flex flex-col items-center justify-center">
          <HardDrive className="text-muted-foreground/30 h-10 w-10" />
          <p className="body-3 text-muted-foreground mt-spacing-2">
            {search ? 'No files match your search' : 'This folder is empty'}
          </p>
        </div>
      ) : viewMode === 'table' ? (
        <DriveFileBrowserTableView
          sortedFiles={sortedFiles}
          selectionEnabled={selectionEnabled}
          importedFileIds={importedFileIds}
          selectedFileIds={selectedFileIds}
          toggleFileSelection={toggleFileSelection}
          navigateToFolder={navigateToFolder}
          renameFileId={renameFileId}
          renameValue={renameValue}
          setRenameValue={setRenameValue}
          handleRename={handleRename}
          setRenameFileId={setRenameFileId}
          driveColPct={driveColPct}
          driveTableColWidths={driveTableColWidths}
          setDriveTableColWidths={setDriveTableColWidths}
          resizeDriveColumn={resizeDriveColumn}
          sortCol={sortCol}
          sortDir={sortDir}
          toggleSort={toggleSort}
          toggleSelectAll={toggleSelectAll}
          nonFolderFiles={nonFolderFiles}
          renderRowActions={renderRowActions}
          onSpacesDocsFileActivate={onSpacesDocsFileActivate}
        />
      ) : (
        <DriveFileBrowserGalleryView
          files={files}
          selectionEnabled={selectionEnabled}
          importedFileIds={importedFileIds}
          selectedFileIds={selectedFileIds}
          toggleFileSelection={toggleFileSelection}
          navigateToFolder={navigateToFolder}
          renderRowActions={renderRowActions}
          onSpacesDocsFileActivate={onSpacesDocsFileActivate}
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
