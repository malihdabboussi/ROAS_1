'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Rocket, Share2 } from 'lucide-react'
import { VibeyHeroDepthOrb } from '@/components/vibey/vibey-hero-depth-orb'
import { Slide, SlideLabel, SlideTitle, SlideSub } from './pitch-slide-ui'

export function SlideFundingRunway() {
  const [todayShort, setTodayShort] = useState('')

  useEffect(() => {
    setTodayShort(
      new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    )
  }, [])

  const timeline = [
    {
      key: 'boot',
      label: 'Bootstrapped',
      sub: 'Shipped product · design partners',
      state: 'done' as const,
    },
    {
      key: 'raise',
      label: 'Active raise',
      sub: '$1.5M seed · 10%',
      date: todayShort || '…',
      state: 'now' as const,
    },
    {
      key: 'apr',
      label: 'Capital in',
      sub: 'Target: May 30, 2026',
      state: 'deadline' as const,
    },
    {
      key: 'exec',
      label: 'Execute',
      sub: '12-mo plan · team scale',
      state: 'next' as const,
    },
    {
      key: 'a',
      label: 'Series A',
      sub: '$100M+ trajectory',
      state: 'future' as const,
    },
  ]

  return (
    <Slide className="!py-4">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-5">
        <div className="flex shrink-0 flex-col items-center text-center">
          <SlideLabel>Runway</SlideLabel>
          <SlideTitle className="!text-2xl md:!text-4xl lg:!text-5xl">TIMELINE & HOW WE SCALE</SlideTitle>
          <SlideSub delay={0.4}>
            From bootstrapped to Series A — capital secured, team scaled, enterprise shipped.
          </SlideSub>
        </div>

        {/* Timeline */}
        <div className="w-full">
          <div className="-mx-1 overflow-x-auto pb-1 md:mx-0 md:overflow-visible">
            <div className="flex min-w-0 snap-x snap-mandatory gap-2 px-1 md:grid md:grid-cols-5 md:gap-3 md:px-0">
              {timeline.map((t, i) => {
                const isNow = t.state === 'now'
                const isDeadline = t.state === 'deadline'
                const isDone = t.state === 'done'
                return (
                  <motion.div
                    key={t.key}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + i * 0.07 }}
                    className={`relative min-w-[140px] max-w-[180px] shrink-0 snap-start rounded-2xl border p-3.5 text-left md:min-w-0 md:max-w-none ${
                      isNow
                        ? 'border-emerald-500/35 bg-gradient-to-br from-emerald-500/[0.12] to-transparent ring-1 ring-emerald-500/25'
                        : isDeadline
                          ? 'border-amber-400/35 bg-gradient-to-br from-amber-500/[0.1] to-transparent ring-1 ring-amber-500/20'
                          : isDone
                            ? 'border-white/[0.08] bg-white/[0.03]'
                            : 'border-white/[0.07] bg-white/[0.02]'
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-black/40 text-[10px] font-bold tabular-nums text-white/50 ring-1 ring-white/10">
                        {i + 1}
                      </span>
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${
                          isNow
                            ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)]'
                            : isDeadline
                              ? 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.6)]'
                              : isDone
                                ? 'bg-white/40'
                                : 'bg-white/15'
                        }`}
                        aria-hidden
                      />
                    </div>
                    <div className="text-[11px] font-bold uppercase leading-tight tracking-wide text-white md:text-[12px]">
                      {t.label}
                    </div>
                    <div className="mt-1.5 text-[9px] leading-snug text-white/45 md:text-[10px]">
                      {t.sub}
                    </div>
                    {isNow && (
                      <div className="mt-2 border-t border-white/[0.06] pt-2">
                        <span className="text-[9px] font-semibold text-emerald-400/90">
                          {t.date}
                        </span>
                        <span className="ml-1.5 text-[8px] uppercase tracking-widest text-emerald-400/60">
                          · Today
                        </span>
                      </div>
                    )}
                    {isDeadline && (
                      <div className="mt-2 border-t border-white/[0.06] pt-2 text-[8px] font-semibold uppercase tracking-widest text-amber-200/90">
                        Close window
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Two detail cards */}
        <div className="grid w-full gap-4 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-br from-purple-500/15 to-transparent p-5 ring-1 ring-purple-500/20"
          >
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/15 text-purple-400">
                <Rocket size={16} />
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-purple-400/90">
                  Post-close
                </p>
                <p className="text-sm font-bold text-white">Once we&apos;re funded</p>
              </div>
            </div>
            <ul className="space-y-2 text-[11px] leading-relaxed text-white/50 sm:text-[12px]">
              <li className="flex gap-2">
                <span className="shrink-0 text-purple-400/70">→</span>
                Scale hiring per the $1.5M plan — eng, GTM, compliance, buffer.
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 text-purple-400/70">→</span>
                Ship enterprise roadmap: SOC2, SSO, mission SLAs.
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 text-purple-400/70">→</span>
                70% enterprise (~90 accounts), 30% usage-based, driving north of $1M MRR.
              </li>
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.62 }}
            className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-br from-emerald-500/15 to-transparent p-5 ring-1 ring-emerald-500/20"
          >
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                <Share2 size={16} />
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-400/90">
                  Team model
                </p>
                <p className="text-sm font-bold text-white">How the team ties together</p>
              </div>
            </div>
            <p className="text-[11px] leading-relaxed text-white/50 sm:text-[12px]">
              Small, focused squads in engineering, GTM, and enterprise, each owning their lane.
              Founders stay hands-on across product, sales, and ops.
              We scale headcount only when revenue justifies it, keeping burn tight and velocity high.
            </p>
          </motion.div>
        </div>
      </div>
    </Slide>
  )
}

// ─── Slide 39: The Ask ───────────────────────────────────────────────────────

export function SlideAsk() {
  return (
    <Slide className="!py-4">
      <SlideLabel>The Ask</SlideLabel>
      <SlideTitle>THE ASK</SlideTitle>

      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="mt-10 flex flex-col items-center"
      >
        <h2 className="font-[family-name:var(--font-site-headline)] text-7xl font-bold leading-none text-white md:text-9xl">
          $1.5M
        </h2>
        <p className="mt-6 text-2xl font-semibold tracking-wide text-white/70 md:text-3xl">
          for 10% equity
        </p>
      </motion.div>
    </Slide>
  )
}

// ─── Slide 22: CTA — END CARD ─────────────────────────────────────────────────

export function SlideCTA() {
  return (
    <Slide>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8 }}
        className="flex flex-col items-center"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative mb-8 h-[160px] w-[160px] max-md:mb-5 max-md:h-[120px] max-md:w-[120px] max-[380px]:h-[104px] max-[380px]:w-[104px] md:h-[200px] md:w-[200px]"
        >
          <VibeyHeroDepthOrb />
        </motion.div>
        <h2 className="max-w-3xl text-center font-[family-name:var(--font-site-headline)] text-4xl font-bold tracking-tight text-white max-md:text-[1.9rem] max-md:leading-[1.03] max-[380px]:text-[1.55rem] md:text-6xl lg:text-7xl">
          YOUR AI TEAM.
          <br />
          READY TO SCALE.
        </h2>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-8 flex flex-col items-center gap-4 max-md:mt-5 sm:flex-row sm:gap-6"
        >
          {[
            { name: 'Dylan Vanas', email: 'dylan@vibey.im', role: 'CEO', img: '/pitch/dylan.png' },
            { name: 'Sefy Tofan', email: 'sefy@vibey.im', role: 'CTO', img: '/pitch/sefy.png' },
          ].map((p, i) => (
            <motion.div
              key={p.email}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 + i * 0.12 }}
              className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 ring-1 ring-white/[0.04] max-md:w-full max-md:max-w-sm"
            >
              <img
                src={p.img}
                alt={p.name}
                className="h-10 w-10 shrink-0 rounded-full object-cover object-top ring-1 ring-white/10"
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">{p.name}</p>
                <p className="text-[11px] text-white/40">
                  {p.role}&ensp;·&ensp;{p.email}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
          className="mt-5 text-base font-semibold text-white/50"
        >
          vibey.im
        </motion.p>

      </motion.div>
    </Slide>
  )
}
