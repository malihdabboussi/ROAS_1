'use client'

import type { ReactNode } from 'react'
import { Image as ImageIcon, MousePointer2, Play } from 'lucide-react'
import type { MediaAssetTypePick } from '../../types/space-schema'

/**
 * Depth composition: secondary image card + video hints framing the center image hero.
 * Used for “all types” and image-only empty states so standalone image matches the combo look.
 */
function MediaEmptyMockupTriptych() {
  return (
    <div aria-hidden className="relative h-52 w-80 select-none">
      <div className="h-spacing-36 w-spacing-36 bg-muted-foreground absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-5 blur-3xl" />

      {/* Back left — secondary image card */}
      <div className="card-glass left-spacing-2 top-spacing-20 -rotate-10 opacity-38 absolute flex h-28 w-24 flex-col overflow-hidden p-0 shadow-lg">
        <div className="h-spacing-4 border-border bg-muted px-spacing-2 gap-spacing-1 flex shrink-0 items-center border-b opacity-90">
          <ImageIcon className="icon-xs text-muted-foreground opacity-40" />
        </div>
        <div className="rounded-spacing-2 border-border bg-secondary m-spacing-1 flex flex-1 items-center justify-center border">
          <div className="rounded-spacing-1 from-muted-foreground/22 via-secondary to-muted-foreground/12 h-full w-full bg-gradient-to-br opacity-85" />
        </div>
      </div>

      {/* Back right — video strip */}
      <div className="card-glass right-spacing-2 top-spacing-22 gap-spacing-1 p-spacing-2 h-spacing-24 w-spacing-24 opacity-36 absolute flex rotate-12 flex-col shadow-lg">
        <div className="rounded-spacing-1 border-border bg-secondary flex aspect-video w-full items-center justify-center border">
          <Play className="icon-xs text-muted-foreground opacity-45" />
        </div>
        <div className="bg-muted-foreground h-spacing-1 opacity-12 w-full rounded-full" />
      </div>

      {/* Center — image card */}
      <div className="card-glass top-spacing-4 absolute left-1/2 flex h-44 w-44 -translate-x-1/2 rotate-2 flex-col overflow-hidden p-0 shadow-2xl">
        <div className="h-spacing-5 border-border bg-muted px-spacing-2 gap-spacing-2 flex shrink-0 items-center border-b opacity-90">
          <ImageIcon className="icon-xs text-muted-foreground opacity-45" />
          <div className="bg-muted-foreground h-spacing-2 opacity-18 flex-1 rounded-full" />
        </div>
        <div className="gap-spacing-2 bg-muted p-spacing-2 flex flex-1 flex-col">
          <div className="rounded-spacing-2 border-border bg-secondary relative flex flex-1 items-center justify-center overflow-hidden border">
            <div className="rounded-spacing-1 inset-spacing-2 from-muted-foreground/28 via-secondary to-muted-foreground/12 absolute bg-gradient-to-br opacity-85" />
            <div className="animate-shimmer rounded-spacing-1 absolute inset-0 z-10 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>
          <div className="bg-muted-foreground h-spacing-1 opacity-14 w-3/4 rounded-full" />
        </div>
        <div className="bottom-spacing-3 right-spacing-4 absolute z-20 rotate-12">
          <MousePointer2 className="icon-sm text-foreground opacity-85 drop-shadow-lg" />
        </div>
      </div>
    </div>
  )
}

/** Image-only filter: same framed hero as the combined mockup (triptych depth). */
export function MediaEmptyMockupImage() {
  return <MediaEmptyMockupTriptych />
}

