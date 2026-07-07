'use client'

import React from 'react'
import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { Bot, FileText, HardDrive, MessageSquare, Pin } from 'lucide-react'
import { FeatureFloatingMockShell } from '@/components/feature-pages/FeatureFloatingMockShell'

const EASE = [0.16, 1, 0.3, 1] as const

const C = {
  emerald: 'rgb(52 211 153)',
  blue: 'rgb(96 165 250)',
  purple: 'rgb(192 132 252)',
  amber: 'rgb(251 191 36)',
  border: 'rgba(255,255,255,0.08)',
}

type GridDoc = {
  title: string
  source: 'space' | 'studio' | 'missions' | 'drive'
  icon: LucideIcon
  color: string
  chip: string
}

const GRID_DOCS: GridDoc[] = [
  { title: 'Mission brief · Paid social refresh', source: 'missions', icon: Bot, color: C.purple, chip: 'Missions' },
  { title: 'Brand guidelines · Q2', source: 'drive', icon: HardDrive, color: C.amber, chip: 'Drive' },
  { title: 'One-pager · Founder story', source: 'studio', icon: MessageSquare, color: C.blue, chip: 'Studio' },
  { title: 'Kickoff notes · Product', source: 'space', icon: FileText, color: C.emerald, chip: 'Space' },
  { title: 'Creative variants spec', source: 'missions', icon: Bot, color: C.purple, chip: 'Missions' },
  { title: 'Finance workbook', source: 'drive', icon: HardDrive, color: C.amber, chip: 'Drive' },
  { title: 'Q2 campaign narrative', source: 'studio', icon: MessageSquare, color: C.blue, chip: 'Studio' },
  { title: 'Launch checklist', source: 'space', icon: FileText, color: C.emerald, chip: 'Space' },
  { title: 'Customer interview · Acme', source: 'space', icon: FileText, color: C.emerald, chip: 'Space' },
  { title: 'Pitch deck draft', source: 'studio', icon: MessageSquare, color: C.blue, chip: 'Studio' },
  { title: 'Voice & tone v3', source: 'drive', icon: HardDrive, color: C.amber, chip: 'Drive' },
  { title: 'Onboarding playbook', source: 'missions', icon: Bot, color: C.purple, chip: 'Missions' },
]

const gridContainerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.06,
    },
  },
}

const gridCardVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.96 },
  show: {
    opacity: 0.32,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: EASE },
  },
}

