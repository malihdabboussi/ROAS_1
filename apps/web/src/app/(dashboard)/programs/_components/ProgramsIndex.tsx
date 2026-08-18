'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ListChecks } from 'lucide-react'
import { toast } from 'sonner'
import { ShellBreadcrumb } from '@/components/shell/ShellBreadcrumb'
import { ListSkeleton } from '@/components/ui/feedback/ListSkeleton'
import { fetchPrograms, programDisplayName, type Program } from '@/lib/programs'
import { PROGRAMS_INDEX_MESSAGES } from '../_config/programs-index-messages.config'

export function ProgramsIndex() {
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    fetchPrograms()
      .then((rows) => {
        if (active) setPrograms(rows)
      })
      .catch(() => {
        if (active) toast.error(PROGRAMS_INDEX_MESSAGES.loadFailed)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <main className="scrollbar-hide h-full min-h-0 overflow-y-auto">
      <ShellBreadcrumb label="Programs">
        <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center overflow-hidden">
          <span className="text-foreground body-3 truncate font-medium">Programs</span>
        </nav>
      </ShellBreadcrumb>
      <div className="p-spacing-4 md:p-spacing-6 mx-auto w-full max-w-3xl">
        <header className="px-spacing-4 pb-spacing-3">
          <h1 className="title-h3 text-foreground">{PROGRAMS_INDEX_MESSAGES.title}</h1>
          <p className="body-3 text-muted-foreground mt-spacing-1">
            {PROGRAMS_INDEX_MESSAGES.subtitle}
          </p>
        </header>
        {loading ? (
          <div className="px-spacing-4">
            <ListSkeleton rows={6} label={PROGRAMS_INDEX_MESSAGES.loading} />
          </div>
        ) : programs.length === 0 ? (
          <div className="surface-card border-border rounded-spacing-3 p-spacing-6 border text-center">
            <ListChecks className="icon-lg text-muted-foreground mb-spacing-2 mx-auto" />
            <p className="body-2 text-foreground font-medium">{PROGRAMS_INDEX_MESSAGES.empty}</p>
            <p className="body-3 text-muted-foreground mt-spacing-1">
              {PROGRAMS_INDEX_MESSAGES.emptyHint}
            </p>
          </div>
        ) : (
          <ul className="gap-spacing-2 px-spacing-4 pb-spacing-6 flex flex-col">
            {programs.map((program) => (
              <li key={program.id}>
                <Link
                  href={`/programs/${program.id}`}
                  className="hover:bg-hover-subtle border-border rounded-spacing-2 px-spacing-3 py-spacing-2 flex items-center border"
                >
                  <ListChecks className="icon-sm text-muted-foreground mr-spacing-2 shrink-0" />
                  <span className="body-2 text-foreground min-w-0 flex-1 truncate font-medium">
                    {programDisplayName(program)}
                  </span>
                  {typeof program.campaign_count === 'number' ? (
                    <span className="body-4 text-muted-foreground shrink-0">
                      {program.campaign_count}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}