/** Clip mockup — browser chrome + film strip + play affordance (AdEmptyMockup / funnel chrome). */
export function MediaEmptyMockupVideo() {
  return (
    <div aria-hidden className="relative h-48 w-80 select-none">
      <div className="h-spacing-32 w-spacing-32 bg-muted-foreground absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-5 blur-3xl" />

      <div className="card-glass left-spacing-10 top-spacing-16 gap-spacing-1 p-spacing-2 -rotate-8 opacity-38 absolute flex h-24 w-40 flex-col shadow-lg">
        <div className="gap-spacing-1 flex">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-spacing-1 border-border bg-secondary h-spacing-10 flex-1 border"
            />
          ))}
        </div>
        <div className="bg-muted-foreground h-spacing-1 opacity-12 w-full rounded-full" />
      </div>

      <div className="card-glass top-spacing-4 absolute left-1/2 flex h-40 w-56 -translate-x-1/2 rotate-1 flex-col overflow-hidden p-0 shadow-2xl">
        <div className="h-spacing-6 gap-spacing-2 border-border bg-muted px-spacing-2 flex shrink-0 items-center border-b opacity-90">
          <div className="gap-spacing-1 flex">
            <div className="bg-muted-foreground h-spacing-1 w-spacing-1 opacity-22 rounded-full" />
            <div className="bg-muted-foreground h-spacing-1 w-spacing-1 opacity-22 rounded-full" />
            <div className="bg-muted-foreground h-spacing-1 w-spacing-1 opacity-22 rounded-full" />
          </div>
          <div className="bg-muted-foreground h-spacing-2 ml-auto w-1/4 rounded-full opacity-15" />
        </div>
        <div className="bg-muted relative flex flex-1 items-center justify-center">
          <div className="rounded-spacing-2 border-border bg-secondary relative mx-auto flex aspect-video w-11/12 max-w-full items-center justify-center border shadow-inner">
            <div className="border-border bg-background/90 h-spacing-14 w-spacing-14 flex items-center justify-center rounded-full border opacity-95 shadow-md">
              <Play className="icon-md text-muted-foreground opacity-55" fill="currentColor" />
            </div>
            <div className="animate-shimmer rounded-spacing-2 via-white/8 absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent to-transparent" />
          </div>
          <div className="bottom-spacing-2 left-spacing-3 right-spacing-3 bg-muted-foreground h-spacing-1 opacity-12 absolute z-10 rounded-full" />
        </div>
        <div className="bottom-spacing-3 right-spacing-5 absolute z-20 rotate-12">
          <MousePointer2 className="icon-sm text-muted-foreground opacity-75 drop-shadow-md" />
        </div>
      </div>
    </div>
  )
}

/** Triple hero — same triptych as image-only (shared composition). */
export function MediaEmptyMockupAllTypes() {
  return <MediaEmptyMockupTriptych />
}

export type MediaEmptyCopy = { title: string; description: string }

export function resolveMediaEmptyState(filters: MediaAssetTypePick[]): {
  mockup: ReactNode
  copy: MediaEmptyCopy
} {
  const uniq = [...new Set(filters)]
  const count = uniq.length

  if (count === 0 || count === 2) {
    return {
      mockup: <MediaEmptyMockupAllTypes />,
      copy: {
        title: 'No media in this space yet',
        description:
          'Describe an image above to generate, or upload from the toolbar — I’ll keep files organized here.',
      },
    }
  }

  if (count === 1) {
    const t = uniq[0]
    if (t === 'image') {
      return {
        mockup: <MediaEmptyMockupImage />,
        copy: {
          title: 'No images yet',
          description:
            'Describe an image above to generate, or upload stills — I’ll tile them in this view.',
        },
      }
    }
    return {
      mockup: <MediaEmptyMockupVideo />,
      copy: {
        title: 'No videos yet',
        description: 'Upload clips or generate motion — I’ll surface thumbnails and playback here.',
      },
    }
  }

  return {
    mockup: <MediaEmptyMockupAllTypes />,
    copy: {
      title: 'No media in this space yet',
      description:
        'Describe an image above to generate, or upload from the toolbar — I’ll keep files organized here.',
    },
  }
}
