'use client'

import Link from 'next/link'
import { BookOpen, Users } from 'lucide-react'
import { ShellBreadcrumb } from '@/components/shell/ShellBreadcrumb'

const crumbParentClass =
  'text-muted-foreground hover:text-foreground flex min-w-0 items-center gap-1 transition-colors'
const crumbCurrentClass = 'text-foreground flex min-w-0 items-center gap-1 font-medium'

export function SkillsBreadcrumbHeader({ skillName }: { skillName?: string | null }) {
  const trimmedSkillName = skillName?.trim() ?? ''

  const trail = (
    <div className="flex min-w-0 items-center gap-1.5 text-sm">
      <Link href="/team" className={crumbParentClass}>
        <Users className="h-3.5 w-3.5 shrink-0" />
        <span className="max-w-[120px] truncate">Team</span>
      </Link>
      <span className="text-muted-foreground/50 select-none">/</span>
      {trimmedSkillName ? (
        <Link href="/team/skills" className={crumbParentClass}>
          <BookOpen className="h-3.5 w-3.5 shrink-0" />
          <span className="max-w-[140px] truncate">Skills</span>
        </Link>
      ) : (
        <div className={crumbCurrentClass}>
          <BookOpen className="h-3.5 w-3.5 shrink-0" />
          <span className="max-w-[140px] truncate">Skills</span>
        </div>
      )}
      {trimmedSkillName ? (
        <>
          <span className="text-muted-foreground/50 select-none">/</span>
          <div className={crumbCurrentClass}>
            <span className="max-w-[200px] truncate">{trimmedSkillName}</span>
          </div>
        </>
      ) : null}
    </div>
  )

  return <ShellBreadcrumb>{trail}</ShellBreadcrumb>
}
