'use client'

import { useId } from 'react'
import {
  MARKETING_AGENT_LIBRARY_FALLBACK,
  VIBEY_MARKETING_PORTRAIT_FALLBACK,
} from '@/lib/agent-library-fallback'
import type { PublicAgentLibraryRow } from '@/lib/public-agent-library'

const ROLE_KEYS = ['copywriter', 'designer', 'analyst', 'pm_marketing'] as const

function resolveAgents(libraryAgents?: PublicAgentLibraryRow[]): PublicAgentLibraryRow[] {
  return ROLE_KEYS.map((key) => {
    const match = libraryAgents?.find((a) => a.role_key === key)
    if (match) return match
    const fallback = MARKETING_AGENT_LIBRARY_FALLBACK.find((a) => a.role_key === key)
    if (!fallback) throw new Error(`BlogBannerOrgChart: missing ${key}`)
    return fallback
  })
}

function ConnectorLines() {
  const uid = useId().replace(/:/g, '')
  const g = (s: string) => `${uid}-${s}`

  return (
    <svg
      className="text-color-dimmer pointer-events-none w-full shrink-0"
      viewBox="0 0 100 22"
      height="36"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <radialGradient id={g('pg')} fx="1">
          <stop offset="0%" stopColor="#A855F7" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        {['1', '2', '3', '4'].map((n) => (
          <mask key={n} id={g(`m${n}`)}>
            <path
              d={
                [
                  'M 50 0 v 5 q 0 2 -2 2 H 14.5 q -2 0 -2 2 v 13',
                  'M 50 0 v 5 q 0 2 -2 2 H 39.5 q -2 0 -2 2 v 13',
                  'M 50 0 v 5 q 0 2 2 2 H 60.5 q 2 0 2 2 v 13',
                  'M 50 0 v 5 q 0 2 2 2 H 85.5 q 2 0 2 2 v 13',
                ][parseInt(n) - 1]
              }
              strokeWidth="1"
              stroke="white"
              fill="none"
            />
          </mask>
        ))}
      </defs>
      <g
        stroke="currentColor"
        fill="none"
        strokeWidth="0.4"
        strokeDasharray="100 100"
        pathLength="100"
      >
        {[
          'M 50 0 v 5 q 0 2 -2 2 H 14.5 q -2 0 -2 2 v 13',
          'M 50 0 v 5 q 0 2 -2 2 H 39.5 q -2 0 -2 2 v 13',
          'M 50 0 v 5 q 0 2 2 2 H 60.5 q 2 0 2 2 v 13',
          'M 50 0 v 5 q 0 2 2 2 H 85.5 q 2 0 2 2 v 13',
        ].map((d, i) => (
          <path key={i} id={g(`p${i + 1}`)} d={d}>
            <animate attributeName="stroke-dashoffset" from="100" to="0" dur="1s" fill="freeze" />
          </path>
        ))}
      </g>
      {[0, 1, 2, 3].map((i) => (
        <g key={i} mask={`url(#${g(`m${i + 1}`)})`}>
          <circle r="6" fill={`url(#${g('pg')})`}>
            <animateMotion dur="2s" repeatCount="indefinite" begin={`${i * 0.5}s`}>
              <mpath href={`#${g(`p${i + 1}`)}`} />
            </animateMotion>
          </circle>
        </g>
      ))}
    </svg>
  )
}

export function BlogBannerOrgChart(props: {
  libraryAgents?: PublicAgentLibraryRow[]
  vibeyPortraitUrl?: string
}) {
  const agents = resolveAgents(props.libraryAgents)
  const vibeySrc =
    props.vibeyPortraitUrl && String(props.vibeyPortraitUrl).trim()
      ? String(props.vibeyPortraitUrl).trim()
      : VIBEY_MARKETING_PORTRAIT_FALLBACK

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center px-4 py-3">
      <div className="compare-hero-brain-grid pointer-events-none absolute inset-0" aria-hidden />
      {/* CEO */}
      <div className="mockup-card flex shrink-0 flex-col items-center gap-1 px-5 py-2">
        <div className="border-color-glass h-8 w-8 shrink-0 overflow-hidden rounded-full border">
          <img src={vibeySrc} alt="" className="h-full w-full object-cover" />
        </div>
        <p className="text-[10px] font-semibold text-white">Pixel</p>
        <p className="text-[8px] text-[var(--text-muted)]">CEO</p>
      </div>

      <ConnectorLines />

      {/* Agents */}
      <div className="grid w-full grid-cols-4 gap-1">
        {agents.map((agent) => (
          <div
            key={agent.role_key}
            className="mockup-card flex flex-col items-center gap-1 px-1 py-2"
          >
            <img
              src={agent.image_url}
              alt=""
              className="border-color-glass h-7 w-7 shrink-0 rounded-full border object-cover"
            />
            <p className="w-full truncate text-center text-[9px] font-semibold text-white">
              {agent.default_name}
            </p>
            <p className="line-clamp-2 w-full text-center text-[7px] leading-tight text-[var(--text-muted)]">
              {agent.role}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
