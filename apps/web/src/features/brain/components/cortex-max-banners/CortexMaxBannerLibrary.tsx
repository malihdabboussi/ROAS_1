'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, CheckCircle2, Layers, MessageSquare } from 'lucide-react'

const RAW_MEMORIES = [
  { id: 'mem1', label: '"Organic beats paid 3:1"', type: 'insight' },
  { id: 'mem2', label: '"Coach tone, not guru"', type: 'preference' },
  { id: 'mem3', label: '"Q2 launch delayed"', type: 'decision' },
  { id: 'mem4', label: '"Community > cold ads"', type: 'insight' },
]

const PAGES = [
  { id: 'brand', icon: MessageSquare, label: 'Brand Voice', color: 'purple' },
  { id: 'strategy', icon: Layers, label: 'Marketing Strategy', color: 'blue' },
  { id: 'audience', icon: BookOpen, label: 'Target Audience', color: 'emerald' },
]

export function CortexMaxBannerLibrary() {
  const [scanProgress, setScanProgress] = useState(0)
  const [activePageIndex, setActivePageIndex] = useState(-1)

  useEffect(() => {
    const interval = setInterval(() => {
      setScanProgress((prev) => (prev >= 100 ? 0 : prev + 0.4))
    }, 20)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (scanProgress > 25 && scanProgress < 35) setActivePageIndex(0)
    else if (scanProgress > 55 && scanProgress < 65) setActivePageIndex(1)
    else if (scanProgress > 80) setActivePageIndex(2)
    else if (scanProgress < 5) setActivePageIndex(-1)
  }, [scanProgress])

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
      <div
        className="compare-hero-brain-grid pointer-events-none absolute inset-0 opacity-30"
        aria-hidden
      />

      <div className="relative flex h-full w-full max-w-full items-center justify-between px-5 py-4">
        {/* Left: Raw Memories */}
        <div className="z-10 flex flex-col gap-2">
          <p className="text-muted-foreground/50 mb-1 text-[8px] font-black uppercase tracking-[0.25em]">
            Raw Memories
          </p>
          {RAW_MEMORIES.map((mem, idx) => (
            <motion.div
              key={mem.id}
              animate={{
                x: scanProgress > idx * 18 + 10 ? 12 : 0,
                opacity: scanProgress > idx * 18 + 10 ? 0.15 : 0.8,
                filter: scanProgress > idx * 18 + 10 ? 'blur(1.5px)' : 'blur(0px)',
              }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="border-border bg-surface-subtle flex items-center gap-2 rounded-lg border px-2.5 py-1.5"
            >
              <div className="h-1 w-1 shrink-0 rounded-full bg-purple-400/60" />
              <span className="text-muted-foreground truncate text-[9px] font-medium">
                {mem.label}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Scanline */}
        <motion.div
          className="absolute bottom-0 top-0 z-20 w-px"
          style={{ left: `${scanProgress}%` }}
        >
          <div className="h-full w-px bg-gradient-to-b from-transparent via-purple-400 to-transparent shadow-[0_0_12px_rgba(168,85,247,0.8)]" />
          <div className="absolute left-[-2px] top-1/2 -translate-y-1/2">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
          </div>
        </motion.div>

        {/* Right: Organized Pages */}
        <div className="z-10 flex flex-col items-end gap-2">
          <p className="text-muted-foreground/50 mb-1 text-[8px] font-black uppercase tracking-[0.25em]">
            Knowledge Pages
          </p>
          <div className="space-y-2">
            {PAGES.map((page, idx) => {
              const isActive = activePageIndex >= idx
              const isHighlighted = activePageIndex === idx
              const colorClasses = {
                purple: {
                  border: isHighlighted ? 'border-purple-500/40' : 'border-border',
                  bg: isHighlighted ? 'bg-purple-500/8' : 'bg-surface-subtle',
                  icon: 'bg-purple-500/15 text-purple-400',
                  shadow: 'shadow-[0_0_16px_rgba(168,85,247,0.15)]',
                },
                blue: {
                  border: isHighlighted ? 'border-blue-500/40' : 'border-border',
                  bg: isHighlighted ? 'bg-blue-500/8' : 'bg-surface-subtle',
                  icon: 'bg-blue-500/15 text-blue-400',
                  shadow: 'shadow-[0_0_16px_rgba(59,130,246,0.15)]',
                },
                emerald: {
                  border: isHighlighted ? 'border-emerald-500/40' : 'border-border',
                  bg: isHighlighted ? 'bg-emerald-500/8' : 'bg-surface-subtle',
                  icon: 'bg-emerald-500/15 text-emerald-400',
                  shadow: 'shadow-[0_0_16px_rgba(16,185,129,0.15)]',
                },
              }[page.color]!

              return (
                <motion.div
                  key={page.id}
                  initial={{ opacity: 0, x: 15 }}
                  animate={{
                    opacity: isActive ? 1 : 0.08,
                    x: isActive ? 0 : 15,
                    scale: isHighlighted ? 1.04 : 1,
                  }}
                  transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 transition-colors duration-500 ${colorClasses.border} ${colorClasses.bg} ${isHighlighted ? colorClasses.shadow : ''}`}
                >
                  <div className={`rounded-lg p-1 ${colorClasses.icon}`}>
                    <page.icon size={11} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-foreground text-[10px] font-bold leading-none">
                      {page.label}
                    </p>
                    <div className="mt-1 flex gap-1">
                      {[...Array(3)].map((_, j) => (
                        <div key={j} className="bg-muted-foreground/20 h-px w-3 rounded-full" />
                      ))}
                    </div>
                  </div>
                  {isActive && (
                    <CheckCircle2 size={10} className="ml-auto shrink-0 text-emerald-400" />
                  )}
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Background Connection Curves */}
        <svg
          className="text-muted-foreground/30 pointer-events-none absolute inset-0 h-full w-full opacity-[0.35]"
          viewBox="0 0 400 220"
        >
          <path
            d="M120 50 Q 200 110 280 50"
            stroke="currentColor"
            strokeWidth="0.8"
            fill="none"
            strokeDasharray="3 3"
          />
          <path
            d="M120 110 Q 200 110 280 110"
            stroke="currentColor"
            strokeWidth="0.8"
            fill="none"
            strokeDasharray="3 3"
          />
          <path
            d="M120 170 Q 200 110 280 170"
            stroke="currentColor"
            strokeWidth="0.8"
            fill="none"
            strokeDasharray="3 3"
          />
        </svg>
      </div>

      <div className="cortex-max-banner-grid absolute inset-0 -z-10" aria-hidden />
    </div>
  )
}
