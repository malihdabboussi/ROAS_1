'use client'

import { useEffect, useState } from 'react'

const GREEN = '#10B981'
const PURPLE = '#7C3AED'
const CYAN = '#06B6D4'
const AMBER = '#F59E0B'
const NAVY = '#040810'

function Arrow({ color = 'rgba(255,255,255,0.15)' }: { color?: string }) {
  return (
    <div className="flex flex-col items-center justify-center" style={{ height: 28 }}>
      <div style={{ width: 1, height: 14, background: color }} />
      <div
        style={{
          width: 0,
          height: 0,
          borderLeft: '4px solid transparent',
          borderRight: '4px solid transparent',
          borderTop: `5px solid ${color}`,
        }}
      />
    </div>
  )
}

function Badge({ label, color, status }: { label: string; color: string; status: string }) {
  const planned = status === 'planned'
  return (
    <span
      className="inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-1"
      style={{
        background: planned ? 'rgba(255,255,255,0.03)' : `${color}15`,
        border: planned ? '1px dashed rgba(255,255,255,0.12)' : `1px solid ${color}40`,
        fontSize: 9,
        fontWeight: 500,
        color: planned ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.8)',
        opacity: planned ? 0.6 : 1,
      }}
    >
      <span
        className="shrink-0 rounded-full"
        style={{
          width: 4,
          height: 4,
          background: status === 'live' ? GREEN : 'rgba(255,255,255,0.2)',
          boxShadow: status === 'live' ? `0 0 3px ${GREEN}` : 'none',
        }}
      />
      {label}
    </span>
  )
}

function Stage({
  icon,
  title,
  subtitle,
  color,
  items,
}: {
  icon: string
  title: string
  subtitle: string
  color: string
  items: { label: string; color: string; status: string }[]
}) {
  return (
    <div className="w-full">
      <div
        className="relative overflow-hidden rounded-xl px-3 py-2.5 sm:px-4 sm:py-3"
        style={{
          background: `linear-gradient(135deg, ${color}12 0%, ${color}06 100%)`,
          border: `1px solid ${color}35`,
        }}
      >
        <div
          className="absolute left-0 right-0 top-0"
          style={{ height: 2, background: `linear-gradient(to right, transparent, ${color}80, transparent)` }}
        />
        <div className="mb-2 flex items-center gap-2">
          <span className="text-[14px]">{icon}</span>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color, letterSpacing: 0.5, textTransform: 'uppercase' as const }}>{title}</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>{subtitle}</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          {items.map((item) => (
            <Badge key={item.label} {...item} />
          ))}
        </div>
      </div>
    </div>
  )
}

const STAGES = [
  {
    icon: '📡', title: 'Traffic Sources', subtitle: 'Top of funnel', color: '#6366F1',
    items: [
      { label: 'LinkedIn', color: '#6366F1', status: 'live' },
      { label: 'Instagram', color: '#6366F1', status: 'live' },
      { label: 'Blog / SEO', color: '#6366F1', status: 'live' },
      { label: 'Meta Ads', color: '#6366F1', status: 'planned' },
    ],
  },
  {
    icon: '🌐', title: 'Website Hub', subtitle: 'Brand anchor', color: PURPLE,
    items: [
      { label: 'Home', color: PURPLE, status: 'live' },
      { label: 'Features', color: PURPLE, status: 'live' },
      { label: 'Pricing', color: PURPLE, status: 'live' },
      { label: 'Blog', color: PURPLE, status: 'live' },
    ],
  },
  {
    icon: '🎯', title: 'Opt-In Funnels', subtitle: 'Lead capture', color: '#8B5CF6',
    items: [
      { label: 'Rachel V1: 5 Systems', color: '#8B5CF6', status: 'live' },
      { label: 'Rachel V2: AI Weekend', color: '#8B5CF6', status: 'live' },
      { label: 'Priya Funnel', color: '#8B5CF6', status: 'planned' },
    ],
  },
  {
    icon: '📘', title: 'Lead Magnets', subtitle: 'Immediate value', color: CYAN,
    items: [
      { label: 'AI Marketing Playbook', color: CYAN, status: 'live' },
      { label: 'Creator Revenue Guide', color: CYAN, status: 'planned' },
    ],
  },
  {
    icon: '✉️', title: 'Email Nurture', subtitle: '9-day journey', color: '#0EA5E9',
    items: [
      { label: 'Day 0: Diagnosis', color: '#0EA5E9', status: 'live' },
      { label: 'Day 3: Vision', color: '#0EA5E9', status: 'live' },
      { label: 'Day 5: Objection', color: '#0EA5E9', status: 'live' },
      { label: 'Day 7: Shift', color: '#0EA5E9', status: 'live' },
      { label: 'Day 9: Close', color: '#0EA5E9', status: 'live' },
    ],
  },
  {
    icon: '🚀', title: 'Conversion', subtitle: 'Onboarding begins', color: GREEN,
    items: [
      { label: 'Get Started', color: GREEN, status: 'live' },
      { label: 'Paid Activation', color: GREEN, status: 'live' },
    ],
  },
]

