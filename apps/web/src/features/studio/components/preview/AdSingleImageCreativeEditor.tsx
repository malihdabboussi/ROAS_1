import type { RefObject } from 'react'
import { HardDrive, Image as ImageIcon, Library, RefreshCw, Sparkles, Trash2 } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/navigation/tabs'
import type { Ad } from '../../types'
import { SettingsField, type FieldState } from './ad-settings-panel-primitives'

export const GENERATED_TSX_BACKUP_META_KEY = 'generated_tsx_backup'
export const PLACEMENT_TSX_BACKUPS_META_KEY = 'placement_tsx_backups'

export type ImagePlacement = 'feed' | 'story' | 'reels'

const IMAGE_PLACEMENTS: ImagePlacement[] = ['feed', 'story', 'reels']

interface AdSingleImageCreativeEditorProps {
  ad: Ad
  fieldState?: FieldState
  perPlacement: boolean
  activePlacement: ImagePlacement
  driveFileId: string | null
  drivePreviewUrl: string | null
  imageMenuOpen: boolean
  imageMenuTriggerRef: RefObject<HTMLButtonElement | null>
  onTogglePerPlacement: (enabled: boolean) => void
  onSetActivePlacement: (placement: ImagePlacement) => void
  onToggleImageMenu: () => void
  onOpenLibrary: () => void
  onOpenUpload: () => void
  onUploadFile: (file: File) => void
  onRemove: () => void
  onRestoreGeneratedDesign: () => void
  onRestorePlacementDesign: (placement: ImagePlacement) => void
  onRequestRegenerate: (imageUrl: string | null) => void
}

