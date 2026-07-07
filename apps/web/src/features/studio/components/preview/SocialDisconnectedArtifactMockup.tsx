'use client'

import { BarChart3, Instagram, Linkedin, MousePointer2 } from 'lucide-react'
import type { SocialAnalyticsPlatform } from '../../services/analytics.service'

/** Decorative empty-state illustration for Spaces social reporting (per artifact-view mockup style). */
export function SocialDisconnectedArtifactMockup({
  platform,
}: {
  platform: SocialAnalyticsPlatform
}) {
  return platform === 'instagram' ? (
    <InstagramSocialDisconnectedMockup />
  ) : (
    <LinkedInSocialDisconnectedMockup />
  )
}

function InstagramSocialDisconnectedMockup() {
  return (
    <div aria-hidden className="h-spacing-48 w-spacing-80 relative select-none">
      <div className="h-spacing-32 w-spacing-32 bg-muted-foreground absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-5 blur-3xl" />

      <div className="card-glass right-spacing-10 top-spacing-12 gap-spacing-2 p-spacing-2 h-spacing-32 w-spacing-36 absolute flex rotate-6 flex-col opacity-35 shadow-lg">
        <div className="gap-spacing-1 flex justify-between">
          <div className="bg-muted-foreground h-spacing-8 w-spacing-8 rounded-spacing-1 opacity-15" />
          <div className="gap-spacing-1 flex flex-1 flex-col justify-center">
            <div className="bg-muted-foreground h-spacing-1 w-full rounded-full opacity-20" />
            <div className="bg-muted-foreground h-spacing-1 w-4/5 rounded-full opacity-15" />
          </div>
        </div>
        <div className="gap-spacing-1 mt-auto flex items-end">
          {[40, 65, 45, 80, 55].map((h, i) => (
            <div
              key={i}
              className="bg-muted-foreground w-spacing-2 rounded-spacing-1 opacity-20"
              style={{ height: `${h}px` }}
            />
          ))}
        </div>
      </div>

      <div className="card-glass top-spacing-4 h-spacing-36 w-spacing-48 absolute left-1/2 flex -translate-x-1/2 rotate-1 flex-col overflow-hidden p-0 shadow-2xl">
        <div className="h-spacing-8 gap-spacing-2 border-border bg-muted px-spacing-3 flex shrink-0 items-center border-b opacity-90">
          <div className="border-border bg-secondary rounded-spacing-2 flex size-10 shrink-0 items-center justify-center border">
            <Instagram className="icon-sm text-muted-foreground opacity-80" />
          </div>
          <div className="gap-spacing-1 flex min-w-0 flex-1 flex-col justify-center">
            <div className="bg-muted-foreground h-spacing-2 w-4/5 rounded-full opacity-25" />
            <div className="bg-muted-foreground h-spacing-2 w-3/5 rounded-full opacity-15" />
          </div>
          <BarChart3 className="icon-xs text-muted-foreground shrink-0 opacity-35" />
        </div>

        <div className="gap-spacing-3 p-spacing-3 flex min-h-0 flex-1 flex-col">
          <div className="gap-spacing-2 rounded-spacing-2 border-border bg-secondary p-spacing-2 flex flex-1 flex-col justify-end border">
            <div className="gap-spacing-1 px-spacing-1 pt-spacing-2 flex items-end justify-between">
              {[32, 48, 28, 56, 40, 64].map((h, i) => (
                <div
                  key={i}
                  className="bg-muted-foreground w-spacing-2 rounded-spacing-1 opacity-25"
                  style={{ height: `${h}px` }}
                />
              ))}
            </div>
            <div className="bg-muted-foreground h-spacing-1 mt-spacing-2 w-full rounded-full opacity-15" />
          </div>
        </div>

        <div className="bottom-spacing-3 right-spacing-8 absolute rotate-12">
          <MousePointer2 className="icon-sm text-muted-foreground opacity-70 drop-shadow-md" />
        </div>
      </div>
    </div>
  )
}

function LinkedInSocialDisconnectedMockup() {
  return (
    <div aria-hidden className="h-spacing-48 w-spacing-80 relative select-none">
      <div className="h-spacing-32 w-spacing-32 bg-muted-foreground absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-5 blur-3xl" />

      <div className="card-glass left-spacing-8 top-spacing-14 gap-spacing-2 p-spacing-2 h-spacing-24 w-spacing-36 absolute flex -rotate-6 flex-col opacity-35 shadow-lg">
        <div className="bg-muted-foreground h-spacing-1 w-full rounded-full opacity-15" />
        <div className="bg-muted-foreground h-spacing-1 w-5/6 rounded-full opacity-15" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="gap-spacing-1 mt-spacing-1 flex items-center">
            <div className="border-border bg-secondary h-spacing-4 w-spacing-4 rounded-spacing-1 shrink-0 border" />
            <div className="gap-spacing-1 flex min-w-0 flex-1 flex-col">
              <div className="bg-muted-foreground h-spacing-1 w-full rounded-full opacity-15" />
              <div className="bg-muted-foreground h-spacing-1 w-2/3 rounded-full opacity-10" />
            </div>
          </div>
        ))}
      </div>

      <div className="card-glass top-spacing-4 h-spacing-36 w-spacing-48 absolute left-1/2 flex -translate-x-1/2 -rotate-1 flex-col overflow-hidden p-0 shadow-2xl">
        <div className="h-spacing-8 gap-spacing-2 border-border bg-muted px-spacing-3 flex shrink-0 items-center border-b opacity-90">
          <div className="border-border bg-secondary rounded-spacing-2 flex size-10 shrink-0 items-center justify-center border">
            <Linkedin className="icon-sm text-muted-foreground opacity-80" />
          </div>
          <div className="gap-spacing-1 flex min-w-0 flex-1 flex-col justify-center">
            <div className="bg-muted-foreground h-spacing-2 w-3/4 rounded-full opacity-25" />
            <div className="bg-muted-foreground h-spacing-2 w-1/2 rounded-full opacity-15" />
          </div>
        </div>

        <div className="gap-spacing-2 p-spacing-3 flex flex-1 flex-col">
          <div className="rounded-spacing-1 border-border bg-secondary gap-spacing-1 p-spacing-2 flex flex-1 flex-col border">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="gap-spacing-2 flex items-center">
                <div className="bg-muted-foreground h-spacing-1 w-1/4 rounded-full opacity-15" />
                <div className="bg-muted-foreground h-spacing-1 opacity-12 flex-1 rounded-full" />
                <div className="bg-muted-foreground h-spacing-1 w-spacing-8 rounded-full opacity-15" />
              </div>
            ))}
          </div>
          <div className="gap-spacing-2 pt-spacing-1 flex items-end justify-between">
            <div className="bg-muted-foreground h-spacing-6 rounded-spacing-1 w-2/5 opacity-15" />
            <div className="gap-spacing-1 flex items-end">
              {[36, 52, 44, 60].map((h, i) => (
                <div
                  key={i}
                  className="bg-muted-foreground w-spacing-2 rounded-spacing-1 opacity-20"
                  style={{ height: `${h}px` }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="bottom-spacing-3 right-spacing-10 absolute rotate-12">
          <MousePointer2 className="icon-sm text-muted-foreground opacity-70 drop-shadow-md" />
        </div>
      </div>
    </div>
  )
}
