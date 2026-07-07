'use client'

import { AgentLibraryCarousel } from '@/components/marketing/AgentLibraryCarousel'
import type { PublicAgentLibraryRow } from '@/lib/public-agent-library'

export function HomeMeetAgents(props: { agents?: PublicAgentLibraryRow[] }) {
  const agents = props.agents ?? []
  if (agents.length === 0) return null

  return (
    <section className="border-section bg-color-deep relative overflow-hidden border-y py-20 md:py-28">
      <div className="hero-dot-grid pointer-events-none absolute inset-0 opacity-25" />
      <div className="site-container relative z-10">
        <div className="mx-auto mb-12 flex max-w-3xl flex-col gap-4 text-center">
          <p className="text-color-dim body-4 font-semibold uppercase tracking-[0.25em]">
            The team
          </p>
          <h2 className="h2 tracking-tight text-white">
            Meet your agents. <span className="text-color-secondary">They have names.</span>
          </h2>
          <p className="body-2 text-color-secondary leading-relaxed">
            Atlas, Ivy, Niko, Jaime, and the rest are specialist agents with real roles, real
            skills, and real portraits. Hire the ones you need. They show up in the same workspace
            as your team, ready on day one.
          </p>
        </div>

        <div className="relative">
          <AgentLibraryCarousel agents={agents} />
        </div>
      </div>
    </section>
  )
}
