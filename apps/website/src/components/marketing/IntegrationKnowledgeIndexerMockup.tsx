'use client'

import React, { useId } from 'react'
import { FeatureFloatingMockShell } from '@/components/feature-pages/FeatureFloatingMockShell'
import { VIBEY_MARKETING_PORTRAIT_FALLBACK } from '@/lib/agent-library-fallback'

const INTEGRATIONS = [
  { id: 'ig', logo: '/Integrations/Instagram.png', label: 'Instagram', side: 'left' as const },
  { id: 'hubspot', logo: '/Integrations/HubSpot.png', label: 'HubSpot', side: 'left' as const },
  { id: 'github', logo: '/Integrations/GitHub.png', label: 'GitHub', side: 'left' as const },
  { id: 'gmail', logo: '/Integrations/Gmail.png', label: 'Gmail', side: 'right' as const },
  { id: 'slack', logo: '/Integrations/Slack.png', label: 'Slack', side: 'right' as const },
  {
    id: 'stripe',
    logo: '/Integrations/Stripe.png',
    label: 'Stripe',
    side: 'right' as const,
    logoScale: 1.3,
  },
]

/** Same line + purple pulse treatment as `MarketingOrgConnectorLines` (Meet your specialists). */
const INTEGRATION_CONNECTOR_PATHS = [
  'M 15 25 Q 35 25 50 50',
  'M 15 50 H 50',
  'M 15 75 Q 35 75 50 50',
  'M 85 25 Q 65 25 50 50',
  'M 85 50 H 50',
  'M 85 75 Q 65 75 50 50',
] as const

function IntegrationConnectorLines() {
  const uid = useId()
  const g = (suffix: string) => `${uid.replace(/:/g, '')}-${suffix}`

  return (
    <svg
      className="text-color-dimmer pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <radialGradient id={g('purple-grad')} fx="1">
          <stop offset="0%" stopColor="#A855F7" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        {INTEGRATION_CONNECTOR_PATHS.map((d, i) => (
          <mask key={i} id={g(`mask-${i}`)}>
            <path d={d} strokeWidth="1" stroke="white" fill="none" />
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
        {INTEGRATION_CONNECTOR_PATHS.map((d, i) => (
          <path key={i} id={g(`path-${i}`)} d={d}>
            <animate attributeName="stroke-dashoffset" from="100" to="0" dur="1s" fill="freeze" />
          </path>
        ))}
      </g>

      {INTEGRATION_CONNECTOR_PATHS.map((_, idx) => (
        <g key={idx} mask={`url(#${g(`mask-${idx}`)})`}>
          <circle r="6" fill={`url(#${g('purple-grad')})`}>
            <animateMotion dur="2s" repeatCount="indefinite" begin={`${idx * 0.5}s`}>
              <mpath href={`#${g(`path-${idx}`)}`} />
            </animateMotion>
          </circle>
        </g>
      ))}
    </svg>
  )
}

export type IntegrationKnowledgeIndexerMockupProps = {
  vibeyPortraitUrl?: string
  /** No mock shell or brain grid — flush on parent (e.g. pitch deck). */
  embedTransparent?: boolean
}

const nodeShellClass = (embedTransparent: boolean) =>
  embedTransparent
    ? 'relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-white p-2 shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition-transform hover:scale-110'
    : 'relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white p-2 shadow-[0_10px_30px_rgba(0,0,0,0.5)] ring-1 ring-black/5 transition-transform hover:scale-110'

export function IntegrationKnowledgeIndexerMockup({
  vibeyPortraitUrl,
  embedTransparent = false,
}: IntegrationKnowledgeIndexerMockupProps = {}) {
  const vibeySrc = vibeyPortraitUrl?.trim() || VIBEY_MARKETING_PORTRAIT_FALLBACK

  const inner = (
    <div className="relative flex h-full min-h-[400px] w-full items-center justify-center p-8">
      <IntegrationConnectorLines />

      {/* Central Vibey Agent */}
      <div className="relative z-20">
        <div
          className={`h-20 w-20 overflow-hidden rounded-full ${
            embedTransparent
              ? 'shadow-[0_0_0_1px_rgba(255,255,255,0.08)]'
              : 'border-color-glass border'
          }`}
        >
          <img src={vibeySrc} alt="Vibey CEO" className="h-full w-full object-cover" />
        </div>
      </div>

      {/* Integration Nodes - Left Side */}
      <div className="absolute inset-y-0 left-8 flex flex-col justify-around py-12">
        {INTEGRATIONS.filter((i) => i.side === 'left').map((item) => (
          <div key={item.id} className="relative z-20 flex flex-col items-center gap-2">
            <div className={nodeShellClass(embedTransparent)}>
              <img
                src={item.logo}
                alt=""
                className="h-full w-full object-contain filter"
                style={{
                  transform: (item as any).logoScale
                    ? `scale(${(item as any).logoScale})`
                    : 'scale(1)',
                }}
              />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
              {item.label}
            </span>
          </div>
        ))}
      </div>

      {/* Integration Nodes - Right Side */}
      <div className="absolute inset-y-0 right-8 flex flex-col justify-around py-12">
        {INTEGRATIONS.filter((i) => i.side === 'right').map((item) => (
          <div key={item.id} className="relative z-20 flex flex-col items-center gap-2">
            <div className={nodeShellClass(embedTransparent)}>
              <img
                src={item.logo}
                alt=""
                className="h-full w-full object-contain filter"
                style={{
                  transform: (item as any).logoScale
                    ? `scale(${(item as any).logoScale})`
                    : 'scale(1)',
                }}
              />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )

  if (embedTransparent) {
    return (
      <div className="relative min-h-[400px] w-full overflow-visible bg-transparent">{inner}</div>
    )
  }

  return <FeatureFloatingMockShell className="!min-h-[400px]">{inner}</FeatureFloatingMockShell>
}
