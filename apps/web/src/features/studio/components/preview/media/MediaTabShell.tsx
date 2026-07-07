import type { Dispatch, DragEvent, MutableRefObject, ReactNode, SetStateAction } from 'react'
import { Upload } from 'lucide-react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import type { MediaAsset } from '@/lib/services/media-api'
import type { CampaignDeliverable } from '../../../services/artifact-preview.service'
import type { ConversationDocument } from '../../../types'
import { BulkDeleteArtifactModal } from '../artifacts/modals/BulkDeleteArtifactModal'
import type { LinkRow, MediaGridTab, MediaViewMode, Selection } from './media-tab.types'
import { MediaGridView } from './MediaGridView'
import { MediaListSections } from './MediaListSections'
import { MediaTabBulkActionBar } from './MediaTabBulkActionBar'
import { MediaTabSelectionPreview } from './MediaTabSelectionPreview'

interface MediaTabShellProps {
  campaignId: string
  mobilePreviewMode?: boolean
  isMobile: boolean
  selection: Selection
  setSelection: (selection: Selection) => void
  headerBar: ReactNode
  pickerModal: ReactNode
  loading: boolean
  viewMode: MediaViewMode
  activeGridTab: MediaGridTab
  setActiveGridTab: (tab: MediaGridTab) => void
  nonImageDocs: ConversationDocument[]
  groupedDocs: Record<string, ConversationDocument[]>
  images: MediaAsset[]
  videos: MediaAsset[]
  audios: MediaAsset[]
  fileAssets: MediaAsset[]
  filteredDeliverables: CampaignDeliverable[]
  filteredLinkRows: LinkRow[]
  docsError: string | null
  assetsError: string | null
  deliverablesError: string | null
  docsCollapsed: boolean
  setDocsCollapsed: Dispatch<SetStateAction<boolean>>
  imagesCollapsed: boolean
  setImagesCollapsed: Dispatch<SetStateAction<boolean>>
  videosCollapsed: boolean
  setVideosCollapsed: Dispatch<SetStateAction<boolean>>
  filesCollapsed: boolean
  setFilesCollapsed: Dispatch<SetStateAction<boolean>>
  docsExpanded: Set<string>
  setDocsExpanded: Dispatch<SetStateAction<Set<string>>>
  imagesExpanded: boolean
  setImagesExpanded: Dispatch<SetStateAction<boolean>>
  videosExpanded: boolean
  setVideosExpanded: Dispatch<SetStateAction<boolean>>
  filesExpanded: boolean
  setFilesExpanded: Dispatch<SetStateAction<boolean>>
  menuOpenId: string | null
  setMenuOpenId: (id: string | null) => void
  editingId: string | null
  setEditingId: (id: string | null) => void
  menuBtnRef: MutableRefObject<HTMLButtonElement | null>
  handleRenameDoc: (doc: ConversationDocument) => void
  handleDeleteDoc: (doc: ConversationDocument) => Promise<void>
  handleConfirmRenameDoc: (id: string, title: string) => Promise<void>
  handleRenameAsset: (asset: MediaAsset) => void
  handleDeleteAsset: (asset: MediaAsset) => Promise<void>
  handleConfirmRenameAsset: (id: string, name: string) => Promise<void>
  bulkSelectMode: boolean
  bulkSelectedCount: number
  bulkSelectedIds: Set<string>
  onToggleBulkSelectItem: (
    id: string,
    entry: { kind: 'asset' | 'doc'; asset?: MediaAsset; doc?: ConversationDocument },
  ) => void
  onOpenBulkDeleteModal: () => void
  showBulkDeleteModal: boolean
  onCloseBulkDeleteModal: () => void
  onConfirmBulkDelete: () => Promise<void>
  isBulkDeleting: boolean
  bulkDeleteError: string | null
  dragOver: boolean
  uploading: boolean
  onDragEnter: (event: DragEvent<HTMLDivElement>) => void
  onDragLeave: (event: DragEvent<HTMLDivElement>) => void
  onDragOver: (event: DragEvent<HTMLDivElement>) => void
  onDrop: (event: DragEvent<HTMLDivElement>) => void
}