export function MarketingDocumentsMockup() {
  return (
    <FeatureFloatingMockShell className="!h-[480px] overflow-hidden">
      <div className="relative flex h-full min-h-0 w-full flex-col p-6">
        {/* ── Background: Library Grid — 3 cols × 4 rows ── */}
        <motion.div
          className="grid min-h-0 flex-1 grid-cols-3 gap-x-3 gap-y-2 [grid-template-rows:repeat(4,minmax(0,1fr))] saturate-50 blur-[0.5px]"
          variants={gridContainerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.22 }}
        >
          {GRID_DOCS.map((d) => (
            <motion.div
              key={d.title}
              variants={gridCardVariants}
              className="glass-card flex min-h-0 flex-col gap-2 p-3"
              style={{ border: `1px solid ${C.border}` }}
            >
              <div className="flex items-center justify-between gap-2">
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: `${d.color}1a`, color: d.color, border: `1px solid ${d.color}33` }}
                >
                  <d.icon size={13} strokeWidth={2} />
                </div>
                <span
                  className="border-color-glass rounded-full border bg-white/[0.04] px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest text-white/55"
                >
                  {d.chip}
                </span>
              </div>
              <p className="line-clamp-2 text-[10px] font-bold leading-tight text-white">{d.title}</p>
              <div
                className="mt-auto h-[2px] w-full rounded-full"
                style={{ background: `linear-gradient(90deg, ${d.color}66, transparent)` }}
              />
            </motion.div>
          ))}
        </motion.div>

        {/* ── Foreground: Pinned doc card (left) ── */}
        <motion.div
          initial={{ opacity: 0, x: -28, y: 36, rotate: -5 }}
          whileInView={{ opacity: 1, x: 0, y: 0, rotate: -1.5 }}
          viewport={{ once: true, amount: 0.22 }}
          transition={{ delay: 0.5, duration: 0.6, ease: EASE }}
          className="glass-card absolute bottom-12 left-8 z-20 w-[244px] p-4 shadow-2xl"
          style={{ border: `1px solid ${C.emerald}30` }}
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <motion.div
                className="flex h-10 w-10 items-center justify-center rounded-xl border"
                style={{
                  background: `${C.emerald}1a`,
                  borderColor: `${C.emerald}33`,
                  color: C.emerald,
                }}
                initial={{ scale: 0.8, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true, amount: 0.22 }}
                transition={{ delay: 0.62, duration: 0.4, ease: EASE }}
              >
                <FileText size={18} strokeWidth={2} />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: -6 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.22 }}
                transition={{ delay: 0.72, duration: 0.4, ease: EASE }}
              >
                <h4 className="text-[12px] font-bold leading-tight text-white">Launch checklist</h4>
                <p className="text-[9px] font-medium uppercase tracking-widest" style={{ color: C.emerald }}>
                  Pinned · Space
                </p>
              </motion.div>
            </div>
            <Pin size={13} className="text-white/35" strokeWidth={2} />
          </div>

          <motion.div
            className="space-y-2"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.22 }}
            transition={{ delay: 0.82, duration: 0.35 }}
          >
            <div className="h-1.5 w-full rounded-full bg-white/5">
              <motion.div
                className="h-full rounded-full"
                style={{ background: C.emerald }}
                initial={{ width: 0 }}
                whileInView={{ width: '72%' }}
                viewport={{ once: true, amount: 0.22 }}
                transition={{ delay: 0.95, duration: 0.8, ease: EASE }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-white/50">Updated</span>
              <span className="font-medium text-white/80">2h ago · Sefy</span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-white/50">Sources</span>
              <span className="font-medium text-white/80">Studio · Drive · Space</span>
            </div>
          </motion.div>
        </motion.div>

        {/* ── Foreground: Studio thread → doc card (right) ── */}
        <motion.div
          initial={{ opacity: 0, x: 28, y: -24, rotate: 5 }}
          whileInView={{ opacity: 1, x: 0, y: 0, rotate: 2 }}
          viewport={{ once: true, amount: 0.22 }}
          transition={{ delay: 0.6, duration: 0.6, ease: EASE }}
          className="glass-card absolute right-10 top-16 z-30 w-[200px] p-3 shadow-xl"
          style={{ border: `1px solid ${C.blue}30` }}
        >
          <motion.div
            className="mb-2 flex items-center gap-2"
            initial={{ opacity: 0, x: 6 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.22 }}
            transition={{ delay: 0.78, duration: 0.35, ease: EASE }}
          >
            <MessageSquare size={13} style={{ color: C.blue }} strokeWidth={2} />
            <span className="text-[10px] font-bold uppercase tracking-tight text-white">Studio · → Doc</span>
          </motion.div>

          <p className="mb-2 text-[10px] font-bold leading-tight text-white">Q2 campaign narrative</p>

          <div className="space-y-1.5">
            {[88, 64, 72].map((w, i) => (
              <motion.div
                key={i}
                className="h-1 w-full overflow-hidden rounded-full bg-white/5"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, amount: 0.22 }}
                transition={{ delay: 0.92 + i * 0.08, duration: 0.3 }}
              >
                <motion.div
                  className="h-full"
                  style={{ background: C.blue, opacity: 0.6 }}
                  initial={{ width: 0 }}
                  whileInView={{ width: `${w}%` }}
                  viewport={{ once: true, amount: 0.22 }}
                  transition={{ delay: 0.96 + i * 0.08, duration: 0.55, ease: EASE }}
                />
              </motion.div>
            ))}
          </div>

          <motion.div
            className="mt-3 rounded-lg border border-blue-400/10 bg-blue-400/5 p-2"
            initial={{ opacity: 0, y: 6 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.22 }}
            transition={{ delay: 1.1, duration: 0.4, ease: EASE }}
          >
            <p className="text-[9px] leading-relaxed text-blue-200/70">
              &ldquo;Drafted from your Studio thread on Tuesday — synced live.&rdquo;
            </p>
          </motion.div>
        </motion.div>
      </div>
    </FeatureFloatingMockShell>
  )
}
