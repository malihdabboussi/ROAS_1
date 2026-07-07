'use client'

import { FOLDER_MIME } from '@/components/media/drive-file-browser-modal.constants'
import type { DriveFileBrowserModalProps } from '@/components/media/drive-file-browser-modal.types'
import { DriveFileBrowserBreadcrumbBar } from '@/components/media/DriveFileBrowserBreadcrumbBar'
import { DriveFileBrowserFileScrollArea } from '@/components/media/DriveFileBrowserFileScrollArea'
import { DriveFileBrowserModalFooter } from '@/components/media/DriveFileBrowserModalFooter'
import { DriveFileBrowserModalHeader } from '@/components/media/DriveFileBrowserModalHeader'
import { DriveFileBrowserModalSourceToolbar } from '@/components/media/DriveFileBrowserModalSourceToolbar'
import { DriveFileBrowserRowActions } from '@/components/media/DriveFileBrowserRowActions'
import { DriveFileBrowserSharedDrivesSection } from '@/components/media/DriveFileBrowserSharedDrivesSection'
import { DriveFileBrowserShareInlineRow } from '@/components/media/DriveFileBrowserShareInlineRow'
import { useDriveFileBrowserModal } from '@/components/media/use-drive-file-browser-modal'
import type { GoogleDriveFile } from '@/lib/services/google-drive-api'
import { cn } from '@/lib/utils/cn'

export type DriveFileBrowserPanelProps = DriveFileBrowserModalProps & {
  layout?: 'modal' | 'embedded'
}

