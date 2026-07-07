'use client'

import { Telescope } from 'lucide-react'

export function IgResearchEmptyMockup() {
  return (
    <div aria-hidden className="relative h-48 w-80 select-none">
      <div className="h-spacing-32 w-spacing-32 bg-muted-foreground absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-5 blur-3xl" />

      <div className="card-glass left-spacing-10 top-spacing-14 h-spacing-32 w-spacing-36 gap-spacing-1 p-spacing-2 absolute flex -rotate-6 flex-col opacity-40 shadow-lg">
        <div className="gap-spacing-1 grid shrink-0 grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-spacing-7 rounded-spacing-1 border-border bg-secondary border"
            />
          ))}
        </div>
      </div>

      <div className="card-glass top-spacing-4 absolute left-1/2 flex h-44 w-56 -translate-x-1/2 rotate-1 flex-col overflow-hidden p-0 shadow-2xl">
        <div className="h-spacing-6 gap-spacing-2 border-border bg-muted px-spacing-3 flex shrink-0 items-center border-b opacity-90">
          <Telescope className="icon-xs text-muted-foreground shrink-0 opacity-45" />
          <div className="h-spacing-2 bg-muted-foreground min-w-0 flex-1 rounded-full opacity-20" />
        </div>
        <div className="gap-spacing-2 p-spacing-3 flex min-h-0 flex-1">
          <div className="rounded-spacing-2 border-border bg-secondary w-2/5 shrink-0 border" />
          <div className="gap-spacing-2 flex min-w-0 flex-1 flex-col justify-center">
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
    </div>
  )
}