export function MediaTabShell({
  campaignId,
  mobilePreviewMode,
  isMobile,
  selection,
  setSelection,
  headerBar,
  pickerModal,
  loading,
  viewMode,
  activeGridTab,
  setActiveGridTab,
  nonImageDocs,
  groupedDocs,
  images,
  videos,
  audios,
  fileAssets,
  filteredDeliverables,
  filteredLinkRows,
  docsError,
  assetsError,
  deliverablesError,
  docsCollapsed,
  setDocsCollapsed,
  imagesCollapsed,
  setImagesCollapsed,
  videosCollapsed,
  setVideosCollapsed,
  filesCollapsed,
  setFilesCollapsed,
  docsExpanded,
  setDocsExpanded,
  imagesExpanded,
  setImagesExpanded,
  videosExpanded,
  setVideosExpanded,
  filesExpanded,
  setFilesExpanded,
  menuOpenId,
  setMenuOpenId,
  editingId,
  setEditingId,
  menuBtnRef,
  handleRenameDoc,
  handleDeleteDoc,
  handleConfirmRenameDoc,
  handleRenameAsset,
  handleDeleteAsset,
  handleConfirmRenameAsset,
  bulkSelectMode,
  bulkSelectedCount,
  bulkSelectedIds,
  onToggleBulkSelectItem,
  onOpenBulkDeleteModal,
  showBulkDeleteModal,
  onCloseBulkDeleteModal,
  onConfirmBulkDelete,
  isBulkDeleting,
  bulkDeleteError,
  dragOver,
  uploading,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
}: MediaTabShellProps) {
  const bulkActionBar = (
    <MediaTabBulkActionBar selectedCount={bulkSelectedCount} onDelete={onOpenBulkDeleteModal} />
  )
  const bulkDeleteModal = (
    <BulkDeleteArtifactModal
      open={showBulkDeleteModal}
      onClose={onCloseBulkDeleteModal}
      count={bulkSelectedCount}
      onConfirm={onConfirmBulkDelete}
      isDeleting={isBulkDeleting}
      errorMessage={bulkDeleteError}
    />
  )
  const listSections = (compact = false) => (
    <MediaListSections
      docs={nonImageDocs}
      groupedDocs={groupedDocs}
      images={images}
      videos={videos}
      fileAssets={fileAssets}
      linkRows={filteredLinkRows}
      selection={selection}
      setSelection={setSelection}
      docsCollapsed={docsCollapsed}
      setDocsCollapsed={setDocsCollapsed}
      imagesCollapsed={imagesCollapsed}
      setImagesCollapsed={setImagesCollapsed}
      videosCollapsed={videosCollapsed}
      setVideosCollapsed={setVideosCollapsed}
      filesCollapsed={filesCollapsed}
      setFilesCollapsed={setFilesCollapsed}
      docsExpanded={docsExpanded}
      setDocsExpanded={setDocsExpanded}
      imagesExpanded={imagesExpanded}
      setImagesExpanded={setImagesExpanded}
      videosExpanded={videosExpanded}
      setVideosExpanded={setVideosExpanded}
      filesExpanded={filesExpanded}
      setFilesExpanded={setFilesExpanded}
      menuOpenId={menuOpenId}
      setMenuOpenId={setMenuOpenId}
      editingId={editingId}
      setEditingId={setEditingId}
      menuBtnRef={menuBtnRef}
      handleRenameDoc={handleRenameDoc}
      handleDeleteDoc={handleDeleteDoc}
      handleConfirmRenameDoc={handleConfirmRenameDoc}
      handleRenameAsset={handleRenameAsset}
      handleDeleteAsset={handleDeleteAsset}
      handleConfirmRenameAsset={handleConfirmRenameAsset}
      docsError={docsError}
      assetsError={assetsError}
      deliverables={filteredDeliverables}
      deliverablesError={deliverablesError}
      compact={compact}
      bulkSelectMode={bulkSelectMode}
      bulkSelectedIds={bulkSelectedIds}
      onToggleBulkSelectItem={onToggleBulkSelectItem}
    />
  )

  if (isMobile && mobilePreviewMode && selection) {
    return <MediaTabSelectionPreview selection={selection} campaignId={campaignId} />
  }

  if (isMobile && !mobilePreviewMode) {
    return (
      <>
        <div className="flex h-full flex-col overflow-y-auto">
          {headerBar}
          <div className="p-spacing-2 flex-1 overflow-y-auto">
            {loading ? (
              <div className="py-spacing-8 flex items-center justify-center">
                <VibeyLoadingOrb size="sm" text="Loading..." />
              </div>
            ) : (
              listSections(true)
            )}
          </div>
          {bulkActionBar}
        </div>
        {pickerModal}
        {bulkDeleteModal}
      </>
    )
  }

  return (
    <div
      data-dropzone
      className="card-glass rounded-spacing-4 relative flex h-full overflow-hidden"
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {(dragOver || uploading) && (
        <div className="rounded-spacing-4 border-primary/50 bg-primary/5 absolute inset-0 z-50 flex flex-col items-center justify-center border-2 border-dashed">
          {uploading ? (
            <VibeyLoadingOrb size="sm" text="Uploading..." />
          ) : (
            <>
              <Upload className="text-primary/60 mb-spacing-2 h-spacing-8 w-spacing-8" />
              <p className="body-2 text-foreground font-medium">Drop files to upload</p>
              <p className="body-3 text-muted-foreground mt-spacing-1">
                Images, videos, or documents
              </p>
            </>
          )}
        </div>
      )}

      <div
        className={`card-glass-panel flex flex-shrink-0 flex-col overflow-hidden transition-all duration-500 ease-in-out ${
          selection ? 'border-r-glass w-spacing-72' : 'w-full'
        }`}
      >
        {headerBar}
        <div className="p-spacing-2 flex-1 overflow-y-auto">
          {loading ? (
            <div className="py-spacing-8 flex items-center justify-center">
              <VibeyLoadingOrb size="sm" text="Loading..." />
            </div>
          ) : viewMode === 'grid' ? (
            <MediaGridView
              docs={nonImageDocs}
              groupedDocs={groupedDocs}
              images={images}
              videos={videos}
              audios={audios}
              fileAssets={fileAssets}
              linkRows={filteredLinkRows}
              selection={selection}
              setSelection={setSelection}
              activeGridTab={activeGridTab}
              setActiveGridTab={setActiveGridTab}
              menuOpenId={menuOpenId}
              setMenuOpenId={setMenuOpenId}
              editingId={editingId}
              setEditingId={setEditingId}
              menuBtnRef={menuBtnRef}
              handleRenameDoc={handleRenameDoc}
              handleDeleteDoc={handleDeleteDoc}
              handleConfirmRenameDoc={handleConfirmRenameDoc}
              handleRenameAsset={handleRenameAsset}
              handleDeleteAsset={handleDeleteAsset}
              handleConfirmRenameAsset={handleConfirmRenameAsset}
              docsError={docsError}
              assetsError={assetsError}
              deliverables={filteredDeliverables}
              deliverablesError={deliverablesError}
              bulkSelectMode={bulkSelectMode}
              bulkSelectedIds={bulkSelectedIds}
              onToggleBulkSelectItem={onToggleBulkSelectItem}
            />
          ) : (
            listSections()
          )}
        </div>
        {bulkActionBar}
      </div>

      <div
        className={`flex flex-col overflow-hidden transition-all duration-500 ease-in-out ${
          selection ? 'flex-1 opacity-100' : 'shrink-0 grow-0 basis-0 opacity-0'
        }`}
      >
        {selection && (
          <MediaTabSelectionPreview
            selection={selection}
            campaignId={campaignId}
            onClose={() => setSelection(null)}
          />
        )}
      </div>

      {pickerModal}
      {bulkDeleteModal}
    </div>
  )
}