export function DriveFileBrowserPanel({
  layout = 'modal',
  ...modalProps
}: DriveFileBrowserPanelProps) {
  const {
    onClose,
    onSelectFileForChat,
    onSelectDriveFile,
    onInsertDriveLink,
    pickFoldersOnly = false,
    docsBrowseSeed,
    onSpacesDocsFileOpen,
  } = modalProps

  const {
    viewMode,
    setViewMode,
    listing,
    sortTable,
    dialogs,
    contextConfig,
    fileOps,
    selectionEnabled,
  } = useDriveFileBrowserModal(modalProps)

  const handleBatchInsertDriveLinks = () => {
    if (!onInsertDriveLink) return
    const selected = listing.files.filter((f) => listing.selectedFileIds.has(f.id))
    for (const file of selected) {
      onInsertDriveLink({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        thumbnailLink: file.thumbnailLink,
      })
    }
    onClose()
  }

  const pinnedSpacesDriveBrowse = Boolean(docsBrowseSeed)

  const showFilesArea =
    pinnedSpacesDriveBrowse || listing.source !== 'shared_drives' || !!listing.selectedDriveId

  const renderRowActions = (file: GoogleDriveFile) =>
    pickFoldersOnly ? (
      file.mimeType === FOLDER_MIME ? (
        <button
          type="button"
          onClick={() => {
            onSelectDriveFile?.({
              id: file.id,
              name: file.name,
              mimeType: file.mimeType,
              source: listing.source,
              driveId: listing.selectedDriveId ?? undefined,
            })
            onClose()
          }}
          className="badge-glass badge-glass-blue rounded-spacing-2 px-2 py-1 text-xs font-medium transition-opacity hover:opacity-90"
        >
          Select folder
        </button>
      ) : null
    ) : (
      <DriveFileBrowserRowActions
        file={file}
        contextConfig={contextConfig}
        onSelectDriveFile={onSelectDriveFile}
        onInsertDriveLink={onInsertDriveLink}
        onClose={onClose}
        onSelectFileForChat={onSelectFileForChat}
        moreMenuFileId={dialogs.moreMenuFileId}
        setMoreMenuFileId={dialogs.setMoreMenuFileId}
        moreMenuRef={dialogs.moreMenuRef}
        setActionType={fileOps.setActionType}
        handleAddToChat={fileOps.handleAddToChat}
        handleExportToVibey={fileOps.handleExportToVibey}
        isLoadingAction={fileOps.isLoadingAction}
        setRenameFileId={dialogs.setRenameFileId}
        setRenameValue={dialogs.setRenameValue}
        handleDownload={fileOps.handleDownload}
        setShareFileId={dialogs.setShareFileId}
        setShareEmail={dialogs.setShareEmail}
        handleDelete={fileOps.handleDelete}
      />
    )

  const showModalChrome = layout === 'modal'

  return (
    <div
      className={cn(
        'flex h-full min-h-0 min-w-0 flex-col overflow-hidden',
        showModalChrome && 'surface-card card-elevated rounded-spacing-4 wizard-container-border',
      )}
    >
      {showModalChrome ? <DriveFileBrowserModalHeader onClose={onClose} /> : null}
      {!pinnedSpacesDriveBrowse && (
        <>
          <DriveFileBrowserModalSourceToolbar
            source={listing.source}
            switchSource={listing.switchSource}
            viewMode={viewMode}
            setViewMode={setViewMode}
            allowGallery={!pickFoldersOnly}
          />
          {listing.source === 'shared_drives' && !listing.selectedDriveId && (
            <DriveFileBrowserSharedDrivesSection
              sharedDrives={listing.sharedDrives}
              setSelectedDriveId={listing.setSelectedDriveId}
            />
          )}
        </>
      )}
      {showFilesArea && (
        <DriveFileBrowserBreadcrumbBar
          source={listing.source}
          sharedDrives={listing.sharedDrives}
          selectedDriveId={listing.selectedDriveId}
          setSelectedDriveId={listing.setSelectedDriveId}
          folderStack={listing.folderStack}
          setFolderStack={listing.setFolderStack}
          navigateBack={listing.navigateBack}
          search={listing.search}
          setSearch={listing.setSearch}
          uploading={listing.uploading}
          fileInputRef={listing.fileInputRef}
          onFileInputChange={listing.handleFileInputChange}
          searchBarVariant={layout === 'embedded' ? 'surface' : 'glass'}
        />
      )}
      <DriveFileBrowserShareInlineRow
        shareFileId={dialogs.shareFileId}
        shareEmail={dialogs.shareEmail}
        setShareEmail={dialogs.setShareEmail}
        shareRole={dialogs.shareRole}
        setShareRole={dialogs.setShareRole}
        onShare={() => void fileOps.handleShare()}
        onCancel={() => dialogs.setShareFileId(null)}
      />
      <DriveFileBrowserFileScrollArea
        gridRef={listing.gridRef}
        onScroll={listing.handleScroll}
        loading={listing.loading}
        showFilesArea={showFilesArea}
        files={listing.files}
        search={listing.search}
        viewMode={viewMode}
        sortedFiles={sortTable.sortedFiles}
        selectionEnabled={selectionEnabled}
        importedFileIds={listing.importedFileIds}
        selectedFileIds={listing.selectedFileIds}
        toggleFileSelection={sortTable.toggleFileSelection}
        navigateToFolder={listing.navigateToFolder}
        renameFileId={dialogs.renameFileId}
        renameValue={dialogs.renameValue}
        setRenameValue={dialogs.setRenameValue}
        handleRename={fileOps.handleRename}
        setRenameFileId={dialogs.setRenameFileId}
        driveColPct={sortTable.driveColPct}
        driveTableColWidths={sortTable.driveTableColWidths}
        setDriveTableColWidths={sortTable.setDriveTableColWidths}
        resizeDriveColumn={sortTable.resizeDriveColumn}
        sortCol={sortTable.sortCol}
        sortDir={sortTable.sortDir}
        toggleSort={sortTable.toggleSort}
        toggleSelectAll={sortTable.toggleSelectAll}
        nonFolderFiles={sortTable.nonFolderFiles}
        renderRowActions={renderRowActions}
        loadingMore={listing.loadingMore}
        onSpacesDocsFileActivate={
          pinnedSpacesDriveBrowse && !pickFoldersOnly ? onSpacesDocsFileOpen : undefined
        }
      />
      <DriveFileBrowserModalFooter
        showClose={showModalChrome}
        onClose={onClose}
        onSelectFileForChat={onSelectFileForChat}
        onInsertDriveLinkBatch={onInsertDriveLink ? handleBatchInsertDriveLinks : undefined}
        selectedCount={listing.selectedFileIds.size}
        batchImporting={fileOps.batchImporting}
        batchProgress={fileOps.batchProgress}
        onBatchImport={() => void fileOps.handleBatchImport()}
      />
    </div>
  )
}
