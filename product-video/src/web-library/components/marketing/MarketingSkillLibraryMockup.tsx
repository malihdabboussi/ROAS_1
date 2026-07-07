'use client'

import React from 'react'
import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowRight,
  BarChart3,
  CreditCard,
  Globe2,
  History,
  Library,
  Linkedin,
  Play,
  RotateCcw,
  ScanSearch,
  Search,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react'
import { FeatureFloatingMockShell } from '@/components/feature-pages/FeatureFloatingMockShell'

const EASE = [0.16, 1, 0.3, 1] as const

// ── Shared Colors ───────────────────────────────────────────────────────────
const C = {
  emerald: 'rgb(52 211 153)',
  blue: 'rgb(96 165 250)',
  orange: 'rgb(251 146 60)',
  purple: 'rgb(192 132 252)',
  rose: 'rgb(251 113 133)',
  indigo: 'rgb(129 140 248)',
  cyan: 'rgb(34 211 238)',
  red: 'rgb(248 113 113)',
  lime: 'rgb(163 230 53)',
  linkedin: 'rgb(10 102 194)',
  border: 'rgba(255,255,255,0.08)',
}

type SharedSkill = { name: string; color: string; icon: LucideIcon; runs: number }

/** Same twelve plays as `MarketingSkillStackMockup` — fills the library shell */
const SHARED_SKILLS: SharedSkill[] = [
  { name: 'Lead Magnet Funnel', color: C.emerald, icon: Zap, runs: 42 },
  { name: 'Webinar Registration', color: C.orange, icon: Play, runs: 28 },
  { name: 'Product Launch', color: C.purple, icon: Library, runs: 12 },
  { name: 'CRM Pipeline Nurture', color: C.orange, icon: Users, runs: 85 },
  { name: 'Paid Media Push', color: C.blue, icon: TrendingUp, runs: 64 },
  { name: 'Checkout & Revenue', color: C.emerald, icon: CreditCard, runs: 51 },
  { name: 'Ops Command Digest', color: C.rose, icon: Sparkles, runs: 31 },
  { name: 'Executive Report Pack', color: C.indigo, icon: BarChart3, runs: 19 },
  { name: 'LinkedIn ABM Touches', color: C.linkedin, icon: Linkedin, runs: 37 },
  { name: 'Winback & Dunning', color: C.red, icon: RotateCcw, runs: 22 },
  { name: 'Competitive Brief', color: C.cyan, icon: ScanSearch, runs: 14 },
  { name: 'SEO Content Cluster', color: C.lime, icon: Globe2, runs: 33 },
]

const gridContainerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.06,
    },
  },
}

const gridCardVariants = {
  hidden: { opacity: 0, y: 14, scale: 0.94 },
  show: {
    opacity: 0.3,
    y: 0,
    scale: 1,
    transition: { duration: 0.45, ease: EASE },
  },
}

