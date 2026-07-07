'use client'

import { Check, LayoutTemplate, MessageSquare, MousePointer2 } from 'lucide-react'

/** Empty-state illustration for presentation and funnel Comments mode in the chat rail. */
export function PresentationCommentsEmptyMockup() {
  return (
    <div aria-hidden className="relative mx-auto h-44 w-full max-w-[260px] select-none">
      <div className="h-spacing-32 w-spacing-32 bg-muted-foreground absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.06] blur-3xl" />

      <div className="card-glass left-spacing-1 top-spacing-5 gap-spacing-2 p-spacing-2 w-spacing-20 absolute flex h-36 -rotate-3 flex-col shadow-lg">
        <div className="gap-spacing-1 border-border pb-spacing-1 flex items-center border-b">
          <MessageSquare className="icon-xs text-muted-foreground shrink-0 opacity-60" />
          <div className="bg-muted-foreground h-spacing-1 min-w-0 flex-1 rounded-full opacity-15" />
        </div>
        <div className="rounded-spacing-2 border-border gap-spacing-1 p-spacing-1.5 flex flex-col border border-dashed opacity-50">
          <div className="bg-muted-foreground h-spacing-1 opacity-12 w-full rounded-full" />
          <div className="bg-muted-foreground h-spacing-1 w-4/5 rounded-full opacity-10" />
        </div>
        <div className="surface-card border-border gap-spacing-1 rounded-spacing-2 p-spacing-1.5 flex flex-col border opacity-35">
          <div className="gap-spacing-1 flex items-center">
            <Check className="icon-xs text-muted-foreground shrink-0 opacity-50" />
            <div className="bg-muted-foreground h-spacing-1 opacity-12 flex-1 rounded-full" />
          </div>
          <div className="bg-muted-foreground h-spacing-1 w-3/4 rounded-full opacity-10" />
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
        <div className="gap-spacing-2 p-spacing-3 relative flex flex-1 flex-col">
          <div className="gap-spacing-1 rounded-spacing-1 border-border bg-secondary p-spacing-2 flex flex-1 flex-col border">
            <div className="h-spacing-2 bg-foreground w-3/4 rounded-full opacity-20" />
            <div className="space-y-spacing-1">
              <div className="h-spacing-1 bg-muted-foreground w-full rounded-full opacity-15" />
              <div className="h-spacing-1 bg-muted-foreground opacity-12 w-11/12 rounded-full" />
            </div>
          </div>
          <div className="top-spacing-1 left-spacing-2 absolute z-10 flex max-w-[88px] flex-col">
            <div className="card-glass border-border gap-spacing-1 rounded-spacing-2 p-spacing-1.5 flex flex-col border shadow-md">
              <div className="gap-spacing-1 flex items-center">
                <MessageSquare className="icon-xs text-primary shrink-0 opacity-70" />
                <div className="bg-muted-foreground h-spacing-1 flex-1 rounded-full opacity-20" />
              </div>
              <div className="bg-muted-foreground h-spacing-1 w-full rounded-full opacity-15" />
            </div>
            <div className="border-border bg-card ml-spacing-3 h-spacing-2 w-spacing-2 rotate-45 border-b border-r" />
          </div>
          <div className="h-spacing-2 bg-primary mx-auto w-2/5 rounded-full opacity-30" />
        </div>
        <div className="bottom-spacing-3 right-spacing-8 absolute rotate-12">
          <MousePointer2 className="icon-sm text-muted-foreground opacity-70 drop-shadow-md" />
        </div>
      </div>
    </div>
  )
}
