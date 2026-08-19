'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { toast } from 'sonner'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { fetchPrograms, type Program } from '@/lib/programs'
import { CAMPAIGNS_HUB_MESSAGES } from '../_config/campaigns-hub-messages.config'
import { ProgramsCardGrid } from './ProgramsCardGrid'

export function AllProgramsHub() {
  const [programs, setPrograms] = useState<Program[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    void fetchPrograms()
      .then((rows) => {
        if (active) setPrograms(rows)
      })
      .catch(() => {
        if (active) toast.error(CAMPAIGNS_HUB_MESSAGES.loadProgramsFailed)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const filteredPrograms = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return programs
    return programs.filter((program) => program.name.toLowerCase().includes(normalized))
  }, [programs, query])

  if (loading) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center">
        <VibeyLoadingOrb
          text={CAMPAIGNS_HUB_MESSAGES.loadingPrograms}
          state="processing"
          size="sm"
        />
      </div>
    )
  }

  return (
    <main className="scrollbar-hide h-full min-h-0 overflow-y-auto">
      <div className="p-spacing-4 md:p-spacing-6 mx-auto w-full max-w-6xl">
        <header className="mb-spacing-5">
          <h1 className="title-h3 text-foreground">ALL PROGRAMS</h1>
          <p className="body-3 text-muted-foreground mt-spacing-1">
            Open a Program to see its campaigns, spaces, and work.
          </p>
        </header>
        <label className="mb-spacing-5 relative block max-w-xl">
          <Search className="icon-left-center text-muted-foreground icon-sm pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search programs..."
            aria-label="Search programs"
            className="input-glass input-leading body-3 text-foreground placeholder:text-muted-foreground w-full outline-none"
          />
        </label>
        {filteredPrograms.length > 0 ? (
          <ProgramsCardGrid programs={filteredPrograms} />
        ) : (
          <div className="surface-card border-border rounded-spacing-4 p-spacing-6 border text-center">
            <p className="body-2 text-foreground font-medium">
              {CAMPAIGNS_HUB_MESSAGES.noProgramsFound}
            </p>
            <p className="body-3 text-muted-foreground mt-spacing-1">
              {CAMPAIGNS_HUB_MESSAGES.noProgramsFoundHint}
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
