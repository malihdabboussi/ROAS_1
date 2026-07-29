'use client'

import React, { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  CheckCheck,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Mic,
  MoreVertical,
  Paperclip,
  Send,
  Smile,
  Target,
} from 'lucide-react'
import { FeatureFloatingMockShell } from '@/components/feature-pages/FeatureFloatingMockShell'
import {
  MARKETING_AGENT_LIBRARY_FALLBACK,
  VIBEY_MARKETING_PORTRAIT_FALLBACK,
} from '@/lib/agent-library-fallback'

const DIGEST_CONTENT = [
  { text: 'Good morning! Autopilot ran 12 operations while you slept.', type: 'system' },
  { text: '8 missions were completed successfully.', type: 'success' },
  { text: '2 missions are blocked and need your eyes.', type: 'warning' },
  { text: 'Operational pace is at 94% efficiency.', type: 'system' },
]

export function MarketingDailyDigestMockup(props?: { vibeyPortraitUrl?: string }) {
  const [visibleIdx, setVisibleIdx] = useState(0)
  const [isTyping, setIsTyping] = useState(false)
  const vibeySrc = props?.vibeyPortraitUrl?.trim() || VIBEY_MARKETING_PORTRAIT_FALLBACK

  useEffect(() => {
    let isMounted = true
    const cycle = async () => {
      if (!isMounted) return
      setVisibleIdx(0)

      for (let i = 0; i < DIGEST_CONTENT.length; i++) {
        setIsTyping(true)
        await new Promise((r) => setTimeout(r, 1200))
        if (!isMounted) return
        setIsTyping(false)
        setVisibleIdx(i + 1)
        await new Promise((r) => setTimeout(r, 600))
      }

      await new Promise((r) => setTimeout(r, 5000))
      if (isMounted) cycle()
    }

    cycle()
    return () => {
      isMounted = false
    }
  }, [])

  return (
    <FeatureFloatingMockShell className="!min-h-[460px]">
      {/* Telegram App Interface Wrapper */}
      <div className="absolute inset-0 flex flex-col overflow-hidden bg-[#0f0f0f]">
        {/* 1. Telegram Header (Contact Info) */}
        <div className="z-20 flex items-center gap-3 border-b border-white/5 bg-[#1c1c1c] px-4 py-3">
          <ChevronLeft size={20} className="cursor-pointer text-[#50a2e9]" />
          <div className="relative">
            <img
              src={vibeySrc}
              alt=""
              className="h-10 w-10 rounded-full border border-white/10 object-cover shadow-inner"
            />
            <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#1c1c1c] bg-emerald-500" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[14px] font-bold leading-tight text-white">Pixel</h3>
            <p className="text-[11px] text-[#50a2e9]">bot</p>
          </div>
          <MoreVertical size={18} className="cursor-pointer text-white/40" />
        </div>

        {/* 2. Chat Area */}
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] bg-repeat p-4 opacity-95">
          {/* Date Header */}
          <div className="self-center rounded-full border border-white/5 bg-black/30 px-3 py-1 shadow-sm backdrop-blur-md">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">
              Today
            </span>
          </div>

          {/* ROAS Message Bubble */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, x: -20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            className="relative max-w-[90%] self-start"
          >
            <div className="rounded-2xl rounded-tl-sm border border-white/5 bg-[#212121] p-4 shadow-xl">
              <div className="space-y-3.5">
                <AnimatePresence mode="popLayout">
                  {DIGEST_CONTENT.slice(0, visibleIdx).map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-2.5"
                    >
                      <div className="mt-1">
                        {item.type === 'success' ? (
                          <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                        ) : item.type === 'warning' ? (
                          <div className="h-1.5 w-1.5 rounded-full bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.6)]" />
                        ) : (
                          <div className="h-1.5 w-1.5 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.6)]" />
                        )}
                      </div>
                      <p className="text-[13px] font-medium leading-snug text-white/90">
                        {item.text}
                      </p>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {isTyping && (
                  <div className="flex items-center gap-1 px-1 pt-1">
                    <motion.div
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ repeat: Infinity, duration: 0.8 }}
                      className="h-1.5 w-1.5 rounded-full bg-[#50a2e9]"
                    />
                    <motion.div
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ repeat: Infinity, duration: 0.8, delay: 0.2 }}
                      className="h-1.5 w-1.5 rounded-full bg-[#50a2e9]"
                    />
                    <motion.div
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ repeat: Infinity, duration: 0.8, delay: 0.4 }}
                      className="h-1.5 w-1.5 rounded-full bg-[#50a2e9]"
                    />
                  </div>
                )}
              </div>

              {/* Message Meta (Time + Status) */}
              <div className="mt-3 flex items-center justify-end gap-1.5">
                <span className="text-[10px] font-medium text-white/20">08:00</span>
                <CheckCheck size={14} className="text-[#50a2e9]" />
              </div>
            </div>

            {/* Inline Keyboard (Real Telegram logic) */}
            <AnimatePresence>
              {visibleIdx === DIGEST_CONTENT.length && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 grid grid-cols-2 gap-1.5"
                >
                  <button className="rounded-lg border border-white/5 bg-[#212121]/80 px-3 py-2.5 text-[11px] font-bold text-[#50a2e9] shadow-lg backdrop-blur-md transition-colors hover:bg-[#2a2a2a]">
                    Review 2 Blocks
                  </button>
                  <button className="rounded-lg border border-white/5 bg-[#212121]/80 px-3 py-2.5 text-center text-[11px] font-bold text-[#50a2e9] shadow-lg backdrop-blur-md transition-colors hover:bg-[#2a2a2a]">
                    Scale Campaign
                  </button>
                  <button className="col-span-2 rounded-lg border border-white/5 bg-[#212121]/80 px-3 py-2.5 text-[11px] font-bold text-[#50a2e9] shadow-lg backdrop-blur-md transition-colors hover:bg-[#2a2a2a]">
                    Open Mission Control
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* 3. Telegram Bottom Bar (Message Input) */}
        <div className="z-20 flex items-center gap-3 bg-[#1c1c1c] p-3">
          <Smile size={22} className="cursor-pointer text-white/30" />
          <div className="flex flex-1 items-center justify-between rounded-full border border-white/5 bg-[#0f0f0f] px-4 py-2">
            <span className="text-[13px] text-white/30">Message</span>
            <Paperclip size={18} className="rotate-45 cursor-pointer text-white/30" />
          </div>
          <div className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-[#50a2e9] shadow-lg transition-all hover:brightness-110">
            <Mic size={20} className="text-white" />
          </div>
        </div>
      </div>
    </FeatureFloatingMockShell>
  )
}
