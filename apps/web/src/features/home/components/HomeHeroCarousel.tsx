'use client'

import { Fragment, useEffect, useRef, useState } from 'react'

// Port of `VIBEY UI/hero-carousel.jsx`: 2 cards visible, auto-rotate through N cards.
// Presentational only — wire `onAction` later when quick actions are hooked up.

export type HomeHeroCarouselCard = {
  id: string
  eyebrow: string
  eyebrowClassName: string
  title: string
  body: string
  vignette: 'webinar' | 'gtm' | 'launch' | 'hire' | 'audit' | 'lifecycle'
  glowClassName: string
}

export const HOME_HERO_CAROUSEL_CARDS: HomeHeroCarouselCard[] = [
  {
    id: 'webinar',
    eyebrow: 'Live event',
    eyebrowClassName: 'text-blue-400',
    title: 'Launch a webinar',
    body: 'Vibey drafts the funnel, registration page, and 5-email reminder sequence.',
    vignette: 'webinar',
    glowClassName: 'bg-blue-500/15',
  },
  {
    id: 'gtm',
    eyebrow: 'Strategy',
    eyebrowClassName: 'text-violet-400',
    title: 'Build a GTM strategy',
    body: 'Audience, positioning, channel mix, and a 90-day plan — ready to brief.',
    vignette: 'gtm',
    glowClassName: 'bg-violet-500/15',
  },
  {
    id: 'launch',
    eyebrow: 'Campaign',
    eyebrowClassName: 'text-emerald-400',
    title: 'Plan a product launch',
    body: 'Countdown calendar, asset checklist, and partner outreach in one pass.',
    vignette: 'launch',
    glowClassName: 'bg-emerald-500/15',
  },
  {
    id: 'hire',
    eyebrow: 'Team',
    eyebrowClassName: 'text-violet-400',
    title: 'Hire a new agent',
    body: 'Pick a specialty, train them on your brand, deploy in two minutes.',
    vignette: 'hire',
    glowClassName: 'bg-violet-500/15',
  },
  {
    id: 'audit',
    eyebrow: 'Diagnostic',
    eyebrowClassName: 'text-amber-400',
    title: 'Audit my funnel',
    body: 'Conversion, CPL, and LTV reviewed end-to-end with prioritized fixes.',
    vignette: 'audit',
    glowClassName: 'bg-amber-500/12',
  },
  {
    id: 'lifecycle',
    eyebrow: 'Lifecycle',
    eyebrowClassName: 'text-blue-400',
    title: 'Build email lifecycle',
    body: 'Welcome, nurture, pitch, and win-back sequences scoped to your list.',
    vignette: 'lifecycle',
    glowClassName: 'bg-blue-500/12',
  },
]

const GAP_PX = 12
const AUTO_MS = 5500
const SNAP_MS = 650
const DOT_PAUSE_MS = 12000

function CarouselTrack({
  totalCards,
  slot,
  animating,
  cards,
  onAction,
}: {
  totalCards: number
  slot: number
  animating: boolean
  cards: HomeHeroCarouselCard[]
  onAction?: (card: HomeHeroCarouselCard) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    if (!ref.current) return
    const measure = () => {
      const parent = ref.current?.parentElement
      if (parent) setWidth(parent.clientWidth)
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (ref.current.parentElement) ro.observe(ref.current.parentElement)
    return () => ro.disconnect()
  }, [])

  const cardW = Math.max(0, (width - GAP_PX) / 2)
  const stepW = cardW + GAP_PX

  return (
    <div
      ref={ref}
      className="flex"
      style={{
        gap: GAP_PX,
        transform: `translateX(${-slot * stepW}px)`,
        transition: animating ? 'transform 600ms cubic-bezier(0.65, 0, 0.35, 1)' : 'none',
        willChange: 'transform',
      }}
    >
      {Array.from({ length: totalCards + 2 }).map((_, i) => {
        const card = cards[i % totalCards]!
        return (
          <div key={i} className="min-w-0 shrink-0" style={{ width: cardW }}>
            <HomeHeroCarouselCardView card={card} onAction={onAction} />
          </div>
        )
      })}
    </div>
  )
}

