'use client'

import React, { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
// Target is missing from my imports, using a replacement from lucide-react or another one
import {
  CheckCircle2,
  Database,
  FileText,
  MessageSquare,
  Mic,
  Target,
  Type,
  User,
  Video,
  Zap,
} from 'lucide-react'
import { FeatureFloatingMockShell } from '@/components/feature-pages/FeatureFloatingMockShell'

const RAW_INPUTS = [
  { id: 'pdf', icon: FileText, label: 'Strategy_v2.pdf', color: 'text-blue-400' },
  { id: 'zoom', icon: Video, label: 'Fathom: Weekly Sync', color: 'text-purple-400' },
  { id: 'notes', icon: Mic, label: 'Voice Note: ICP pain', color: 'text-emerald-400' },
  { id: 'slack', icon: MessageSquare, label: '#marketing-strategy', color: 'text-orange-400' },
]

const SIGNALS = [
  { id: 'voice', icon: User, label: 'Brand Voice', category: 'Identity', color: 'purple' },
  { id: 'icp', icon: Target, label: 'ICP Pain Points', category: 'Strategy', color: 'blue' },
  { id: 'framework', icon: Zap, label: 'PAS Framework', category: 'Expertise', color: 'emerald' },
  { id: 'data', icon: Database, label: 'Market Context', category: 'Knowledge', color: 'orange' },
]

export type MarketingRawToSignalMockupProps = {
  /** No mock shell or grid — flush on parent (e.g. pitch deck). */
  embedTransparent?: boolean
}

export function MarketingRawToSignalMockup({
  embedTransparent = false,
}: MarketingRawToSignalMockupProps) {
  const [scanProgress, setScanProgress] = useState(0)
  const [activeSignalIndex, setActiveSignalIndex] = useState(-1)

  useEffect(() => {
    const interval = setInterval(() => {
      setScanProgress((prev) => (prev >= 100 ? 0 : prev + 0.5))
    }, 20)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    // Logic to "trigger" signal appearance based on scan progress
    if (scanProgress > 20 && scanProgress < 30) setActiveSignalIndex(0)
    else if (scanProgress > 45 && scanProgress < 55) setActiveSignalIndex(1)
    else if (scanProgress > 70 && scanProgress < 80) setActiveSignalIndex(2)
    else if (scanProgress > 90) setActiveSignalIndex(3)
    else if (scanProgress < 5) setActiveSignalIndex(-1)
  }, [scanProgress])

  const diagram = (
    <>
      <div className="relative flex h-[300px] w-full max-w-[500px] items-center justify-between px-3 sm:px-8">
        {/* Left: Raw Pile */}
        <div className="z-10 flex flex-col gap-4">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-white/20">
            Unstructured Raw
          </p>
          {RAW_INPUTS.map((input, idx) => (
            <motion.div
              key={input.id}
              animate={{
                x: scanProgress > idx * 15 + 10 ? 20 : 0,
                opacity: scanProgress > idx * 15 + 10 ? 0.2 : 1,
                filter: scanProgress > idx * 15 + 10 ? 'blur(2px)' : 'blur(0px)',
              }}
              className="flex w-[120px] items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-2 sm:w-[160px] sm:gap-3 sm:px-3"
            >
              <input.icon size={14} className={input.color} />
              <span className="truncate text-[11px] font-medium text-white/60">{input.label}</span>
            </motion.div>
          ))}
        </div>

        {/* The Scanline */}
        <motion.div
          className="absolute bottom-0 top-0 z-20 w-[2px] bg-gradient-to-b from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_rgba(52,211,153,0.8)]"
          style={{ left: `${scanProgress}%` }}
        >
          <div className="absolute -left-1 top-1/2 -translate-y-1/2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          </div>
        </motion.div>

        {/* Right: Crystallized Signals */}
        <div className="z-10 flex flex-col items-end gap-4">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-white/20">
            Crystallized Signals
          </p>
          <div className="space-y-3">
            {SIGNALS.map((signal, idx) => (
              <motion.div
                key={signal.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{
                  opacity: activeSignalIndex >= idx ? 1 : 0.1,
                  x: activeSignalIndex >= idx ? 0 : 20,
                  scale: activeSignalIndex === idx ? 1.05 : 1,
                }}
                className={`flex w-[140px] items-center gap-2 rounded-xl border px-3 py-2 backdrop-blur-xl transition-colors duration-500 sm:w-[180px] sm:gap-3 sm:px-4 sm:py-2.5 ${
                  activeSignalIndex === idx
                    ? `border-${signal.color}-500/50 bg-${signal.color}-500/10 shadow-[0_0_20px_rgba(var(--accent-${signal.color}-rgb),0.15)]`
                    : 'border-white/5 bg-white/[0.02]'
                }`}
              >
                <div
                  className={`rounded-lg p-1.5 bg-${signal.color}-500/20 text-${signal.color}-400`}
                >
                  <signal.icon size={14} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold leading-none text-white/90">{signal.label}</p>
                  <p
                    className={`text-[9px] font-medium text-${signal.color}-400/60 mt-1 uppercase tracking-tighter`}
                  >
                    {signal.category}
                  </p>
                </div>
                {activeSignalIndex >= idx && (
                  <CheckCircle2 size={12} className="ml-auto text-emerald-400" />
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Connecting Lines (Background) */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full opacity-10"
          viewBox="0 0 500 300"
        >
          <path
            d="M180 80 Q 250 150 320 80"
            stroke="white"
            strokeWidth="1"
            fill="none"
            strokeDasharray="4 4"
          />
          <path
            d="M180 140 Q 250 150 320 140"
            stroke="white"
            strokeWidth="1"
            fill="none"
            strokeDasharray="4 4"
          />
          <path
            d="M180 200 Q 250 150 320 200"
            stroke="white"
            strokeWidth="1"
            fill="none"
            strokeDasharray="4 4"
          />
        </svg>
      </div>

      {!embedTransparent && (
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px]" />
      )}
    </>
  )

  if (embedTransparent) {
    return (
      <div className="relative flex min-h-[300px] w-full items-center justify-center overflow-visible bg-transparent sm:min-h-[360px]">
        {diagram}
      </div>
    )
  }

  return (
    <FeatureFloatingMockShell className="flex !min-h-[360px] items-center justify-center overflow-hidden sm:!min-h-[420px]">
      {diagram}
    </FeatureFloatingMockShell>
  )
}
