'use client'

import { LayoutTemplate, MousePointer2, SlidersHorizontal, Type } from 'lucide-react'

/** Empty-state illustration for presentation Design mode in the chat rail. */
export function PresentationDesignEmptyMockup() {
  return (
    <div aria-hidden className="relative mx-auto h-44 w-full max-w-[260px] select-none">
      <div className="h-spacing-32 w-spacing-32 bg-primary absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.07] blur-3xl" />

      <div className="card-glass left-spacing-1 top-spacing-6 gap-spacing-1.5 p-spacing-2 w-spacing-16 absolute flex h-32 -rotate-2 flex-col shadow-lg">
        <div className="gap-spacing-1 border-border pb-spacing-1 flex items-center border-b">
          <Type className="icon-xs text-primary shrink-0 opacity-70" />
          <div className="bg-muted-foreground h-spacing-1 min-w-0 flex-1 rounded-full opacity-20" />
        </div>
        <div className="gap-spacing-1 flex flex-col">
          <div className="bg-muted-foreground h-spacing-1 w-full rounded-full opacity-15" />
          <div className="bg-muted-foreground h-spacing-1 w-4/5 rounded-full opacity-15" />
          <div className="bg-secondary mt-spacing-1 h-spacing-1 w-full overflow-hidden rounded-full">
            <div className="bg-primary h-full w-2/5 rounded-full opacity-50" />
          </div>
        </div>
        <div className="gap-spacing-1 mt-auto flex flex-col">
          <SlidersHorizontal className="icon-xs text-muted-foreground opacity-40" />
          <div className="bg-muted-foreground h-spacing-1 opacity-12 w-full rounded-full" />
          <div className="bg-muted-foreground h-spacing-1 opacity-12 w-3/4 rounded-full" />
        </div>
      </div>

      <div className="card-glass right-spacing-1 top-spacing-2 absolute flex h-40 w-48 rotate-1 flex-col overflow-hidden p-0 shadow-2xl">
        <div className="h-spacing-6 gap-spacing-2 border-border bg-muted px-spacing-2 flex shrink-0 items-center border-b opacity-90">
          <div className="gap-spacing-1 flex">
            <div className="h-spacing-1.5 w-spacing-1.5 bg-muted-foreground rounded-full opacity-25" />
            <div className="h-spacing-1.5 w-spacing-1.5 bg-muted-foreground rounded-full opacity-25" />
          </div>
          <LayoutTemplate className="icon-xs text-muted-foreground shrink-0 opacity-40" />
          <div className="h-spacing-2 bg-muted-foreground min-w-0 flex-1 rounded-full opacity-20" />
        </div>
        <div className="gap-spacing-2 p-spacing-3 flex flex-1 flex-col">
          <div className="rounded-spacing-1 border-primary bg-primary/5 gap-spacing-1 p-spacing-2 border-2">
            <div className="h-spacing-2 bg-foreground w-4/5 rounded-full opacity-20" />
            <div className="space-y-spacing-1">
              <div className="h-spacing-1 bg-muted-foreground w-full rounded-full opacity-15" />
              <div className="h-spacing-1 bg-muted-foreground w-11/12 rounded-full opacity-15" />
            </div>
          </div>
          <div className="gap-spacing-1 rounded-spacing-1 border-border bg-secondary p-spacing-2 flex flex-1 flex-col border opacity-60">
            <div className="h-spacing-1 bg-muted-foreground opacity-12 w-2/3 rounded-full" />
            <div className="h-spacing-1 bg-muted-foreground w-full rounded-full opacity-10" />
            <div className="h-spacing-1 bg-muted-foreground w-4/5 rounded-full opacity-10" />
          </div>
          <div className="h-spacing-2 bg-primary mx-auto w-2/5 rounded-full opacity-35" />
        </div>
        <div className="bottom-spacing-4 right-spacing-6 absolute rotate-12">
          <MousePointer2 className="icon-sm text-foreground opacity-80 drop-shadow-md" />
        </div>
      </div>
    </div>
  )
}
