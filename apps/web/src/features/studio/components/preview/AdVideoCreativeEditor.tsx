import type { RefObject } from 'react'
import { Film, Image as ImageIcon, RefreshCw, Trash2 } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/navigation/tabs'
import type { Ad } from '../../types'
import { SettingsField, type FieldState } from './ad-settings-panel-primitives'

export type VideoPlacement = 'feed' | 'story' | 'reels'
export type VideoPickerTarget = 'default' | VideoPlacement

interface PlacementVideo {
  video_url?: string
  from_library?: boolean
}

const VIDEO_PLACEMENTS: VideoPlacement[] = ['feed', 'story', 'reels']

interface AdVideoCreativeEditorProps {
  ad: Ad
  fieldState?: FieldState
  perPlacement: boolean
  activePlacement: VideoPlacement
  videoMenuOpen: boolean
  videoMenuRef: RefObject<HTMLButtonElement | null>
  onTogglePerPlacement: (enabled: boolean) => void
  onSetActivePlacement: (placement: VideoPlacement) => void
  onToggleVideoMenu: () => void
  onClearCurrentVideo: () => void
  onPasteVideoUrl: (videoUrl: string | null) => void
  onOpenLibrary: (target: VideoPickerTarget) => void
}

function VideoPlacementTabs({
  activePlacement,
  placementVideos,
  onSetActivePlacement,
}: {
  activePlacement: VideoPlacement
  placementVideos?: Record<string, PlacementVideo>
  onSetActivePlacement: (placement: VideoPlacement) => void
}) {
  return (
    <Tabs
      value={activePlacement}
      onValueChange={(value) => onSetActivePlacement(value as VideoPlacement)}
    >
      <TabsList variant="liquid">
        {VIDEO_PLACEMENTS.map((placement) => {
          const hasUrl = !!placementVideos?.[placement]?.video_url
          return (
            <TabsTrigger key={placement} value={placement} className="capitalize">
              {placement}
              {hasUrl && (
                <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-success" />
              )}
            </TabsTrigger>
          )
        })}
      </TabsList>
    </Tabs>
  )
}

function VideoPlacementRecommendation({ placement }: { placement: VideoPlacement }) {
  return (
    <p className="typo-caption text-muted-foreground">
      {placement === 'feed'
        ? 'Recommended: 1080 × 1080 (1:1)'
        : 'Recommended: 1080 × 1920 (9:16)'}
    </p>
  )
}

export function AdVideoCreativeEditor({
  ad,
  fieldState,
  perPlacement,
  activePlacement,
  videoMenuOpen,
  videoMenuRef,
  onTogglePerPlacement,
  onSetActivePlacement,
  onToggleVideoMenu,
  onClearCurrentVideo,
  onPasteVideoUrl,
  onOpenLibrary,
}: AdVideoCreativeEditorProps) {
  const placementVideos = ad.metadata?.placement_videos as
    | Record<string, PlacementVideo>
    | undefined
  const currentVideoUrl = perPlacement
    ? (placementVideos?.[activePlacement]?.video_url ?? '')
    : (ad.video_url ?? '')
  const videoFromLibrary = perPlacement
    ? !!placementVideos?.[activePlacement]?.from_library
    : !!(ad.metadata?.video_from_library as boolean | undefined)
  const hasVideoFromLibrary = !!currentVideoUrl && videoFromLibrary
  const hasNoVideo = !currentVideoUrl
  const libraryTarget = perPlacement ? activePlacement : 'default'
  const placementTabs = perPlacement ? (
    <VideoPlacementTabs
      activePlacement={activePlacement}
      placementVideos={placementVideos}
      onSetActivePlacement={onSetActivePlacement}
    />
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
        <span className="typo-caption text-muted-foreground">Different video per placement</span>
      </label>

      {hasVideoFromLibrary ? (
        <div className="space-y-2">
          {placementTabs}
          <div className="group relative h-36 w-36 overflow-hidden rounded-lg bg-background">
            <video src={currentVideoUrl} className="h-full w-full object-cover" muted playsInline />
            <div
              className={`absolute inset-0 flex items-center justify-center bg-modal-overlay p-2 transition-opacity ${videoMenuOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100'}`}
            >
              <div className="bg-background/90 flex items-center gap-1.5 rounded-lg p-1 shadow-sm">
                <button
                  ref={videoMenuOpen ? videoMenuRef : undefined}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    onToggleVideoMenu()
                  }}
                  className="text-muted-foreground hover:text-foreground flex h-8 w-8 items-center justify-center rounded-full transition-colors"
                  title="Change video"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={onClearCurrentVideo}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-destructive transition-colors hover:bg-destructive/10"
                  title="Remove"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
          {perPlacement && <VideoPlacementRecommendation placement={activePlacement} />}
        </div>
      ) : hasNoVideo ? (
        <div className="space-y-2">
          {placementTabs}
          <div className="border-muted-foreground/40 bg-secondary/50 flex h-36 w-36 items-center justify-center overflow-hidden rounded-lg border border-dashed">
            <button
              type="button"
              onClick={() => onOpenLibrary(libraryTarget)}
              className="flex flex-col items-center gap-1.5 text-center"
            >
              <Film className="text-muted-foreground/30 h-8 w-8" />
              <span className="typo-caption text-muted-foreground">
                {perPlacement ? `No ${activePlacement} video` : 'From library'}
              </span>
            </button>
          </div>
          {perPlacement && <VideoPlacementRecommendation placement={activePlacement} />}
          <div className="flex items-center gap-1.5">
            <span className="typo-caption text-muted-foreground">or paste URL</span>
            <input
              type="url"
              value=""
              onChange={(event) => onPasteVideoUrl(event.target.value || null)}
              className="input-glass body-3 py-spacing-2 min-w-0 flex-1"
              placeholder="https://example.com/video.mp4"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {placementTabs}
          <label className="typo-caption text-muted-foreground block font-medium">Video URL</label>
          <div className="flex items-center gap-1.5">
            <input
              type="url"
              value={currentVideoUrl}
              onChange={(event) => onPasteVideoUrl(event.target.value || null)}
              className="input-glass body-3 py-spacing-2 min-w-0 flex-1"
              placeholder="https://example.com/video.mp4"
            />
            <button
              type="button"
              onClick={() => onOpenLibrary(libraryTarget)}
              className="button-glass-blue body-3 px-spacing-3 py-spacing-2 flex shrink-0 items-center gap-1.5 rounded-lg font-medium"
            >
              <ImageIcon className="h-3 w-3" />
              From library
            </button>
          </div>
          <p className="typo-caption text-muted-foreground">Direct link to an MP4 or MOV file</p>
        </div>
      )}
    </SettingsField>
  )
}
