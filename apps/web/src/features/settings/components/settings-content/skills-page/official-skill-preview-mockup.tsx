'use client'

import { BookOpen, ShieldCheck } from 'lucide-react'

export function OfficialSkillPreviewMockup() {
  return (
    <div className="px-spacing-4 py-spacing-6 flex h-full min-h-0 w-full flex-col items-center justify-center">
      <div aria-hidden className="relative mx-auto w-full max-w-[280px] select-none">
        <div className="card-glass border-border rounded-spacing-3 p-spacing-4 gap-spacing-4 relative flex flex-col border">
          <div className="gap-spacing-2 flex items-center">
            <BookOpen className="icon-sm text-muted-foreground shrink-0" />
            <div className="bg-muted h-spacing-7 min-w-0 flex-1 rounded-full opacity-50" />
          </div>
          <div className="gap-spacing-2 flex flex-col opacity-30">
            <div className="bg-muted h-spacing-7 w-full rounded-full" />
            <div className="bg-muted h-spacing-7 w-5/6 rounded-full" />
            <div className="bg-muted h-spacing-7 w-4/6 rounded-full" />
            <div className="bg-muted h-spacing-7 w-full rounded-full" />
            <div className="bg-muted h-spacing-7 w-3/4 rounded-full" />
          </div>
          <div className="pt-spacing-2 flex justify-center">
            <div className="border-border h-spacing-10 w-spacing-10 flex items-center justify-center rounded-full border bg-[var(--background)]">
              <ShieldCheck className="icon-md text-primary shrink-0" />
            </div>
          </div>
        </div>
      </div>
      <p className="body-3 text-muted-foreground mt-spacing-4 max-w-[320px] text-center">
        Official platform skill. Instructions are managed by Vibey.
      </p>
    </div>
  )
}
