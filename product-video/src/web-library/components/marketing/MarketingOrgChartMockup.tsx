'use client'

import {
  MARKETING_AGENT_LIBRARY_FALLBACK,
  VIBEY_MARKETING_PORTRAIT_FALLBACK,
} from '@/lib/agent-library-fallback'
import type { PublicAgentLibraryRow } from '@/lib/public-agent-library'
import { useId } from 'react'
import { FeatureFloatingMockShell } from '@/components/feature-pages/FeatureFloatingMockShell'

const MARKETING_ORG_ROLE_KEYS = ['copywriter', 'designer', 'analyst', 'pm_marketing'] as const

function resolveMarketingOrgRows(libraryAgents?: PublicAgentLibraryRow[]): PublicAgentLibraryRow[] {
  return MARKETING_ORG_ROLE_KEYS.map((key) => {
    const fromHero = libraryAgents?.find((a) => a.role_key === key)
    if (fromHero) return fromHero
    const row = MARKETING_AGENT_LIBRARY_FALLBACK.find((a) => a.role_key === key)
    if (!row) throw new Error(`Marketing org mockup: missing agent ${key}`)
    return row
  })
}

/** Animated org-chart lines with purple currents from CEO to agents. */
function MarketingOrgConnectorLines() {
  const uid = useId()
  const g = (suffix: string) => `${uid.replace(/:/g, '')}-${suffix}`

  return (
    <svg
      className="text-color-dimmer pointer-events-none w-full shrink-0"
      viewBox="0 0 100 22"
      height="60"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <radialGradient id={g('purple-grad')} fx="1">
          <stop offset="0%" stopColor="#A855F7" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <mask id={g('mask-1')}>
          <path d="M 50 0 v 5 q 0 2 -2 2 H 14.5 q -2 0 -2 2 v 13" strokeWidth="1" stroke="white" fill="none" />
        </mask>
        <mask id={g('mask-2')}>
          <path d="M 50 0 v 5 q 0 2 -2 2 H 39.5 q -2 0 -2 2 v 13" strokeWidth="1" stroke="white" fill="none" />
        </mask>
        <mask id={g('mask-3')}>
          <path d="M 50 0 v 5 q 0 2 2 2 H 60.5 q 2 0 2 2 v 13" strokeWidth="1" stroke="white" fill="none" />
        </mask>
        <mask id={g('mask-4')}>
          <path d="M 50 0 v 5 q 0 2 2 2 H 85.5 q 2 0 2 2 v 13" strokeWidth="1" stroke="white" fill="none" />
        </mask>
      </defs>

      <g stroke="currentColor" fill="none" strokeWidth="0.4" strokeDasharray="100 100" pathLength="100">
        <path id={g('path-1')} d="M 50 0 v 5 q 0 2 -2 2 H 14.5 q -2 0 -2 2 v 13">
          <animate attributeName="stroke-dashoffset" from="100" to="0" dur="1s" fill="freeze" />
        </path>
        <path id={g('path-2')} d="M 50 0 v 5 q 0 2 -2 2 H 39.5 q -2 0 -2 2 v 13">
          <animate attributeName="stroke-dashoffset" from="100" to="0" dur="1s" fill="freeze" />
        </path>
        <path id={g('path-3')} d="M 50 0 v 5 q 0 2 2 2 H 60.5 q 2 0 2 2 v 13">
          <animate attributeName="stroke-dashoffset" from="100" to="0" dur="1s" fill="freeze" />
        </path>
        <path id={g('path-4')} d="M 50 0 v 5 q 0 2 2 2 H 85.5 q 2 0 2 2 v 13">
          <animate attributeName="stroke-dashoffset" from="100" to="0" dur="1s" fill="freeze" />
        </path>
      </g>

      <g mask={`url(#${g('mask-1')})`}>
        <circle r="6" fill={`url(#${g('purple-grad')})`}>
          <animateMotion dur="2s" repeatCount="indefinite" begin="0s">
            <mpath href={`#${g('path-1')}`} />
          </animateMotion>
        </circle>
      </g>
      <g mask={`url(#${g('mask-2')})`}>
        <circle r="6" fill={`url(#${g('purple-grad')})`}>
          <animateMotion dur="2s" repeatCount="indefinite" begin="0.5s">
            <mpath href={`#${g('path-2')}`} />
          </animateMotion>
        </circle>
      </g>
      <g mask={`url(#${g('mask-3')})`}>
        <circle r="6" fill={`url(#${g('purple-grad')})`}>
          <animateMotion dur="2s" repeatCount="indefinite" begin="1s">
            <mpath href={`#${g('path-3')}`} />
          </animateMotion>
        </circle>
      </g>
      <g mask={`url(#${g('mask-4')})`}>
        <circle r="6" fill={`url(#${g('purple-grad')})`}>
          <animateMotion dur="2s" repeatCount="indefinite" begin="1.5s">
            <mpath href={`#${g('path-4')}`} />
          </animateMotion>
        </circle>
      </g>
    </svg>
  )
}

export function MarketingOrgChartMockup(props?: {
  /** Same list as hero `AgentLibraryCarousel` / `getAgentLibraryForMarketing()` - resolves portraits for the four roles. */
  libraryAgents?: PublicAgentLibraryRow[]
  /** From `getMarketingVibeyPortraitUrl()` or DB-backed CEO portrait. */
  vibeyPortraitUrl?: string
}) {
  const marketingAgents = resolveMarketingOrgRows(props?.libraryAgents)
  const vibeySrc =
    props?.vibeyPortraitUrl != null && String(props.vibeyPortraitUrl).trim() !== ''
      ? String(props.vibeyPortraitUrl).trim()
      : VIBEY_MARKETING_PORTRAIT_FALLBACK

  return (
    <FeatureFloatingMockShell className="!min-h-[360px]">
      <div className="relative flex min-h-[360px] w-full flex-col justify-center px-2 py-4 sm:px-3">
        <div className="flex justify-center">
          <div className="mockup-card flex min-w-0 max-w-[200px] flex-col items-center gap-1.5 px-5 py-3">
            <div className="border-color-glass h-11 w-11 shrink-0 overflow-hidden rounded-full border sm:h-12 sm:w-12">
              <img src={vibeySrc} alt="" className="h-full w-full object-cover" />
            </div>
            <p className="text-[11px] font-semibold text-white sm:text-[12px]">Vibey</p>
            <p className="text-[9px] text-[var(--text-muted)] sm:text-[10px]">CEO</p>
          </div>
        </div>

        <MarketingOrgConnectorLines />

        <div className="grid grid-cols-4 gap-0">
          {marketingAgents.map((agent) => (
            <div key={agent.role_key} className="px-1">
              <div className="mockup-card flex min-w-0 flex-col items-center gap-1 px-1 py-2 sm:px-1.5 sm:py-2.5">
                <img
                  src={agent.image_url}
                  alt=""
                  className="border-color-glass h-9 w-9 shrink-0 rounded-full border object-cover sm:h-10 sm:w-10"
                />
                <p className="w-full truncate text-center text-[10px] font-semibold text-white sm:text-[11px]">
                  {agent.default_name}
                </p>
                <p className="line-clamp-2 w-full text-center text-[8px] leading-tight text-[var(--text-muted)] sm:text-[9px]">
                  {agent.role}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </FeatureFloatingMockShell>
  )
}

