'use client'

import { FileText, Layers, UserRound } from 'lucide-react'

export function CortexMaxEmptyShelfMockup() {
  return (
    <div aria-hidden className="relative mx-auto h-52 w-full max-w-72 shrink-0 select-none">
      <div className="bg-muted-foreground absolute left-1/2 top-1/2 size-24 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.07] blur-2xl" />
      <div className="card-glass absolute left-2 right-8 top-14 h-24 -rotate-6 rounded-xl opacity-35" />
      <div className="card-glass absolute left-6 right-4 top-11 h-24 rotate-3 rounded-xl opacity-45" />
      <div className="card-glass absolute left-4 right-3 top-9 h-24 -rotate-1 rounded-xl opacity-55" />
      <div className="surface-card p-spacing-3 absolute inset-x-2 top-5 z-10 flex h-32 flex-col overflow-hidden rounded-xl border border-border shadow-2xl">
        <div className="mb-spacing-2 gap-spacing-2 flex items-center opacity-50">
          <UserRound className="text-muted-foreground size-3" />
          <FileText className="text-muted-foreground size-3" />
          <Layers className="text-muted-foreground size-3" />
        </div>
        <div className="gap-spacing-2 flex flex-1 flex-col justify-center">
          <div className="bg-muted-foreground h-2 w-4/5 rounded-full opacity-25" />
          <div className="bg-muted-foreground h-2 w-full rounded-full opacity-20" />
          <div className="bg-muted-foreground h-2 w-3/5 rounded-full opacity-15" />
        </div>
        <div className="cortex-max-empty-shelf-shimmer pointer-events-none absolute inset-0 rounded-xl" />
      </div>
    </div>
  )
}
