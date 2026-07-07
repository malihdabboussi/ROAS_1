'use client'

import { Bookmark, Megaphone } from 'lucide-react'
import type { AdsResearchPlatform } from '../../services/ads-research.service'

type AdResearchEmptyMockupVariant = AdsResearchPlatform | 'saved'

function SearchEmptyMockup() {
  return (
    <div aria-hidden className="relative h-48 w-80 select-none">
      <div className="h-spacing-32 w-spacing-32 bg-muted-foreground absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-5 blur-3xl" />

      <div className="card-glass left-spacing-10 top-spacing-14 h-spacing-32 w-spacing-36 gap-spacing-2 p-spacing-2 absolute flex -rotate-6 flex-col justify-center opacity-40 shadow-lg">
        <div className="bg-muted-foreground h-1.5 w-full rounded-full opacity-20" />
        <div className="bg-muted-foreground h-1.5 w-4/5 rounded-full opacity-15" />
        <div className="bg-primary h-2 w-2/3 rounded-full opacity-30" />
      </div>

      <div className="card-glass top-spacing-4 absolute left-1/2 flex h-44 w-56 -translate-x-1/2 rotate-1 flex-col overflow-hidden p-0 shadow-2xl">
        <div className="h-spacing-6 gap-spacing-2 border-border bg-muted px-spacing-3 flex shrink-0 items-center border-b opacity-90">
          <Megaphone className="icon-xs text-muted-foreground shrink-0 opacity-45" />
          <div className="bg-muted-foreground h-spacing-2 min-w-0 flex-1 rounded-full opacity-20" />
        </div>
        <div className="gap-spacing-2 p-spacing-3 flex min-h-0 flex-1 flex-col justify-center">
          <div className="h-spacing-1.5 bg-muted-foreground w-full rounded-full opacity-25" />
          <div className="h-spacing-1 bg-muted-foreground w-4/5 rounded-full opacity-15" />
          <div className="h-spacing-1 bg-muted-foreground w-3/5 rounded-full opacity-15" />
          <div className="gap-spacing-2 mt-auto flex flex-col">
            <div className="h-spacing-2 bg-primary w-full rounded-full opacity-40" />
            <div className="gap-spacing-2 flex">
              <div className="h-spacing-2 w-spacing-10 bg-muted-foreground rounded-full opacity-15" />
              <div className="h-spacing-2 w-spacing-10 bg-muted-foreground rounded-full opacity-15" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SavedAdsEmptyMockup() {
  return (
    <div aria-hidden className="relative h-48 w-80 select-none">
      <div className="h-spacing-32 w-spacing-32 bg-muted-foreground absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-5 blur-3xl" />

      <div className="card-glass left-spacing-12 top-spacing-16 h-spacing-28 w-spacing-32 gap-spacing-2 p-spacing-2 absolute flex -rotate-6 flex-col justify-center opacity-35 shadow-lg">
        <div className="bg-muted-foreground h-1.5 w-full rounded-full opacity-15" />
        <div className="bg-muted-foreground h-1.5 w-3/4 rounded-full opacity-10" />
      </div>

      <div className="card-glass top-spacing-6 absolute left-1/2 flex h-40 w-52 -translate-x-1/2 rotate-1 flex-col overflow-hidden p-0 shadow-2xl">
        <div className="h-spacing-6 gap-spacing-2 border-border bg-muted px-spacing-3 flex shrink-0 items-center border-b opacity-90">
          <Bookmark className="icon-xs text-muted-foreground shrink-0 opacity-45" />
          <div className="bg-muted-foreground h-spacing-2 min-w-0 flex-1 rounded-full opacity-20" />
        </div>
        <div className="gap-spacing-2 p-spacing-3 flex min-h-0 flex-1 flex-col justify-center">
          <div className="h-spacing-1.5 bg-muted-foreground w-full rounded-full opacity-20" />
          <div className="h-spacing-1 bg-muted-foreground w-4/5 rounded-full opacity-15" />
          <div className="h-spacing-1 bg-muted-foreground w-2/3 rounded-full opacity-15" />
        </div>
      </div>
    </div>
  )
}

export function AdResearchEmptyMockup({ variant }: { variant: AdResearchEmptyMockupVariant }) {
  if (variant === 'saved') return <SavedAdsEmptyMockup />
  return <SearchEmptyMockup />
}