export function HomeHeroCarousel({
  onAction,
}: {
  onAction?: (card: HomeHeroCarouselCard) => void
}) {
  const cards = HOME_HERO_CAROUSEL_CARDS
  const total = cards.length
  const [pair, setPair] = useState(0)
  const [hovered, setHovered] = useState(false)
  const [pausedUntil, setPausedUntil] = useState(0)
  const [slot, setSlot] = useState(0)
  const [animating, setAnimating] = useState(true)

  useEffect(() => {
    if (hovered) return
    const t = window.setInterval(() => {
      if (Date.now() < pausedUntil) return
      setSlot((s) => s + 1)
    }, AUTO_MS)
    return () => window.clearInterval(t)
  }, [hovered, pausedUntil])

  useEffect(() => {
    setPair(((slot % total) + total) % total)
  }, [slot, total])

  useEffect(() => {
    if (slot < total) return
    const t = window.setTimeout(() => {
      setAnimating(false)
      setSlot(0)
      requestAnimationFrame(() => requestAnimationFrame(() => setAnimating(true)))
    }, SNAP_MS)
    return () => window.clearTimeout(t)
  }, [slot, total])

  const requestSlot = (next: number) => {
    if (next === pair) return
    let steps = (next - pair + total) % total
    if (steps === 0) steps = total
    setSlot((s) => s + steps)
  }

  return (
    <div
      className="mb-6"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="typo-caption text-muted-foreground mb-3 pl-1 font-medium uppercase tracking-wider">
        Start with a quick action
      </div>

      <div className="relative overflow-hidden">
        <CarouselTrack
          totalCards={total}
          slot={slot}
          animating={animating}
          cards={cards}
          onAction={onAction}
        />
      </div>

      <div className="mt-3.5 flex justify-center gap-2">
        {cards.map((c, i) => (
          <button
            key={c.id}
            type="button"
            onClick={() => {
              requestSlot(i)
              setPausedUntil(Date.now() + DOT_PAUSE_MS)
            }}
            aria-label={`Show ${c.title}`}
            className={`h-1.5 cursor-pointer rounded-full border-0 p-0 transition-all ${
              i === pair ? 'bg-primary w-[18px]' : 'bg-muted w-1.5'
            }`}
          />
        ))}
      </div>
    </div>
  )
}

function HomeHeroCarouselCardView({
  card,
  onAction,
}: {
  card: HomeHeroCarouselCard
  onAction?: (card: HomeHeroCarouselCard) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onAction?.(card)}
      className="border-border card-glass relative flex min-h-[168px] w-full cursor-pointer items-center gap-4 overflow-hidden rounded-[14px] border p-5 text-left shadow-xl transition-[transform,border-color] duration-150 ease-out hover:-translate-y-0.5"
    >
      <div
        className={`pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full blur-3xl ${card.glowClassName}`}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '14px 14px',
        }}
        aria-hidden
      />

      <div className="relative z-[2] min-w-0 flex-1">
        <div
          className={`typo-caption mb-1.5 font-semibold uppercase tracking-wider ${card.eyebrowClassName}`}
        >
          {card.eyebrow}
        </div>
        <div className="body-1 text-foreground mb-1.5 font-bold tracking-tight">{card.title}</div>
        <p className="body-3 text-muted-foreground max-w-[280px] text-pretty">{card.body}</p>
      </div>

      <div className="relative z-[2] hidden shrink-0 sm:block">
        {card.vignette === 'webinar' && <VignetteWebinar />}
        {card.vignette === 'gtm' && <VignetteGtm />}
        {card.vignette === 'launch' && <VignetteLaunch />}
        {card.vignette === 'hire' && <VignetteHire />}
        {card.vignette === 'audit' && <VignetteAudit />}
        {card.vignette === 'lifecycle' && <VignetteLifecycle />}
      </div>
    </button>
  )
}

function VignetteWebinar() {
  return (
    <div className="w-[220px]">
      <div className="rounded-lg border border-blue-500/25 bg-black/35 p-3">
        <div className="mb-2 flex items-center gap-2.5">
          <div className="flex h-10 w-[38px] shrink-0 flex-col items-center justify-center rounded-md border border-blue-500/30 bg-blue-500/15">
            <span className="text-[8px] font-bold text-blue-400">MAY</span>
            <span className="text-foreground text-sm font-bold leading-none">14</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-foreground text-[11.5px] font-semibold">Founder masterclass</div>
            <div className="text-muted-foreground text-[10px]">2:00 PM · 60 min</div>
          </div>
        </div>
        <div className="text-muted-foreground flex items-center text-[10px]">
          <div className="flex -space-x-1.5">
            {['A', 'B', 'C'].map((ch, i) => (
              <span
                key={ch}
                className="border-background bg-muted text-muted-foreground flex h-[18px] w-[18px] items-center justify-center rounded-full border-[1.5px] text-[8px] font-bold"
                style={{ marginLeft: i ? -6 : 0 }}
              >
                {ch}
              </span>
            ))}
          </div>
          <span className="ml-1.5">+218 RSVPs</span>
        </div>
      </div>
    </div>
  )
}

