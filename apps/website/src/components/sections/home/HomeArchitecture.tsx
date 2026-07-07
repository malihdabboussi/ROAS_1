'use client'

import { Brain, Plug, Users, Workflow } from 'lucide-react'

type Layer = {
  label: string
  title: string
  description: string
  icon: typeof Brain
  accent: string
  glow: string
}

const LAYERS: Layer[] = [
  {
    label: 'Surface',
    title: 'Spaces',
    description: 'Tasks, docs, channels, and flows — where the work actually happens.',
    icon: Workflow,
    accent: 'rgb(52 211 153)',
    glow: 'rgba(52,211,153,0.12)',
  },
  {
    label: 'Workforce',
    title: 'Agents',
    description: 'Specialist AI agents with roles, tools, and skills — your team alongside your team.',
    icon: Users,
    accent: 'rgb(192 132 252)',
    glow: 'rgba(192,132,252,0.12)',
  },
  {
    label: 'Memory',
    title: 'The Brain',
    description: 'Four living brains your agents operate on — User, Agent, Company, Customer.',
    icon: Brain,
    accent: 'rgb(96 165 250)',
    glow: 'rgba(96,165,250,0.12)',
  },
  {
    label: 'Reach',
    title: 'Integrations',
    description: 'Drive, Slack, Gmail, CRMs, calendars — your tools, wired through the system.',
    icon: Plug,
    accent: 'rgb(251 146 60)',
    glow: 'rgba(251,146,60,0.12)',
  },
]

export function HomeArchitecture() {
  return (
    <section className="bg-color-panel-mid relative overflow-hidden py-20 md:py-28">
      <div className="hero-dot-grid pointer-events-none absolute inset-0 opacity-30" />
      <div className="site-container relative z-10">
        <div className="mx-auto mb-14 flex max-w-3xl flex-col gap-4 text-center md:mb-16">
          <p className="text-color-dim body-4 font-semibold uppercase tracking-[0.25em]">
            Architecture
          </p>
          <h2 className="h2 tracking-tight text-white">
            One stack. <span className="text-color-secondary">No glue work.</span>
          </h2>
          <p className="body-2 text-color-secondary leading-relaxed">
            Surface, workforce, memory, and reach — wired into a single operating layer instead of
            five tools your team has to translate between.
          </p>
        </div>

        <div className="mx-auto flex max-w-3xl flex-col gap-3">
          {LAYERS.map((layer, i) => {
            const Icon = layer.icon
            return (
              <div
                key={layer.title}
                className="glass-card border-section relative overflow-hidden rounded-2xl border px-5 py-5 md:px-7 md:py-6"
                style={{
                  borderColor: `${layer.accent}30`,
                  background: `linear-gradient(180deg, ${layer.glow} 0%, transparent 80%)`,
                }}
              >
                <div className="flex items-start gap-4 md:gap-6">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border md:h-14 md:w-14"
                    style={{
                      background: `${layer.accent}1a`,
                      borderColor: `${layer.accent}40`,
                      color: layer.accent,
                    }}
                  >
                    <Icon size={22} strokeWidth={1.8} />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-3">
                      <span
                        className="body-4 font-semibold uppercase tracking-[0.18em]"
                        style={{ color: layer.accent }}
                      >
                        Layer {String(i + 1).padStart(2, '0')} · {layer.label}
                      </span>
                    </div>
                    <h3 className="h4 mt-1 tracking-tight text-white">{layer.title}</h3>
                    <p className="body-3 text-color-secondary mt-2 leading-relaxed">
                      {layer.description}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
