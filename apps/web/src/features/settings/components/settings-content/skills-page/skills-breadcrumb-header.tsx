'use client'

import { BookOpen, Users } from 'lucide-react'

export function SkillsBreadcrumbHeader({ skillName }: { skillName?: string | null }) {
  const trimmedSkillName = skillName?.trim() ?? ''

  return (
    <div className="px-4 py-3">
      <div className="pl-spacing-2 flex min-w-0 items-center gap-1.5 text-sm">
        <div className="flex items-center gap-1 text-[var(--color-muted-foreground)]">
          <Users className="h-3.5 w-3.5 shrink-0" />
          <span className="max-w-[120px] truncate">Team</span>
        </div>
        <span className="text-[var(--color-muted-foreground)]/50 select-none">/</span>
        <div
          className={`flex min-w-0 items-center gap-1 ${
            trimmedSkillName
              ? 'text-[var(--color-muted-foreground)]'
              : 'font-medium text-[var(--foreground)]'
          }`}
        >
          <BookOpen className="h-3.5 w-3.5 shrink-0" />
          <span className="max-w-[140px] truncate">Skills</span>
        </div>
        {trimmedSkillName ? (
          <>
            <span className="text-[var(--color-muted-foreground)]/50 select-none">/</span>
            <div className="flex min-w-0 items-center gap-1 font-medium text-[var(--foreground)]">
              <span className="max-w-[200px] truncate">{trimmedSkillName}</span>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
