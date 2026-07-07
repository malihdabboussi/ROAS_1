'use client'

import { DropboxFileBrowserBreadcrumbBar } from '@/components/media/DropboxFileBrowserBreadcrumbBar'
import { DropboxFileBrowserDeleteDialog } from '@/components/media/DropboxFileBrowserDeleteDialog'
import { DropboxFileBrowserFileScrollArea } from '@/components/media/DropboxFileBrowserFileScrollArea'
import type { DropboxFileBrowserModalProps } from '@/components/media/dropbox-file-browser-modal.types'
import { DropboxFileBrowserModalFooter } from '@/components/media/DropboxFileBrowserModalFooter'
import { DropboxFileBrowserModalHeader } from '@/components/media/DropboxFileBrowserModalHeader'
import { DropboxFileBrowserRowActions } from '@/components/media/DropboxFileBrowserRowActions'
import { useDropboxFileBrowserModal } from '@/components/media/use-dropbox-file-browser-modal'
import type { DropboxFile } from '@/lib/services/dropbox-api'
import { cn } from '@/lib/utils/cn'

export type DropboxFileBrowserPanelProps = DropboxFileBrowserModalProps & {
  layout?: 'modal' | 'embedded'
}

export function DropboxFileBrowserPanel({
  layout = 'modal',
  ...modalProps
}: DropboxFileBrowserPanelProps) {
  const { onClose, onSelectFileForChat } = modalProps
  const {
    viewMode,
    setViewMode,
    listing,
    sortTable,
    contextConfig,
    fileOps,
    selectionEnabled,
  } = useDropboxFileBrowserModal(modalProps)
  const showModalChrome = layout === 'modal'

  const renderRowActions = (file: DropboxFile) => (
    <DropboxFileBrowserRowActions
      file={file}
      contextConfig={contextConfig}
      onSelectFileForChat={onSelectFileForChat}
      handleAddToChat={fileOps.handleAddToChat}
      handleExportToVibey={fileOps.handleExportToVibey}
      handleShare={fileOps.handleShare}
      setDeleteTarget={fileOps.setDeleteTarget}
      isLoadingAction={fileOps.isLoadingAction}
    />
  )

  return (
    <>
      <div
        className={cn(
          'flex h-full min-h-0 flex-col overflow-hidden',
          showModalChrome &&
            'surface-card card-elevated rounded-spacing-4 wizard-container-border',
        )}
      >
        {showModalChrome ? <DropboxFileBrowserModalHeader onClose={onClose} /> : null}
        <DropboxFileBrowserBreadcrumbBar
          embedded={!showModalChrome}
          folderStack={listing.folderStack}
          setFolderStack={listing.setFolderStack}
          navigateBack={listing.navigateBack}
          search={listing.search}
          setSearch={listing.setSearch}
          viewMode={viewMode}
          setViewMode={setViewMode}
          uploading={listing.uploading}
          fileInputRef={listing.fileInputRef}
          onFileInputChange={listing.handleFileInputChange}
        />
        <DropboxFileBrowserFileScrollArea
          gridRef={listing.gridRef}
          onScroll={listing.handleScroll}
          loading={listing.loading}
          files={listing.files}
          search={listing.search}
          viewMode={viewMode}
          sortedFiles={sortTable.sortedFiles}
          selectionEnabled={selectionEnabled}
          importedFileIds={listing.importedFileIds}
          selectedFileIds={listing.selectedFileIds}
          toggleFileSelection={sortTable.toggleFileSelection}
          navigateToFolder={listing.navigateToFolder}
          dropboxColPct={sortTable.dropboxColPct}
          dropboxTableColWidths={sortTable.dropboxTableColWidths}
          setDropboxTableColWidths={sortTable.setDropboxTableColWidths}
          resizeDropboxColumn={sortTable.resizeDropboxColumn}
          sortCol={sortTable.sortCol}
          sortDir={sortTable.sortDir}
          toggleSort={sortTable.toggleSort}
          toggleSelectAll={sortTable.toggleSelectAll}
          nonFolderFiles={sortTable.nonFolderFiles}
          renderRowActions={renderRowActions}
          loadingMore={listing.loadingMore}
        />
        <DropboxFileBrowserModalFooter
          showClose={showModalChrome}
          onClose={onClose}
          onSelectFileForChat={onSelectFileForChat}
          selectedCount={listing.selectedFileIds.size}
          batchImporting={fileOps.batchImporting}
          batchProgress={fileOps.batchProgress}
          onBatchImport={() => void fileOps.handleBatchImport()}
        />
      </div>
      <DropboxFileBrowserDeleteDialog
        deleteTarget={fileOps.deleteTarget}
        setDeleteTarget={fileOps.setDeleteTarget}
        confirmDelete={fileOps.confirmDelete}
      />
    </>
  )
}