const ARROW_COLORS = ['#6366F180', `${PURPLE}80`, '#8B5CF680', `${CYAN}80`, '#0EA5E980']

const STATS = [
  { n: '6', label: 'Stages', color: PURPLE },
  { n: '16', label: 'Live Assets', color: GREEN },
  { n: '5', label: 'Emails', color: CYAN },
  { n: '1/10', label: 'Ecosystems', color: AMBER },
]

export function MockPresentationCoverCreative() {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1800)
    return () => clearInterval(t)
  }, [])

  return (
    <div
      className="overflow-y-auto"
      style={{
        background: `linear-gradient(160deg, ${NAVY} 0%, #07090f 100%)`,
        minHeight: '100%',
        padding: '24px 16px 36px',
        fontFamily: 'Inter, -apple-system, sans-serif',
        color: '#fff',
      }}
    >
      <div className="mb-6 text-center sm:mb-8">
        <div
          className="mb-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1"
          style={{
            background: `${GREEN}10`,
            border: `1px solid ${GREEN}30`,
            fontSize: 9,
            fontWeight: 700,
            color: '#6EE7B7',
            letterSpacing: 1,
            textTransform: 'uppercase' as const,
          }}
        >
          <span
            className="inline-block rounded-full"
            style={{
              width: 5,
              height: 5,
              background: GREEN,
              boxShadow: `0 0 5px ${GREEN}`,
              opacity: tick % 2 === 0 ? 1 : 0.4,
              transition: 'opacity 0.4s',
            }}
          />
          Live Funnel Architecture
        </div>
        <h2
          className="mb-1 text-[18px] font-extrabold sm:text-[22px]"
          style={{
            background: 'linear-gradient(135deg, #E2D9F3 0%, #A78BFA 45%, #22D3EE 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          ROAS Marketing Funnel
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, margin: 0 }}>
          Top-of-funnel to conversion: complete flow
        </p>
      </div>

      <div className="flex flex-col items-center">
        {STAGES.map((stage, i) => (
          <div key={stage.title} className="w-full" style={{ maxWidth: `${100 - i * 4}%` }}>
            <Stage {...stage} />
            {i < STAGES.length - 1 && <Arrow color={ARROW_COLORS[i]} />}
          </div>
        ))}
      </div>

      <div
        className="mx-auto mt-6 flex justify-around sm:mt-8"
        style={{ maxWidth: 500, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 20 }}
      >
        {STATS.map((s, i, arr) => (
          <div
            key={s.label}
            className="flex-1 text-center"
            style={{
              borderRight: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
              padding: '0 8px',
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.n}</div>
            <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', marginTop: 3, textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
