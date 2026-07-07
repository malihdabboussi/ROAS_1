'use client'

import React, { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, CheckCircle2, Layers, TrendingUp, Zap } from 'lucide-react'

const TIMELINE = [
  {
    id: 'a',
    icon: BookOpen,
    label: 'Brand voice crystallized',
    time: '3 months ago',
    score: 22,
    color: 'text-purple-400',
  },
  {
    id: 'b',
    icon: Layers,
    label: 'Q2 campaign learnings synthesized',
    time: '2 months ago',
    score: 41,
    color: 'text-blue-400',
  },
  {
    id: 'c',
    icon: Zap,
    label: 'Competitor map updated',
    time: '5 weeks ago',
    score: 58,
    color: 'text-emerald-400',
  },
  {
    id: 'd',
    icon: TrendingUp,
    label: 'Strategy shift detected',
    time: '3 days ago',
    score: 74,
    color: 'text-purple-400',
  },
  {
    id: 'e',
    icon: CheckCircle2,
    label: 'Full library health check passed',
    time: 'Just now',
    score: 91,
    color: 'text-emerald-400',
  },
]

const ROW_EASE: [number, number, number, number] = [0.23, 1, 0.32, 1]

export function CortexMaxBannerCompounds() {
  const [visibleCount, setVisibleCount] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelled = false
    function reveal(idx: number) {
      if (cancelled || idx > TIMELINE.length) return
      setVisibleCount(idx)
      timerRef.current = setTimeout(() => reveal(idx + 1), idx === 0 ? 600 : 900)
    }
    reveal(0)
    return () => {
      cancelled = true
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const currentScore =
    visibleCount > 0 ? (TIMELINE[Math.min(visibleCount - 1, TIMELINE.length - 1)]?.score ?? 0) : 0

  return (
    <div className="relative flex h-full w-full overflow-hidden">
      <div
        className="compare-hero-brain-grid pointer-events-none absolute inset-0 opacity-30"
        aria-hidden
      />

      <div className="relative z-10 flex h-full w-full">
        {/* Left: Timeline */}
        <div className="flex flex-1 flex-col px-5 py-4">
          <p className="text-muted-foreground/50 mb-3 text-[8px] font-black uppercase tracking-[0.25em]">
            Brain Evolution
          </p>

          <div className="relative flex-1">
            <div className="bg-border absolute bottom-1 left-[5px] top-1 w-px -translate-x-1/2" />

            <div className="space-y-2.5">
              {TIMELINE.map((event, idx) => {
                const isVisible = idx < visibleCount
                const isLatest = idx === visibleCount - 1
                const Icon = event.icon

                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{
                      opacity: isVisible ? (isLatest ? 1 : 0.5) : 0,
                      y: isVisible ? 0 : 10,
                    }}
                    transition={{ duration: 0.5, ease: ROW_EASE }}
                    className="relative flex pl-5"
                  >
                    <div
                      className={`absolute left-[5px] top-1.5 z-10 h-[7px] w-[7px] shrink-0 -translate-x-1/2 rounded-full border ${
                        isLatest
                          ? 'border-purple-400/60 bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.6)]'
                          : isVisible
                            ? 'border-border bg-muted-foreground/30'
                            : 'border-border bg-surface-subtle'
                      }`}
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <Icon
                          size={9}
                          className={isLatest ? event.color : 'text-muted-foreground/70'}
                        />
                        <span
                          className={`text-[9px] font-bold leading-none ${isLatest ? 'text-foreground' : 'text-muted-foreground'}`}
                        >
                          {event.label}
                        </span>
                      </div>
                      <span className="text-muted-foreground/50 mt-0.5 block text-[7px]">
                        {event.time}
                      </span>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right: Score */}
        <div className="border-border flex w-[90px] shrink-0 flex-col items-center justify-center border-l px-3">
          <p className="text-muted-foreground/50 mb-2 text-[7px] font-black uppercase tracking-[0.2em]">
            Score
          </p>

          <div className="relative flex h-14 w-14 items-center justify-center">
            <svg
              viewBox="0 0 48 48"
              className="text-muted-foreground/20 absolute inset-0 h-full w-full -rotate-90"
            >
              <circle
                cx="24"
                cy="24"
                r="20"
                fill="none"
                stroke="currentColor"
                strokeOpacity="0.35"
                strokeWidth="2.5"
              />
              <motion.circle
                cx="24"
                cy="24"
                r="20"
                fill="none"
                stroke="url(#scoreGrad)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 20}`}
                initial={{ strokeDashoffset: 2 * Math.PI * 20 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 20 * (1 - currentScore / 100) }}
                transition={{ duration: 1, ease: ROW_EASE }}
                style={{ filter: 'drop-shadow(0 0 4px rgba(168,85,247,0.5))' }}
              />
              <defs>
                <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
              </defs>
            </svg>

            <motion.span
              className="text-foreground relative text-[16px] font-black"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              {currentScore}
            </motion.span>
          </div>

          <p className="text-muted-foreground/50 mt-1.5 text-center text-[6px] font-bold uppercase tracking-widest">
            Intelligence
          </p>

          <div className="mt-3 flex items-end gap-[3px]">
            {TIMELINE.map((ev, idx) => (
              <motion.div
                key={ev.id}
                initial={{ height: 0 }}
                animate={{ height: idx < visibleCount ? `${(ev.score / 100) * 32}px` : 0 }}
                transition={{ duration: 0.8, ease: ROW_EASE, delay: idx * 0.15 }}
                className="w-[5px] rounded-t-sm"
                style={{
                  background: `linear-gradient(180deg, rgba(168,85,247,${0.3 + idx * 0.15}), rgba(99,102,241,${0.5 + idx * 0.1}))`,
                  border: '0.5px solid rgba(168,85,247,0.2)',
                  borderBottom: 'none',
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="cortex-max-banner-grid absolute inset-0 -z-10" aria-hidden />
    </div>
  )
}