function VignetteGtm() {
  const phases = [
    { label: 'Audience', state: 'done' as const, color: '#11B981' },
    { label: 'Position', state: 'done' as const, color: '#11B981' },
    { label: 'Channels', state: 'active' as const, color: '#9B6BFF' },
    { label: 'Launch', state: 'pending' as const, color: '#3a2f4a' },
  ]
  return (
    <div className="w-[220px]">
      <div className="mb-2 flex items-center">
        {phases.map((p, i) => (
          <Fragment key={p.label}>
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full border-2"
              style={{
                background: p.state === 'pending' ? 'transparent' : p.color,
                borderColor: p.color,
                boxShadow: p.state === 'active' ? `0 0 8px ${p.color}` : 'none',
              }}
            />
            {i < phases.length - 1 ? (
              <div
                className="h-0.5 min-w-2 flex-1"
                style={{
                  background: phases[i + 1]!.state !== 'pending' ? p.color : '#3a2f4a',
                }}
              />
            ) : null}
          </Fragment>
        ))}
      </div>
      <div className="flex justify-between">
        {phases.map((p) => (
          <div
            key={p.label}
            className={`text-[9px] font-medium ${
              p.state === 'pending'
                ? 'text-muted-foreground'
                : p.state === 'active'
                  ? 'text-foreground font-semibold'
                  : 'text-muted-foreground'
            }`}
          >
            {p.label}
          </div>
        ))}
      </div>
      <div className="border-border text-muted-foreground mt-2.5 rounded-md border border-violet-500/20 bg-violet-500/10 py-1.5 text-center text-[10px]">
        12 deliverables · 4 channels
      </div>
    </div>
  )
}

function VignetteLaunch() {
  const tasks = ['Landing page', 'Email sequence', 'Ad creative', 'Affiliate kit']
  return (
    <div className="flex w-[220px] items-center gap-3.5">
      <div className="relative h-[72px] w-[72px] shrink-0">
        <svg width="72" height="72" viewBox="0 0 72 72" className="text-border">
          <circle
            cx="36"
            cy="36"
            r="30"
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            className="opacity-20"
          />
          <circle
            cx="36"
            cy="36"
            r="30"
            fill="none"
            stroke="#10B981"
            strokeWidth="5"
            strokeDasharray={2 * Math.PI * 30}
            strokeDashoffset={2 * Math.PI * 30 * (1 - 0.62)}
            strokeLinecap="round"
            transform="rotate(-90 36 36)"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-foreground text-base font-bold leading-none">14</span>
          <span className="text-muted-foreground mt-0.5 text-[8px]">DAYS</span>
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {tasks.map((task, i) => (
          <div key={task} className="flex items-center gap-1.5 text-[10px]">
            <span
              className={`inline-flex h-[11px] w-[11px] shrink-0 items-center justify-center rounded-sm ${
                i < 2
                  ? 'bg-emerald-500'
                  : 'border-border border-[1.5px] border-solid bg-transparent'
              }`}
            >
              {i < 2 ? (
                <svg width="7" height="7" viewBox="0 0 24 24" fill="none" className="text-white">
                  <polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="4" />
                </svg>
              ) : null}
            </span>
            <span
              className={i < 2 ? 'text-muted-foreground line-through' : 'text-muted-foreground'}
            >
              {task}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function VignetteHire() {
  const roles = ['SEO', 'PR', 'Affiliate', 'Influencer', 'Analytics']
  return (
    <div className="w-[220px]">
      <div className="mb-2.5 flex items-center gap-2.5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-violet-500/50 bg-violet-500/10 text-xl font-light text-violet-400">
          +
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-foreground text-[11.5px] font-semibold">New specialist</div>
          <div className="text-muted-foreground text-[10px]">Trains in 2 min</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        {roles.map((role) => (
          <span
            key={role}
            className="text-muted-foreground rounded-full border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[9.5px]"
          >
            {role}
          </span>
        ))}
      </div>
    </div>
  )
}

function VignetteAudit() {
  const stats = [
    { label: 'CR', value: '2.1%', delta: '+0.4' },
    { label: 'CPL', value: '$18', delta: '−$4' },
    { label: 'LTV', value: '$840', delta: '+12%' },
  ]
  return (
    <div className="grid w-[220px] grid-cols-3 gap-1.5">
      {stats.map((s) => (
        <div
          key={s.label}
          className="rounded-lg border border-white/10 bg-black/30 px-1.5 py-2 text-center"
        >
          <div className="text-muted-foreground mb-0.5 text-[9px] font-medium uppercase tracking-wide">
            {s.label}
          </div>
          <div className="text-foreground font-mono text-sm font-bold">{s.value}</div>
          <div className="mt-0.5 font-mono text-[9px] text-emerald-400">{s.delta}</div>
        </div>
      ))}
    </div>
  )
}

function VignetteLifecycle() {
  const stages = [
    { label: 'Welcome', color: '#11B981' },
    { label: 'Nurture', color: '#6E9EFF' },
    { label: 'Pitch', color: '#9B6BFF' },
    { label: 'Win-back', color: '#FBCB15' },
  ]
  return (
    <div className="w-[220px]">
      <div className="flex flex-col gap-1">
        {stages.map((s, i) => (
          <div
            key={s.label}
            className="border-border flex items-center gap-2 rounded-md border border-white/5 bg-white/[0.025] py-1.5 pl-2.5 pr-2.5"
            style={{ marginLeft: i * 8 }}
          >
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: s.color, boxShadow: `0 0 6px ${s.color}` }}
            />
            <span className="text-muted-foreground flex-1 text-[10.5px] font-medium">
              {s.label}
            </span>
            <span className="text-muted-foreground font-mono text-[9px]">{(i + 1) * 2} emails</span>
          </div>
        ))}
      </div>
    </div>
  )
}
