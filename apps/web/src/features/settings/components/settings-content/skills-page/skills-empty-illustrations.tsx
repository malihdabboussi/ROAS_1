'use client'

import { BookOpen, ChevronRight, MousePointer2 } from 'lucide-react'

function SkillTreeGhostRow({ width = 'w-2/3' }: { width?: string }) {
  return (
    <div className="gap-spacing-1 flex items-center py-0.5">
      <ChevronRight className="icon-xs text-muted-foreground shrink-0 opacity-40" />
      <BookOpen className="icon-xs text-muted-foreground shrink-0 opacity-50" />
      <div className={`bg-muted h-spacing-7 min-w-0 flex-1 rounded-full opacity-40 ${width}`} />
    </div>
  )
}

export function SkillsRailEmptyIllustration() {
  return (
    <div
      aria-hidden
      className="px-spacing-2 py-spacing-2 relative flex w-full select-none justify-center"
    >
      <div className="relative mx-auto w-full max-w-[120px]">
        <div className="bg-primary/10 h-spacing-20 w-spacing-20 absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-50 blur-2xl" />
        <div className="card-glass rounded-spacing-3 p-spacing-3 gap-spacing-2 relative flex flex-col">
          <SkillTreeGhostRow width="w-3/4" />
          <SkillTreeGhostRow width="w-1/2" />
        </div>
      </div>
    </div>
  )
}

export function SkillsPreviewEmptyIllustration() {
  return (
    <div
      aria-hidden
      className="px-spacing-4 py-spacing-2 relative flex w-full select-none justify-center"
    >
      <div className="relative mx-auto w-full max-w-[240px]">
        <div className="bg-primary/10 h-spacing-24 w-spacing-24 absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40 blur-2xl" />
        <div className="card-glass rounded-spacing-3 p-spacing-2 gap-spacing-2 relative flex">
          <div className="w-spacing-16 pr-spacing-1 shrink-0">
            <SkillTreeGhostRow width="w-full" />
            <SkillTreeGhostRow width="w-4/5" />
            <div className="chip-glass-blue rounded-spacing-1 mt-spacing-1 gap-spacing-1 flex items-center px-1 py-0.5">
              <ChevronRight className="icon-xs shrink-0 opacity-80" />
              <BookOpen className="icon-xs shrink-0 opacity-80" />
              <div className="bg-muted h-spacing-7 min-w-0 flex-1 rounded-full opacity-60" />
            </div>
          </div>
          <div className="gap-spacing-2 py-spacing-1 flex min-w-0 flex-1 flex-col opacity-30">
            <div className="bg-muted h-spacing-7 w-full rounded-full" />
            <div className="bg-muted h-spacing-7 w-full rounded-full" />
            <div className="bg-muted h-spacing-7 w-full rounded-full" />
            <div className="bg-muted h-spacing-7 w-full rounded-full" />
          </div>
        </div>
        <div className="left-spacing-6 pointer-events-none absolute bottom-0 rotate-12">
          <MousePointer2 className="icon-sm text-foreground drop-shadow-sm" />
        </div>
      </div>
    </div>
  )
}

export function SkillsRailEmptyState({ message }: { message: string }) {
  return (
    <div className="px-spacing-2 py-spacing-6 flex h-full min-h-[200px] w-full flex-1 flex-col items-center justify-center">
      <SkillsRailEmptyIllustration />
      <p className="body-3 text-muted-foreground mt-spacing-4 px-spacing-2 text-center">
        {message}
      </p>
    </div>
  )
}

export function SkillsPreviewEmptyState() {
  return (
    <div className="p-spacing-6 flex h-full min-h-0 w-full flex-col items-center justify-center">
      <SkillsPreviewEmptyIllustration />
      <p className="body-3 text-muted-foreground mt-spacing-4 text-center">Select a skill.</p>
    </div>
  )
}
