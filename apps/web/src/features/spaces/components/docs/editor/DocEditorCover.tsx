'use client'

import type { RefObject } from 'react'
import { cn } from '@/lib/utils/cn'
import type { SpaceItem } from '../../../types'
import { CoverDropdown } from '../cover/CoverDropdown'

export function DocEditorCover({
  docCoverUrl,
  docShowCover,
  inline,
  coverContainerRef,
  coverRepositioning,
  setCoverRepositioning,
  coverFocalY,
  handleCoverDragStart,
  handleCoverDragMove,
  handleCoverDragEnd,
  coverDropdownOpen,
  setCoverDropdownOpen,
  coverDropdownRef,
  coverHeroChangeBtnRef,
  onCoverUploadClick,
  onCoverLibraryOpen,
  onCoverGenerateOpen,
  handleUpdateField,
  item,
  coverDropdownPlacementClassName,
}: {
  docCoverUrl: string | null
  docShowCover: boolean
  inline: boolean
  coverContainerRef: RefObject<HTMLDivElement | null>
  coverRepositioning: boolean
  setCoverRepositioning: (v: boolean) => void
  coverFocalY: number
  handleCoverDragStart: (e: React.PointerEvent) => void
  handleCoverDragMove: (e: React.PointerEvent) => void
  handleCoverDragEnd: () => void
  coverDropdownOpen: boolean
  setCoverDropdownOpen: (v: boolean | ((p: boolean) => boolean)) => void
  coverDropdownRef: RefObject<HTMLDivElement | null>
  coverHeroChangeBtnRef: RefObject<HTMLButtonElement | null>
  onCoverUploadClick: () => void
  onCoverLibraryOpen: () => void
  onCoverGenerateOpen: () => void
  handleUpdateField: (patch: Partial<SpaceItem>) => void | Promise<void>
  item: SpaceItem
  /** e.g. bottom-full for hero vs default for title row */
  coverDropdownPlacementClassName?: string
}) {
  if (!docCoverUrl || !docShowCover) return null

  return (
    <div
      ref={coverContainerRef}
      className={cn(
        'group/cover relative h-48 w-full shrink-0 overflow-hidden border-b border-[var(--border)]',
        inline && 'rounded-xl',
        coverRepositioning && 'cursor-grab active:cursor-grabbing',
      )}
      onPointerDown={(e) => {
        if (!coverRepositioning) return
        handleCoverDragStart(e)
      }}
      onPointerMove={coverRepositioning ? handleCoverDragMove : undefined}
      onPointerUp={coverRepositioning ? handleCoverDragEnd : undefined}
      onPointerCancel={coverRepositioning ? handleCoverDragEnd : undefined}
    >
      <img
        src={docCoverUrl}
        alt=""
        className="pointer-events-none h-full w-full select-none object-cover"
        style={{ objectPosition: `center ${coverFocalY}%` }}
        draggable={false}
      />
      <div
        className={cn(
          'pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 to-transparent transition-opacity',
          coverRepositioning && 'opacity-60',
        )}
        aria-hidden
      />

      {coverRepositioning && (
        <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center">
          <span className="rounded-md bg-black/60 px-3 py-1.5 text-[11px] font-medium text-white">
            Drag to reposition
          </span>
        </div>
      )}

      {!coverRepositioning && (
        <div className="absolute inset-0 flex items-end justify-end gap-2 p-2 opacity-0 transition-opacity group-hover/cover:opacity-100">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setCoverRepositioning(true)
            }}
            className="pointer-events-auto rounded-md bg-black/50 px-2 py-1 text-[10px] font-medium text-white hover:bg-black/70"
          >
            Reposition
          </button>
          <div className="pointer-events-auto relative">
            <button
              ref={coverHeroChangeBtnRef}
              type="button"
              onClick={() => setCoverDropdownOpen((o) => !o)}
              className="rounded-md bg-black/50 px-2 py-1 text-[10px] font-medium text-white hover:bg-black/70"
            >
              Change cover
            </button>
            {coverDropdownOpen && (
              <CoverDropdown
                ref={coverDropdownRef}
                className={coverDropdownPlacementClassName ?? 'bottom-full right-0 mb-1'}
                onUpload={() => {
                  setCoverDropdownOpen(false)
                  onCoverUploadClick()
                }}
                onLibrary={() => {
                  setCoverDropdownOpen(false)
                  onCoverLibraryOpen()
                }}
                onGenerate={() => {
                  setCoverDropdownOpen(false)
                  onCoverGenerateOpen()
                }}
              />
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              const cd = { ...(item.custom_data ?? {}) } as Record<string, unknown>
              delete cd._doc_cover_url
              void handleUpdateField({ custom_data: cd })
            }}
            className="pointer-events-auto rounded-md bg-black/50 px-2 py-1 text-[10px] font-medium text-white hover:bg-red-500/80"
          >
            Remove
          </button>
        </div>
      )}
    </div>
  )
}
