'use client'

import { useEffect, useMemo, useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { AddFromUrlModal } from '@/components/media/AddFromUrlModal'
import { DriveFileBrowserModal } from '@/components/media/DriveFileBrowserModal'
import { DropboxFileBrowserModal } from '@/components/media/DropboxFileBrowserModal'
import type {
  MediaPickerModalProps,
  MediaSource,
} from '@/components/media/media-picker-modal.types'
import {
  MediaPickerDropboxPanel,
  MediaPickerGoogleDrivePanel,
} from '@/components/media/MediaPickerCloudSourcePanels'
import { MediaPickerLibraryGrid } from '@/components/media/MediaPickerLibraryGrid'
import { MediaPickerLibraryToolbar } from '@/components/media/MediaPickerLibraryToolbar'
import { MediaPickerMetaPanel } from '@/components/media/MediaPickerMetaPanel'
import { MediaPickerModalHeader } from '@/components/media/MediaPickerModalHeader'
import { useMediaPickerAssetActions } from '@/components/media/use-media-picker-asset-actions'
import { useMediaPickerLibrary } from '@/components/media/use-media-picker-library'
import { useMediaPickerMeta } from '@/components/media/use-media-picker-meta'
import { useMediaPickerOutsideClick } from '@/components/media/use-media-picker-outside-click'
import { useMediaPickerSelection } from '@/components/media/use-media-picker-selection'
import { useMediaPickerUpload } from '@/components/media/use-media-picker-upload'
import { MEDIA_TOAST_ERRORS } from '@/lib/config/media-toast-errors.config'
import { useCloudAttach } from '@/lib/hooks/use-cloud-attach'
import { useWorkspaceSettingsModal } from '@/lib/settings/workspace-settings-modal-context'

export function MediaPickerModal({
  open,
  onClose,
  onSelect,
  onSelectAsset,
  onSelectAssets,
  campaignId,
  multiSelect = false,
  initialMediaSource = 'library',
  onUploadedUrl,
  onUploadedAsset,
  adAccountId = null,
  onSelectDriveFile,
  onSelectDropboxFile: _onSelectDropboxFile,
  keepOpenAfterImport = false,
}: MediaPickerModalProps) {
  const [mediaSource, setMediaSource] = useState<MediaSource>('library')

  const library = useMediaPickerLibrary({ campaignId })
  const {
    assets,
    setAssets,
    setTotal,
    loading,
    loadingMore,
    search,
    setSearch,
    campaignFilter,
    setCampaignFilter,
    typeFilter,
    setTypeFilter,
    isPillsExpanded,
    setIsPillsExpanded,
    scopeDropdownOpen,
    setScopeDropdownOpen,
    gridRef,
    loadAssets,
    handleScroll,
    filteredAssets,
    skeletons,
  } = library

  const upload = useMediaPickerUpload({ campaignId, loadAssets, onUploadedAsset, onUploadedUrl })
  const {
    uploading,
    fileInputRef,
    uploadMenuOpen,
    setUploadMenuOpen,
    uploadBtnRef,
    showUrlModal,
    setShowUrlModal,
    handleFileChange,
    handleFileFromCloud,
  } = upload

  const { metaImages, metaImagesLoading } = useMediaPickerMeta({
    open,
    mediaSource,
    adAccountId,
  })

  const { selectedIds, resetSelection, toggleSelect, handleConfirm } = useMediaPickerSelection({
    multiSelect,
    assets,
    onSelect,
    onSelectAsset,
    onSelectAssets,
    onClose,
    keepOpenAfterImport,
  })

  const assetActions = useMediaPickerAssetActions({ setAssets, setTotal })
  const {
    menuAssetId,
    setMenuAssetId,
    renameAssetId,
    setRenameAssetId,
    renameName,
    setRenameName,
    menuRef,
    handleRename,
    handleDelete,
  } = assetActions

  useMediaPickerOutsideClick({
    menuAssetId,
    uploadMenuOpen,
    scopeDropdownOpen,
    menuRef,
    uploadBtnRef,
    onCloseMenu: () => setMenuAssetId(null),
    onCloseUploadMenu: () => setUploadMenuOpen(false),
    onCloseScopeDropdown: () => setScopeDropdownOpen(false),
  })

  useEffect(() => {
    if (!open) return
    resetSelection()
    setMediaSource(initialMediaSource)
    void loadAssets(0)
  }, [open, initialMediaSource, loadAssets, resetSelection])

  const { openWorkspaceSettings } = useWorkspaceSettingsModal()

  const connectAction = useMemo(
    () => ({
      label: 'Connect now',
      onClick: () => {
        onClose()
        openWorkspaceSettings('integrations')
      },
    }),
    [onClose, openWorkspaceSettings],
  )

  const {
    showDrivePicker,
    setShowDrivePicker,
    showDropboxPicker,
    setShowDropboxPicker,
    openDrive,
    openDropbox,
  } = useCloudAttach({
    behavior: 'toast_if_disconnected',
    onDriveDisconnectedToast: MEDIA_TOAST_ERRORS.CLOUD_DRIVE_CONNECT_FIRST.userMessage,
    onDropboxDisconnectedToast: MEDIA_TOAST_ERRORS.CLOUD_DROPBOX_CONNECT_FIRST.userMessage,
    onDriveStatusErrorToast: MEDIA_TOAST_ERRORS.DRIVE_STATUS_CHECK_FAILED.userMessage,
    onDropboxStatusErrorToast: MEDIA_TOAST_ERRORS.DROPBOX_STATUS_CHECK_FAILED.userMessage,
    onDriveDisconnectedAction: connectAction,
    onDropboxDisconnectedAction: connectAction,
  })

  return (
    <>
      <DialogPrimitive.Root
        open={open}
        onOpenChange={(o) => {
          if (!o) onClose()
        }}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="z-modal-backdrop fixed inset-0" />
          <DialogPrimitive.Content className="z-modal-layer-3 sm:p-spacing-4 md:p-spacing-6 fixed inset-0 flex items-center justify-center overflow-hidden p-2">
            <VisuallyHidden.Root>
              <DialogPrimitive.Title>Media Library</DialogPrimitive.Title>
              <DialogPrimitive.Description>
                Browse, upload, and manage campaign media assets.
              </DialogPrimitive.Description>
            </VisuallyHidden.Root>
            <div className="relative h-full w-full max-w-none sm:h-[85vh] sm:max-h-[85vh] sm:max-w-5xl">
              <div className="surface-card card-elevated rounded-spacing-4 wizard-container-border flex h-full flex-col overflow-hidden">
                <MediaPickerModalHeader
                  onClose={onClose}
                  adAccountId={adAccountId}
                  mediaSource={mediaSource}
                  setMediaSource={setMediaSource}
                />

                {mediaSource === 'library' && (
                  <MediaPickerLibraryToolbar
                    search={search}
                    setSearch={setSearch}
                    typeFilter={typeFilter}
                    setTypeFilter={setTypeFilter}
                    campaignFilter={campaignFilter}
                    setCampaignFilter={setCampaignFilter}
                    isPillsExpanded={isPillsExpanded}
                    setIsPillsExpanded={setIsPillsExpanded}
                    scopeDropdownOpen={scopeDropdownOpen}
                    setScopeDropdownOpen={setScopeDropdownOpen}
                    uploading={uploading}
                    uploadMenuOpen={uploadMenuOpen}
                    setUploadMenuOpen={setUploadMenuOpen}
                    fileInputRef={fileInputRef}
                    uploadBtnRef={uploadBtnRef}
                    onFileChange={handleFileChange}
                    openDrive={openDrive}
                    openDropbox={openDropbox}
                    onOpenUrlModal={() => setShowUrlModal(true)}
                  />
                )}

                <div
                  ref={gridRef}
                  onScroll={mediaSource === 'library' ? handleScroll : undefined}
                  className="px-spacing-6 py-spacing-3 flex-1 overflow-y-auto"
                >
                  {mediaSource === 'google_drive' && (
                    <MediaPickerGoogleDrivePanel onBrowse={() => setShowDrivePicker(true)} />
                  )}
                  {mediaSource === 'dropbox' && (
                    <MediaPickerDropboxPanel onBrowse={() => setShowDropboxPicker(true)} />
                  )}
                  {mediaSource === 'meta' && (
                    <MediaPickerMetaPanel
                      metaImagesLoading={metaImagesLoading}
                      metaImages={metaImages}
                      onSelectUrl={onSelect}
                      onClose={onClose}
                    />
                  )}
                  {mediaSource === 'library' && (
                    <MediaPickerLibraryGrid
                      loading={loading}
                      filteredAssets={filteredAssets}
                      typeFilter={typeFilter}
                      loadingMore={loadingMore}
                      skeletons={skeletons}
                      selectedIds={selectedIds}
                      multiSelect={multiSelect}
                      menuAssetId={menuAssetId}
                      renameAssetId={renameAssetId}
                      renameName={renameName}
                      menuRef={menuRef}
                      setRenameName={setRenameName}
                      toggleSelect={toggleSelect}
                      onSelectAsset={onSelectAsset}
                      onSelect={onSelect}
                      onClose={onClose}
                      setMenuAssetId={setMenuAssetId}
                      setRenameAssetId={setRenameAssetId}
                      handleRename={handleRename}
                      handleDelete={handleDelete}
                    />
                  )}
                </div>

                <div className="px-spacing-6 py-spacing-4 border-border flex items-center justify-between border-t">
                  {selectedIds.size > 0 ? (
                    <p className="body-3 text-muted-foreground">{selectedIds.size} selected</p>
                  ) : (
                    <div />
                  )}
                  <div className="gap-spacing-2 flex items-center">
                    <button
                      type="button"
                      onClick={onClose}
                      className="button-glass-neutral hover:bg-hover-subtle hover:text-foreground rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirm}
                      disabled={selectedIds.size === 0}
                      className="button-glass-accent rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
                    >
                      {multiSelect && selectedIds.size > 1
                        ? `Add ${selectedIds.size} items`
                        : 'Select'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <DriveFileBrowserModal
        open={showDrivePicker}
        onClose={() => setShowDrivePicker(false)}
        campaignId={campaignId}
        context={onSelectDriveFile ? 'ad_creative' : 'media_library'}
        onSelectFileForChat={handleFileFromCloud}
        onSelectDriveFile={
          onSelectDriveFile
            ? (file) => {
                onSelectDriveFile(file)
                setShowDrivePicker(false)
                onClose()
              }
            : undefined
        }
      />
      <DropboxFileBrowserModal
        open={showDropboxPicker}
        onClose={() => setShowDropboxPicker(false)}
        campaignId={campaignId}
        context="media_library"
        onSelectFileForChat={handleFileFromCloud}
      />
      <AddFromUrlModal
        open={showUrlModal}
        onClose={() => setShowUrlModal(false)}
        campaignId={campaignId}
        onUploaded={() => void loadAssets(0)}
      />
    </>
  )
}
