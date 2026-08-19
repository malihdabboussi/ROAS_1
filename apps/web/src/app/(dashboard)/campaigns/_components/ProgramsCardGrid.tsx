'use client'

import Link from 'next/link'
import { ArrowRight, Lock } from 'lucide-react'
import { getIconColor, LucideIcon } from '@/components/ui/IconPicker'
import { resolveProgramIconColorId, type Program } from '@/lib/programs'

function campaignCountLabel(count: number): string {
  return `${count} campaign${count === 1 ? '' : 's'}`
}

export function ProgramsCardGrid({ programs }: { programs: Program[] }) {
  return (
    <ul className="gap-spacing-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
      {programs.map((program) => {
        const appearance = getIconColor(resolveProgramIconColorId(program.id, program.icon_color))
        const count = program.campaign_count ?? 0
        return (
          <li key={program.id}>
            <Link
              href={`/programs/${program.id}`}
              className="surface-card border-border rounded-spacing-4 p-spacing-5 hover:bg-hover-subtle group flex h-full flex-col border transition-colors"
              aria-label={`Open ${program.name}`}
            >
              <div className="gap-spacing-3 flex items-start justify-between">
                <span
                  className={`h-spacing-12 w-spacing-12 rounded-spacing-3 flex shrink-0 items-center justify-center ${appearance.glassClass || 'badge-glass-muted'}`}
                >
                  <LucideIcon
                    name={program.icon ?? 'folder-kanban'}
                    className={`icon-md ${appearance.textColor}`}
                  />
                </span>
                <ArrowRight className="icon-sm text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
              <div className="mt-spacing-5 min-w-0">
                <div className="gap-spacing-2 flex items-center">
                  <h2 className="body-1 text-foreground truncate font-semibold">{program.name}</h2>
                  {program.visibility !== 'workspace' ? (
                    <Lock
                      className="icon-xs text-muted-foreground shrink-0"
                      aria-label="Restricted"
                    />
                  ) : null}
                </div>
                <p className="body-3 text-muted-foreground mt-spacing-1">
                  {campaignCountLabel(count)}
                </p>
              </div>
              <p className="body-4 text-muted-foreground pt-spacing-5 mt-auto">
                Open campaigns, spaces, and work
              </p>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

export { campaignCountLabel }
