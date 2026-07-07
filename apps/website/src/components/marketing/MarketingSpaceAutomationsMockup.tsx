'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Database, Mic } from 'lucide-react'
import { FeatureFloatingMockShell } from '@/components/feature-pages/FeatureFloatingMockShell'
import type { PublicAgentLibraryRow } from '@/lib/public-agent-library'
import { MarketingPortraitCircle } from '@/components/marketing/MarketingPortraitCircle'
import { resolveSpacesShowcasePortraits } from '@/components/marketing/marketing-space-showcase-portraits'

const EASE = [0.16, 1, 0.3, 1] as const

function StepGap() {
  return <div className="h-2 w-full max-w-[300px] shrink-0 rounded-full bg-white/[0.04]" aria-hidden />
}

export function MarketingSpaceAutomationsMockup(props: {
  libraryAgents?: PublicAgentLibraryRow[]
}) {
  const p = resolveSpacesShowcasePortraits(props.libraryAgents)

  return (
    <FeatureFloatingMockShell className="!h-[480px] overflow-hidden">
      <div className="flex h-full min-h-0 w-full flex-col overflow-hidden px-4 pb-4 pt-4 md:px-5">
        <div className="relative z-[1] mx-auto flex w-full max-w-[300px] min-h-0 flex-1 flex-col justify-center gap-0 overflow-y-auto py-2">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="glass-card w-full shrink-0 px-4 py-3.5 shadow-lg"
            style={{ border: '1px solid rgb(251 146 60 / 0.35)' }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-orange-400/35 bg-orange-500/25 text-orange-200">
                <Mic size={18} strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-wider text-orange-400/90">
                  When
                </p>
                <p className="mt-1 text-[13px] font-bold leading-snug text-white">
                  Fathom recording finished
                </p>
              </div>
            </div>
          </motion.div>

          <StepGap />

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ delay: 0.08, duration: 0.4, ease: EASE }}
            className="glass-card w-full shrink-0 px-4 py-3.5 shadow-lg"
            style={{ border: '1px solid rgb(192 132 252 / 0.32)' }}
          >
            <div className="flex items-start gap-3">
              <MarketingPortraitCircle
                src={p.analystPhoto}
                alt={p.analystFirstName}
                className="h-10 w-10 shrink-0"
              />
              <div className="min-w-0">
                <p className="truncate text-[11px] font-bold text-white">{p.analystFirstName}</p>
                <p className="mt-1 text-[12px] font-medium leading-snug text-white/80">
                  Pull leads from the call and normalize for CRM.
                </p>
                <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                  <motion.div
                    className="h-full rounded-full bg-purple-400/70"
                    initial={{ width: 0 }}
                    whileInView={{ width: '92%' }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ delay: 0.35, duration: 0.65, ease: EASE }}
                  />
                </div>
              </div>
            </div>
          </motion.div>

          <StepGap />

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ delay: 0.14, duration: 0.4, ease: EASE }}
            className="glass-card w-full shrink-0 px-4 py-3.5 shadow-lg"
            style={{ border: '1px solid rgb(52 211 153 / 0.32)' }}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-400/35 bg-emerald-500/20 text-emerald-200">
                <Database size={18} strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-400/90">
                  Then
                </p>
                <p className="mt-1 text-[13px] font-bold leading-snug text-white">
                  Fourteen contacts land in CRM and your Space board refreshes.
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 0.55 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ delay: 0.4, duration: 0.35 }}
          className="text-color-dim relative z-[1] mt-auto shrink-0 pt-3 text-center text-[10px] leading-snug"
        >
          No tab-hopping—you wake up and it&apos;s done.
        </motion.p>
      </div>
    </FeatureFloatingMockShell>
  )
}
