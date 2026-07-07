'use client'

import { useState } from 'react'
import { ChevronDown, Download, Loader2, Plus } from 'lucide-react'
import { DriveFileBrowserModal } from '@/components/media/DriveFileBrowserModal'
import { DropboxFileBrowserModal } from '@/components/media/DropboxFileBrowserModal'
import { MediaPickerModal } from '@/components/media/MediaPickerModal'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/navigation/tabs'
import { FathomImportModal } from './fathom-import-modal'
import { FirefliesImportModal } from './fireflies-import-modal'
import type { InputMode, UserAddInfoPanelProps } from './types'
import { useUserAddInfoFathomFireflies } from './use-user-add-info-fathom-fireflies'
import { useUserAddInfoFileImport } from './use-user-add-info-file-import'
import { useUserAddInfoForm } from './use-user-add-info-form'
import { useUserAddInfoImportMenu } from './use-user-add-info-import-menu'
import { UserAddInfoImageTab } from './user-add-info-image-tab'
import { UserAddInfoImportDropdownPortal } from './user-add-info-import-dropdown-portal'
import { UserAddInfoLinkTab } from './user-add-info-link-tab'
import { UserAddInfoTextTab } from './user-add-info-text-tab'

export default function UserAddInfoPanel({ visible }: UserAddInfoPanelProps) {
  const [open, setOpen] = useState(false)
  const [mediaLibraryOpen, setMediaLibraryOpen] = useState(false)

  const { fileInputRef, importingFile, toBase64, handleCloudFile, handleMediaLibrarySelect } =
    useUserAddInfoFileImport()

  const importMenu = useUserAddInfoImportMenu()

  const meetings = useUserAddInfoFathomFireflies()

  const form = useUserAddInfoForm(visible, setOpen, open, handleCloudFile, toBase64)

  if (!visible) return null

  return (
    <div className="relative flex flex-col items-end">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="surface-card border-border px-spacing-3 py-spacing-2 body-3 text-foreground hover:bg-muted/20 mb-spacing-1 hidden items-center gap-2 rounded-lg border font-medium transition-colors md:flex"
      >
        <Plus className="icon-xs" />
        Add Information
        <ChevronDown
          className={`icon-xs text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}
      <div
        className="surface-card border-border w-[340px] rounded-lg border max-md:fixed max-md:inset-x-4 max-md:top-1/2 max-md:z-50 max-md:w-auto max-md:-translate-y-1/2 max-md:shadow-2xl"
        style={{
          maxHeight: open ? '520px' : '0px',
          opacity: open ? 1 : 0,
          overflow: open ? 'visible' : 'hidden',
          transition: 'max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease',
          pointerEvents: open ? 'auto' : 'none',
        }}
      >
        <div className="px-spacing-3 py-spacing-3 space-y-spacing-2">
          <p className="body-3 text-foreground font-semibold">Add Information</p>

          <Tabs
            value={form.inputMode}
            onValueChange={(v) => form.setInputMode(v as InputMode)}
            className="space-y-spacing-2"
          >
            <div className="gap-spacing-2 flex items-center">
              <TabsList variant="full">
                <TabsTrigger value="text" className="px-spacing-3">
                  Text
                </TabsTrigger>
                <TabsTrigger value="link" className="px-spacing-3">
                  Link
                </TabsTrigger>
                <TabsTrigger value="image" className="px-spacing-3">
                  Image
                </TabsTrigger>
              </TabsList>
              <div className="relative">
                <button
                  ref={importMenu.importBtnRef}
                  type="button"
                  onClick={() => importMenu.setImportDropdownOpen((p) => !p)}
                  className="button-glass-neutral gap-spacing-1 px-spacing-2 body-4 flex h-9 items-center rounded-lg font-medium"
                >
                  <Download className="icon-xs" />
                  Import
                  <ChevronDown className="icon-xs text-muted-foreground" />
                </button>
                <UserAddInfoImportDropdownPortal
                  open={importMenu.importDropdownOpen}
                  position={importMenu.importDropdownPos}
                  fathomConnected={importMenu.fathomConnected}
                  firefliesConnected={importMenu.firefliesConnected}
                  onLocalUpload={() => fileInputRef.current?.click()}
                  onDrive={importMenu.openDrive}
                  onDropbox={importMenu.openDropbox}
                  onCloseAfterSelect={() => importMenu.setImportDropdownOpen(false)}
                  onOpenFathom={() => {
                    importMenu.setImportDropdownOpen(false)
                    meetings.setFathomModalOpen(true)
                  }}
                  onOpenFireflies={() => {
                    importMenu.setImportDropdownOpen(false)
                    meetings.setFirefliesModalOpen(true)
                  }}
                  onOpenMediaLibrary={() => {
                    importMenu.setImportDropdownOpen(false)
                    setMediaLibraryOpen(true)
                  }}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".txt,.md,.skill,.csv,.json,.xml,.yaml,.yml,.pdf,.docx,.doc,.pptx,.xls,.xlsx,.xlsm,.png,.jpg,.jpeg,.webp,.gif,.bmp,.tif,.tiff,.heic,.heif,.mp3,.wav,.mp4,.mov"
                  onChange={form.handleFileUpload}
                />
              </div>
            </div>

            <div className="max-h-[400px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
              <UserAddInfoTextTab
                title={form.title}
                onTitleChange={form.setTitle}
                textAreaRef={form.textAreaRef}
                textInputValue={form.textInputValue}
                textContent={form.textContent}
                onTextChange={form.setTextContent}
                recordingState={form.recordingState}
                rememberingText={form.rememberingText}
                onRememberText={() => void form.handleRememberText()}
                onStartRecording={form.handleStartRecording}
                onStopRecording={form.handleStopRecording}
                onCancelRecording={form.handleCancelRecording}
                onTranscriptionUpdate={form.handleTranscriptionUpdate}
                onTranscriptionComplete={form.handleTranscriptionComplete}
                onRecorderError={() => {
                  form.setRecordingState('idle')
                  form.setShouldTranscribe(false)
                  const restore = form.baseTextRef.current
                  form.setDisplayText(restore)
                  form.setTextContent(restore)
                }}
              />
              <UserAddInfoLinkTab
                linkUrl={form.linkUrl}
                onLinkUrlChange={form.setLinkUrl}
                linkDetection={form.linkDetection}
                rememberingLink={form.rememberingLink}
                onRememberLink={() => void form.handleRememberLink()}
              />
              <UserAddInfoImageTab
                imagePreview={form.imagePreview}
                imageCaption={form.imageCaption}
                onImageCaptionChange={form.setImageCaption}
                imageDragOver={form.imageDragOver}
                onImageDragOver={form.setImageDragOver}
                onPickImageClick={() => form.imageInputRef.current?.click()}
                onImageDrop={(file) => void form.handleImageFile(file)}
                imageInputRef={form.imageInputRef}
                onImageFileSelected={(file) => void form.handleImageFile(file)}
                rememberingImage={form.rememberingImage}
                imageBase64={form.imageBase64}
                onRememberImage={() => void form.handleRememberImage()}
              />
            </div>
          </Tabs>

          {importingFile && (
            <div className="body-4 text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Importing file...
            </div>
          )}
        </div>
      </div>

      <DriveFileBrowserModal
        open={importMenu.showDrivePicker}
        onClose={() => importMenu.setShowDrivePicker(false)}
        context="brain"
        onSelectFileForChat={(file) => void handleCloudFile(file, 'google_drive')}
        keepOpenAfterImport
      />
      <DropboxFileBrowserModal
        open={importMenu.showDropboxPicker}
        onClose={() => importMenu.setShowDropboxPicker(false)}
        context="brain"
        onSelectFileForChat={(file) => void handleCloudFile(file, 'dropbox')}
        keepOpenAfterImport
      />
      <MediaPickerModal
        open={mediaLibraryOpen}
        onClose={() => setMediaLibraryOpen(false)}
        onSelect={() => {}}
        onSelectAssets={(assets) => void handleMediaLibrarySelect(assets)}
        multiSelect
        keepOpenAfterImport
      />

      <FathomImportModal
        open={meetings.fathomModalOpen}
        onOpenChange={meetings.setFathomModalOpen}
        loadingFathom={meetings.loadingFathom}
        sortedFathom={meetings.sortedFathom}
        selectedFathomIds={meetings.selectedFathomIds}
        setSelectedFathomIds={meetings.setSelectedFathomIds}
        toggleFathomSelection={meetings.toggleFathomSelection}
        getMeetingId={meetings.getMeetingId}
        fathomNextCursor={meetings.fathomNextCursor}
        loadingMoreFathom={meetings.loadingMoreFathom}
        onLoadMore={() => void meetings.loadMoreFathomMeetings()}
        onLoadAll={() => void meetings.loadAllFathomMeetings()}
        importingBatch={meetings.importingBatch}
        onBatchImport={() => void meetings.handleBatchImportFathom()}
      />

      <FirefliesImportModal
        open={meetings.firefliesModalOpen}
        onOpenChange={meetings.setFirefliesModalOpen}
        loadingFireflies={meetings.loadingFireflies}
        firefliesTranscripts={meetings.firefliesTranscripts}
        importingMeetingId={meetings.importingMeetingId}
        setImportingMeetingId={meetings.setImportingMeetingId}
      />
    </div>
  )
}
