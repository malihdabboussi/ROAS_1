'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { AtSign, Hash, MessagesSquare, Send } from 'lucide-react'
import { FeatureFloatingMockShell } from '@/components/feature-pages/FeatureFloatingMockShell'
import type { PublicAgentLibraryRow } from '@/lib/public-agent-library'
import { MarketingPortraitCircle } from '@/components/marketing/MarketingPortraitCircle'
import { resolveSpacesShowcasePortraits } from '@/components/marketing/marketing-space-showcase-portraits'

const EASE = [0.16, 1, 0.3, 1] as const

export function MarketingSpaceChannelsMockup(props: {
  libraryAgents?: PublicAgentLibraryRow[]
}) {
  const p = resolveSpacesShowcasePortraits(props.libraryAgents)

  return (
    <FeatureFloatingMockShell className="!h-[480px] overflow-hidden">
      <div className="relative flex h-full min-h-0 w-full flex-col p-6">
        <motion.div
          className="flex flex-1 flex-col gap-4 opacity-20 saturate-50 blur-[1px]"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 0.2 }}
          viewport={{ once: true, amount: 0.22 }}
        >
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="h-8 w-8 shrink-0 rounded-full bg-white/10" />
              <div className="flex-1 space-y-2">
                <div className="h-2 w-24 rounded-full bg-white/20" />
                <div className="h-3 w-full rounded-full bg-white/10" />
                <div className="h-3 w-2/3 rounded-full bg-white/10" />
              </div>
            </div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -28, y: 30, rotate: -2 }}
          whileInView={{ opacity: 1, x: 0, y: 0, rotate: -1 }}
          viewport={{ once: true, amount: 0.22 }}
          transition={{ delay: 0.4, duration: 0.6, ease: EASE }}
          className="glass-card absolute bottom-16 left-8 z-20 w-[180px] p-0 shadow-2xl"
        >
          <div className="border-b border-white/5 px-4 py-3">
            <div className="flex items-center gap-2">
              <MessagesSquare size={14} className="text-white/40" />
              <h4 className="text-[11px] font-bold uppercase tracking-widest text-white/40">
                Channels
              </h4>
            </div>
          </div>
          <div className="p-1.5">
            {[
              { label: 'growth', active: true },
              { label: 'product', active: false },
              { label: 'ops', active: false },
              { label: 'general', active: false },
            ].map((ch) => (
              <div
                key={ch.label}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 transition-colors ${
                  ch.active ? 'bg-white/10 text-white' : 'text-white/30'
                }`}
              >
                <Hash size={12} strokeWidth={ch.active ? 2.5 : 1.5} />
                <span className="text-[12px] font-medium">{ch.label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, amount: 0.22 }}
          transition={{ delay: 0.55, duration: 0.65, ease: EASE }}
          className="glass-card absolute right-8 top-12 z-30 w-[320px] overflow-hidden p-0 shadow-2xl"
          style={{ border: '1px solid rgb(96 165 250 / 0.2)' }}
        >
          <div className="border-b border-white/5 bg-blue-500/5 px-4 py-3">
            <div className="flex items-center gap-2">
              <Hash size={14} className="text-blue-400" />
              <span className="text-[12px] font-bold text-white">growth</span>
            </div>
          </div>

          <div className="max-h-[240px] space-y-4 overflow-hidden p-4">
            <div className="flex items-start gap-3">
              <MarketingPortraitCircle src={p.humanPhoto} alt="" className="h-7 w-7 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-white">Sefy</span>
                  <span className="text-[9px] text-white/30">10:42 AM</span>
                </div>
                <p className="mt-1 text-[12px] leading-relaxed text-white/80">
                  <span className="font-medium text-blue-400">@{p.analystFirstName}</span> can you give
                  me an update on the Q2 ad variants?
                </p>
              </div>
            </div>

            <motion.div
              className="flex items-start gap-3"
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.2, duration: 0.5 }}
            >
              <MarketingPortraitCircle src={p.analystPhoto} alt="" className="h-7 w-7 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-white">{p.analystFirstName}</span>
                  <span className="badge-glass-blue px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest">
                    Agent
                  </span>
                </div>
                <p className="mt-1 text-[12px] leading-relaxed text-white/80">
                  I've drafted 3 variants for the Facebook campaign. You can review them in the{' '}
                  <span className="text-emerald-400 underline underline-offset-2">Ad Copy Drafts</span>{' '}
                  doc.
                </p>
              </div>
            </motion.div>
          </div>

          <div className="border-t border-white/5 p-3">
            <div className="flex items-center gap-2 rounded-full bg-white/5 px-4 py-2">
              <AtSign size={12} className="text-white/30" />
              <span className="text-[11px] text-white/30">Reply to #growth...</span>
              <Send size={12} className="ml-auto text-white/20" />
            </div>
          </div>
        </motion.div>
      </div>
    </FeatureFloatingMockShell>
  )
}