export function MarketingSkillLibraryMockup() {
  return (
    <FeatureFloatingMockShell className="!h-[480px] overflow-hidden">
      <div className="relative flex h-full min-h-0 w-full flex-col p-6">
        {/* ── Background: Library Grid — 2 cols × 6 rows, stretches to shell bottom ── */}
        <motion.div
          className="grid min-h-0 flex-1 grid-cols-2 gap-x-3 gap-y-2 [grid-template-rows:repeat(6,minmax(0,1fr))] saturate-50 blur-[0.5px]"
          variants={gridContainerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.22 }}
        >
          {SHARED_SKILLS.map((skill) => (
            <motion.div
              key={skill.name}
              variants={gridCardVariants}
              className="glass-card flex min-h-0 items-center gap-3 p-3"
              style={{ border: `1px solid ${C.border}` }}
            >
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                style={{ background: `${skill.color}15`, color: skill.color }}
              >
                <skill.icon size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-[11px] font-bold leading-tight text-white">{skill.name}</p>
                <p className="text-[9px] text-white/40">{skill.runs} runs · 94%</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* ── Search Overlay (Library Card Style) ── */}
        <motion.div
          className="absolute left-1/2 top-28 z-10 w-[240px] -translate-x-1/2 opacity-40"
          initial={{ opacity: 0, y: -12, scale: 0.96 }}
          whileInView={{ opacity: 0.4, y: 0, scale: 1 }}
          viewport={{ once: true, amount: 0.22 }}
          transition={{ delay: 0.38, duration: 0.5, ease: EASE }}
        >
          <div className="glass-card flex items-center gap-3 p-3" style={{ border: `1px solid ${C.border}` }}>
            <motion.div
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-white/40"
              initial={{ scale: 0.85 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true, amount: 0.22 }}
              transition={{ delay: 0.55, duration: 0.35, ease: EASE }}
            >
              <Search size={16} />
            </motion.div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold text-white/40">Search team library...</p>
              <p className="text-[9px] text-white/20">Find plays, templates, and sequences</p>
            </div>
          </div>
        </motion.div>

        {/* ── Foreground: Active Skill Selection (Left) ── */}
        <motion.div
          initial={{ opacity: 0, x: -28, y: 48, rotate: -5 }}
          whileInView={{ opacity: 1, x: 0, y: 0, rotate: -1.5 }}
          viewport={{ once: true, amount: 0.22 }}
          transition={{ delay: 0.48, duration: 0.65, ease: EASE }}
          className="glass-card absolute bottom-12 left-8 z-20 w-[240px] p-4 shadow-2xl"
          style={{ border: `1px solid ${C.emerald}30` }}
        >
          <div className="mb-4 flex items-center gap-3">
            <motion.div
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400 border border-emerald-400/20"
              initial={{ scale: 0.8, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true, amount: 0.22 }}
              transition={{ delay: 0.62, duration: 0.45, ease: EASE }}
            >
              <Zap size={20} />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.22 }}
              transition={{ delay: 0.72, duration: 0.4, ease: EASE }}
            >
              <h4 className="text-[12px] font-bold text-white">Lead Magnet Funnel</h4>
              <p className="text-[9px] font-medium text-emerald-400 uppercase tracking-widest">Shared Skill</p>
            </motion.div>
          </div>

          <motion.div
            className="space-y-2.5"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.22 }}
            transition={{ delay: 0.82, duration: 0.35 }}
          >
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-white/50">Author</span>
              <span className="font-medium text-white/80">Sefy Tofan</span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-white/50">Last Run</span>
              <span className="font-medium text-white/80">2h ago · Growth Team</span>
            </div>
            <div className="h-px w-full bg-white/5" />
          </motion.div>

          <motion.button
            type="button"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-400 px-3 py-2 text-[11px] font-bold text-black transition-transform hover:scale-[1.02] active:scale-[0.98]"
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.22 }}
            transition={{ delay: 0.92, duration: 0.4, ease: EASE }}
          >
            Run Play
            <ArrowRight size={14} strokeWidth={3} />
          </motion.button>
        </motion.div>

        {/* ── Foreground: Feedback/Improvement (Right) ── */}
        <motion.div
          initial={{ opacity: 0, x: 28, y: -28, rotate: 5 }}
          whileInView={{ opacity: 1, x: 0, y: 0, rotate: 2 }}
          viewport={{ once: true, amount: 0.22 }}
          transition={{ delay: 0.58, duration: 0.65, ease: EASE }}
          className="glass-card absolute right-10 top-16 z-30 w-[190px] p-3 shadow-xl"
          style={{ border: `1px solid ${C.blue}30` }}
        >
          <motion.div
            className="mb-3 flex items-center gap-2"
            initial={{ opacity: 0, x: 6 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.22 }}
            transition={{ delay: 0.75, duration: 0.35, ease: EASE }}
          >
            <History size={14} className="text-blue-400" />
            <span className="text-[10px] font-bold text-white uppercase tracking-tight">Loop Performance</span>
          </motion.div>

          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-[9px]">
                <span className="text-white/40">Engagement lift</span>
                <span className="text-emerald-400 font-bold">+24%</span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-white/5">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: '82%' }}
                  viewport={{ once: true, amount: 0.22 }}
                  transition={{ delay: 0.95, duration: 0.9, ease: EASE }}
                  className="h-full bg-emerald-400"
                />
              </div>
            </div>

            <motion.div
              className="rounded-lg border border-blue-400/10 bg-blue-400/5 p-2"
              initial={{ opacity: 0, y: 6 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.22 }}
              transition={{ delay: 1.05, duration: 0.45, ease: EASE }}
            >
              <p className="text-[9px] leading-relaxed text-blue-200/70">
                &ldquo;Funnel structure improved based on Q1 conversion data.&rdquo;
              </p>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </FeatureFloatingMockShell>
  )
}
