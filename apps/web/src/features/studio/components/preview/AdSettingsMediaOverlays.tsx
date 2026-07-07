import { createPortal } from 'react-dom'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Image as ImageIcon, RefreshCw, X } from 'lucide-react'
import { MediaPickerModal } from '@/components/media/MediaPickerModal'
import type { MediaAsset } from '@/lib/services/media-api'

type MenuPosition = {
  top: number
  left: number
}

type DriveFileSelection = {
  id: string
  name: string
  mimeType?: string
}

interface AdSettingsMediaOverlaysProps {
  mediaPickerOpen: boolean
  carouselCardMenuOpen: number | null
  carouselCardMenuPos: MenuPosition
  videoMenuOpen: boolean
  videoMenuPos: MenuPosition
  imageMenuOpen: boolean
  imageMenuPos: MenuPosition
  selectPostModalOpen: boolean
  existingPostId: string
  adAccountId?: string
  onMediaPickerClose: () => void
  onSelectMediaUrl: (url: string) => void
  onSelectMediaAsset: (asset: MediaAsset) => void
  onSelectDriveFile: (file: DriveFileSelection) => void
  onRegenerateCarouselCard: () => void
  onOpenCarouselCardLibraryFromMenu: () => void
  onRegenerateCurrentVideo: () => void
  onOpenVideoLibraryFromMenu: () => void
  onRegenerateCurrentImage: () => void
  onOpenImageLibraryFromMenu: () => void
  onSetExistingPostId: (value: string) => void
  onSaveExistingPostId: () => void
  onCloseSelectPostModal: () => void
}

export function AdSettingsMediaOverlays({
  mediaPickerOpen,
  carouselCardMenuOpen,
  carouselCardMenuPos,
  videoMenuOpen,
  videoMenuPos,
  imageMenuOpen,
  imageMenuPos,
  selectPostModalOpen,
  existingPostId,
  adAccountId,
  onMediaPickerClose,
  onSelectMediaUrl,
  onSelectMediaAsset,
  onSelectDriveFile,
  onRegenerateCarouselCard,
  onOpenCarouselCardLibraryFromMenu,
  onRegenerateCurrentVideo,
  onOpenVideoLibraryFromMenu,
  onRegenerateCurrentImage,
  onOpenImageLibraryFromMenu,
  onSetExistingPostId,
  onSaveExistingPostId,
  onCloseSelectPostModal,
}: AdSettingsMediaOverlaysProps) {
  return (
    <>
      <MediaPickerModal
        open={mediaPickerOpen}
        onClose={onMediaPickerClose}
        onSelect={onSelectMediaUrl}
        onSelectAsset={onSelectMediaAsset}
        adAccountId={adAccountId}
        onSelectDriveFile={onSelectDriveFile}
      />

      {carouselCardMenuOpen !== null &&
        createPortal(
          <div
            data-carousel-card-menu-dropdown
            className="z-dropdown border-border surface-card fixed w-44 rounded-lg border py-1 shadow-lg"
            style={{
              top: carouselCardMenuPos.top,
              left: carouselCardMenuPos.left,
            }}
          >
            <button
              type="button"
              onClick={onRegenerateCarouselCard}
              className="text-muted-foreground hover:bg-secondary hover:text-foreground flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              Regenerate
            </button>
            <button
              type="button"
              onClick={onOpenCarouselCardLibraryFromMenu}
              className="text-muted-foreground hover:bg-secondary hover:text-foreground flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors"
            >
              <ImageIcon className="h-3 w-3" />
              Replace from library
            </button>
          </div>,
          document.body,
        )}

      {videoMenuOpen &&
        createPortal(
          <div
            data-video-menu-dropdown
            className="z-dropdown border-border surface-card fixed w-44 rounded-lg border py-1 shadow-lg"
            style={{ top: videoMenuPos.top, left: videoMenuPos.left }}
          >
            <button
              type="button"
              onClick={onRegenerateCurrentVideo}
              className="text-muted-foreground hover:bg-secondary hover:text-foreground flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              Regenerate
            </button>
            <button
              type="button"
              onClick={onOpenVideoLibraryFromMenu}
              className="text-muted-foreground hover:bg-secondary hover:text-foreground flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors"
            >
              <ImageIcon className="h-3 w-3" />
              Replace from library
            </button>
          </div>,
          document.body,
        )}

      {imageMenuOpen &&
        createPortal(
          <div
            data-image-menu-dropdown
            className="z-dropdown border-border surface-card fixed w-44 rounded-lg border py-1 shadow-lg"
            style={{ top: imageMenuPos.top, left: imageMenuPos.left }}
          >
            <button
              type="button"
              onClick={onRegenerateCurrentImage}
              className="text-muted-foreground hover:bg-secondary hover:text-foreground flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              Regenerate
            </button>
            <button
              type="button"
              onClick={onOpenImageLibraryFromMenu}
              className="text-muted-foreground hover:bg-secondary hover:text-foreground flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors"
            >
              <ImageIcon className="h-3 w-3" />
              Replace from library
            </button>
          </div>,
          document.body,
        )}

      <DialogPrimitive.Root
        open={selectPostModalOpen}
        onOpenChange={(open) => {
          if (!open) onCloseSelectPostModal()
        }}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="z-modal-backdrop bg-modal-overlay fixed inset-0" />
          <DialogPrimitive.Content
            className="rounded-spacing-2 border-border bg-card p-spacing-5 z-modal-layer-3 fixed left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 border shadow-lg outline-none"
            onPointerDownOutside={onCloseSelectPostModal}
            onEscapeKeyDown={onCloseSelectPostModal}
          >
            <div className="mb-4 flex items-center justify-between">
              <DialogPrimitive.Title className="body-2 text-foreground font-semibold">
                Select a post
              </DialogPrimitive.Title>
              <DialogPrimitive.Close asChild>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground p-1 transition-colors"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </DialogPrimitive.Close>
            </div>
            <p className="typo-caption text-muted-foreground mb-3">
              Enter the post ID from Meta Business Suite or paste the ID below.
            </p>
            <input
              type="text"
              value={existingPostId}
              onChange={(event) => onSetExistingPostId(event.target.value)}
              onBlur={onSaveExistingPostId}
              className="input-glass body-3 w-full"
              placeholder="e.g. 17844493467652524"
            />
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={onCloseSelectPostModal}
                className="button-glass-primary body-3 rounded-spacing-2 px-3 py-1.5 font-medium"
              >
                Done
              </button>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  )
}
