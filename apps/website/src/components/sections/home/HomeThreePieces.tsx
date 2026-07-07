'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { FeatureMockupByKind } from '@/components/feature-pages/FeatureMockups'
import { AgentLibraryCarousel } from '@/components/marketing/AgentLibraryCarousel'
import type { PublicAgentLibraryRow } from '@/lib/public-agent-library'

type PieceSlug = 'the-brain' | 'your-team' | 'spaces'

type Piece = {
  slug: PieceSlug
  kicker: string
  title: string
  framing: string
  exploreLabel: string
}

const PIECES: Piece[] = [
  {
    slug: 'the-brain',
    kicker: '01 · The knowledge layer',
    title: 'The Brain',
    framing:
      'Your company knowledge becomes something your agents can operate on — not just search through. Four living brains: User, Agent, Company, Customer.',
    exploreLabel: 'Explore the Brain',
  },
  {
    slug: 'your-team',
    kicker: '02 · The workforce',
    title: 'Agents',
    framing:
      'A bench of specialist AI agents — analyst, copywriter, ops, support — that handle the execution layer so the people you hired for judgment can finally use it.',
    exploreLabel: 'Explore Agents',
  },
  {
    slug: 'spaces',
    kicker: '03 · Where the work happens',
    title: 'Spaces',
    framing:
      'One workspace for tasks, docs, channels, and flows. Humans and agents working on the same board, in the same thread, on the same document.',
    exploreLabel: 'Explore Spaces',
  },
]

export function HomeThreePieces(props: {
  agents?: PublicAgentLibraryRow[]
  vibeyPortraitUrl?: string
}) {
  return (
    <section id="three-pieces" className="bg-color-deep relative py-20 md:py-28">
      <div className="site-container">
        <div className="mx-auto mb-14 flex max-w-3xl flex-col gap-4 text-center md:mb-20">
          <p className="text-color-dim body-4 font-semibold uppercase tracking-[0.25em]">
            The system
          </p>
          <h2 className="h2 tracking-tight text-white">
            Three pieces. <span className="text-color-secondary">One company.</span>
          </h2>
          <p className="body-2 text-color-secondary leading-relaxed">
            The Brain holds the knowledge. Agents do the work. Spaces is where it all happens. Each
            stands on its own. Together they replace the stack of disconnected tools your team is
            stitching together every day.
          </p>
        </div>

        <div className="flex flex-col gap-20 md:gap-28">
          {PIECES.map((piece, i) => (
            <div key={piece.slug} className="flex flex-col gap-8">
              {i > 0 && (
                <div className="border-color-glass mx-auto h-px w-24 border-t" aria-hidden />
              )}
              <div className="grid gap-8 md:grid-cols-12 md:items-center md:gap-12">
                <div className="flex flex-col gap-4 md:col-span-5">
                  <p className="text-emerald-accent body-4 font-semibold uppercase tracking-[0.18em]">
                    {piece.kicker}
                  </p>
                  <h3 className="h3 tracking-tight text-white">{piece.title}</h3>
                  <p className="body-2 text-color-secondary leading-relaxed">{piece.framing}</p>
                  <Link
                    href={`/features/${piece.slug}`}
                    className="text-emerald-accent body-3 inline-flex w-fit items-center gap-1.5 font-medium transition-colors hover:underline"
                  >
                    {piece.exploreLabel}
                    <ArrowRight size={14} />
                  </Link>
                </div>

                <div className="md:col-span-7">
                  <PieceVisual
                    slug={piece.slug}
                    agents={props.agents}
                    vibeyPortraitUrl={props.vibeyPortraitUrl}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function PieceVisual(props: {
  slug: PieceSlug
  agents?: PublicAgentLibraryRow[]
  vibeyPortraitUrl?: string
}) {
  if (props.slug === 'your-team') {
    return (
      <div className="glass-card border-section relative overflow-hidden rounded-2xl border">
        <div className="feature-hero-mockup-glow pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative z-10">
          <AgentLibraryCarousel agents={props.agents ?? []} />
        </div>
      </div>
    )
  }

  if (props.slug === 'spaces') {
    return (
      <div className="glass-card border-section relative overflow-hidden rounded-2xl border">
        <div className="feature-hero-mockup-glow pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative z-10">
          <FeatureMockupByKind
            kind="spaces-hero"
            missionDetailLibraryAgents={props.agents}
            missionDetailVibeyPortraitUrl={props.vibeyPortraitUrl}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="glass-card border-section relative h-[400px] overflow-hidden rounded-2xl border md:h-[500px]">
      <div className="feature-hero-mockup-glow pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative z-10 h-full">
        <FeatureMockupByKind kind="brain" />
      </div>
    </div>
  )
}