export function AdSingleImageCreativeEditor({
  ad,
  fieldState,
  perPlacement,
  activePlacement,
  driveFileId,
  drivePreviewUrl,
  imageMenuOpen,
  imageMenuTriggerRef,
  onTogglePerPlacement,
  onSetActivePlacement,
  onToggleImageMenu,
  onOpenLibrary,
  onOpenUpload,
  onUploadFile,
  onRemove,
  onRestoreGeneratedDesign,
  onRestorePlacementDesign,
  onRequestRegenerate,
}: AdSingleImageCreativeEditorProps) {
  const currentUrl = perPlacement
    ? (ad.placement_images?.[activePlacement]?.image_url ?? null)
    : (ad.image_url ?? (driveFileId ? drivePreviewUrl : null))
  const placementTsxActive = perPlacement && (ad.placement_tsx?.[activePlacement]?.trim() ?? '')
  const hasMedia = Boolean(
    currentUrl ||
      (!perPlacement && ad.generated_tsx) ||
      (perPlacement && placementTsxActive) ||
      driveFileId,
  )
  const isVideoCreative = Boolean(currentUrl?.match(/\.(mp4|mov|webm)(\?|$)/i))
  const metaRecord =
    ad.metadata && typeof ad.metadata === 'object'
      ? (ad.metadata as Record<string, unknown>)
      : {}
  const rootBackupStored = metaRecord[GENERATED_TSX_BACKUP_META_KEY]
  const hasRootDesignRestore =
    typeof rootBackupStored === 'string' && rootBackupStored.trim().length > 0
  const placementBackupsRaw = metaRecord[PLACEMENT_TSX_BACKUPS_META_KEY]
  const placementBackupsObj =
    typeof placementBackupsRaw === 'object' && placementBackupsRaw !== null
      ? (placementBackupsRaw as Record<string, string>)
      : null
  const hasPlacementDesignRestore = Boolean(
    perPlacement && placementBackupsObj?.[activePlacement]?.trim().length,
  )
  const showGeneratedDesignPlaceholder =
    !currentUrl &&
    !driveFileId &&
    ((!perPlacement && !!ad.generated_tsx?.trim()) || (perPlacement && !!placementTsxActive))

  const placementTabs = perPlacement ? (
    <Tabs value={activePlacement} onValueChange={(value) => onSetActivePlacement(value as ImagePlacement)}>
      <TabsList variant="liquid">
        {IMAGE_PLACEMENTS.map((placement) => {
          const hasPlacementCreative =
            !!ad.placement_images?.[placement]?.image_url ||
            !!ad.placement_tsx?.[placement]?.trim()
          return (
            <TabsTrigger key={placement} value={placement} className="capitalize">
              {placement}
              {hasPlacementCreative && (
                <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-success" />
              )}
            </TabsTrigger>
          )
        })}
      </TabsList>
    </Tabs>
  ) : null

  return (
    <SettingsField fieldState={fieldState}>
      <label className="mb-2 flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={perPlacement}
          onChange={(event) => onTogglePerPlacement(event.target.checked)}
          className="checkbox-glass-primary"
        />
        <span className="typo-caption text-muted-foreground">Different image per placement</span>
      </label>

      {hasMedia ? (
        <div className="space-y-2">
          {placementTabs}
          <div className="border-border group relative h-36 w-36 overflow-hidden rounded-lg border">
            {showGeneratedDesignPlaceholder ? (
              <button
                type="button"
                onClick={onOpenLibrary}
                onDragOver={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                }}
                onDrop={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  const file = event.dataTransfer.files?.[0]
                  if (file) onUploadFile(file)
                }}
                className="border-muted-foreground/40 bg-secondary/50 flex h-full w-full flex-col items-center justify-center gap-1.5 border border-dashed text-center"
              >
                <Library className="text-muted-foreground/60 h-7 w-7" />
                <span className="typo-caption text-muted-foreground">From library</span>
              </button>
            ) : driveFileId && !currentUrl ? (
              <div className="bg-secondary flex h-full w-full items-center justify-center gap-2">
                <HardDrive className="text-muted-foreground h-5 w-5" />
                <span className="typo-caption text-muted-foreground">
                  {(ad.metadata?.drive_file_name as string) || 'Google Drive'}
                </span>
              </div>
            ) : isVideoCreative ? (
              <video src={currentUrl!} controls className="h-full w-full object-cover" />
            ) : currentUrl ? (
              <img src={currentUrl} alt="Ad creative" className="h-full w-full object-cover" />
            ) : null}
            {currentUrl && !driveFileId && !isVideoCreative && (
              <div
                className={`absolute inset-0 flex items-center justify-center bg-modal-overlay p-2 transition-opacity ${imageMenuOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100'}`}
              >
                <div className="bg-background/90 flex flex-wrap items-center justify-center gap-1.5 rounded-lg p-1 shadow-sm">
                  {(hasRootDesignRestore || hasPlacementDesignRestore) && (
                    <button
                      type="button"
                      onClick={() => {
                        if (perPlacement && hasPlacementDesignRestore) {
                          onRestorePlacementDesign(activePlacement)
                        } else if (!perPlacement && hasRootDesignRestore) {
                          onRestoreGeneratedDesign()
                        }
                      }}
                      className="text-muted-foreground hover:bg-hover-subtle hover:text-foreground typo-caption rounded-full px-2 py-1 transition-colors"
                      title="Restore the generated design"
                    >
                      Generated design
                    </button>
                  )}
                  <button
                    ref={imageMenuTriggerRef}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      onToggleImageMenu()
                    }}
                    className="text-muted-foreground hover:text-foreground flex h-8 w-8 items-center justify-center rounded-full transition-colors"
                    title="Change image"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={onRemove}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-destructive transition-colors hover:bg-destructive/10"
                    title="Remove"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
          {perPlacement && (
            <p className="typo-caption text-muted-foreground">
              {activePlacement === 'feed'
                ? 'Recommended: 1080 × 1080 (1:1)'
                : 'Recommended: 1080 × 1920 (9:16)'}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {placementTabs}
          <div
            className="border-border bg-secondary/50 flex aspect-video flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-3"
            onDragOver={(event) => {
              event.preventDefault()
              event.stopPropagation()
            }}
            onDrop={(event) => {
              event.preventDefault()
              event.stopPropagation()
              const file = event.dataTransfer.files?.[0]
              if (file) onUploadFile(file)
            }}
          >
            <button
              type="button"
              onClick={onOpenLibrary}
              className="flex flex-col items-center gap-1.5 text-center"
            >
              <ImageIcon className="text-muted-foreground/30 h-8 w-8" />
              <p className="typo-caption text-muted-foreground">
                {perPlacement ? `No ${activePlacement} image — uses default` : 'No creative set'}
              </p>
              <span className="typo-caption text-primary font-medium">Choose from library</span>
            </button>
            <span className="typo-caption text-muted-foreground">or drop an image</span>
            <button
              type="button"
              onClick={onOpenUpload}
              className="button-glass-neutral typo-caption rounded-md px-2 py-1 font-medium"
            >
              Upload file
            </button>
          </div>
          {perPlacement && (
            <p className="typo-caption text-muted-foreground">
              {activePlacement === 'feed'
                ? 'Recommended: 1080 × 1080 (1:1)'
                : 'Recommended: 1080 × 1920 (9:16)'}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => onRequestRegenerate(currentUrl ?? null)}
              className="bg-secondary text-muted-foreground hover:text-foreground flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors"
            >
              <Sparkles className="h-3 w-3" />
              Regenerate
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="bg-secondary flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
            >
              <Trash2 className="h-3 w-3" />
              Remove
            </button>
          </div>
        </div>
      )}
    </SettingsField>
  )
}
