'use client'

import React from 'react'
import { motion } from 'framer-motion'
import {
  BarChart3,
  Calendar,
  Columns2,
  FileText,
  Instagram,
  LayoutTemplate,
  List,
  MessagesSquare,
  Table,
  TrendingUp,
  Users,
} from 'lucide-react'
import { FeatureFloatingMockShell } from '@/components/feature-pages/FeatureFloatingMockShell'
import type { PublicAgentLibraryRow } from '@/lib/public-agent-library'
import { MarketingPortraitCircle } from '@/components/marketing/MarketingPortraitCircle'
import { resolveSpacesShowcasePortraits } from '@/components/marketing/marketing-space-showcase-portraits'

const EASE = [0.16, 1, 0.3, 1] as const

const VIEW_CARDS = [
  { label: 'Ad Performance', icon: BarChart3, color: 'rgb(52 211 153)' },
  { label: 'IG Research', icon: Instagram, color: 'rgb(192 132 252)' },
  { label: 'CRM Leads', icon: Users, color: 'rgb(96 165 250)' },
  { label: 'Campaign Funnel', icon: LayoutTemplate, color: 'rgb(251 146 60)' },
  { label: 'Email Analytics', icon: TrendingUp, color: 'rgb(52 211 153)' },
  { label: 'Team Channels', icon: MessagesSquare, color: 'rgb(192 132 252)' },
  { label: 'Project Board', icon: Columns2, color: 'rgb(96 165 250)' },
  { label: 'Asset Library', icon: FileText, color: 'rgb(251 146 60)' },
  { label: 'Content Calendar', icon: Calendar, color: 'rgb(52 211 153)' },
]

export function MarketingSpaceViewsMockup(props: {
  libraryAgents?: PublicAgentLibraryRow[]
}) {
  const p = resolveSpacesShowcasePortraits(props.libraryAgents)

  return (
    <FeatureFloatingMockShell className="!h-[480px] overflow-hidden">
      <div className="relative flex h-full min-h-0 w-full flex-col p-6">
        <motion.div
          className="grid min-h-0 flex-1 grid-cols-3 gap-3 saturate-50 blur-[0.5px]"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.22 }}
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.05 } },
          }}
        >
          {VIEW_CARDS.map((v) => (
            <motion.div
              key={v.label}
              className="glass-card flex flex-col items-center justify-center gap-2 p-4 text-center"
              variants={{
                hidden: { opacity: 0, y: 12, scale: 0.96 },
                show: { opacity: 0.35, y: 0, scale: 1, transition: { duration: 0.4, ease: EASE } },
              }}
            >
              <v.icon size={20} style={{ color: v.color }} strokeWidth={1.5} />
              <span className="text-[10px] font-bold text-white/70">{v.label}</span>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -28, y: 40, rotate: -3 }}
          whileInView={{ opacity: 1, x: 0, y: 0, rotate: -1 }}
          viewport={{ once: true, amount: 0.22 }}
          transition={{ delay: 0.4, duration: 0.6, ease: EASE }}
          className="glass-card absolute bottom-12 left-8 z-20 w-[220px] overflow-hidden p-0 shadow-2xl"
        >
          <div className="border-b border-white/5 px-4 py-3">
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-white/40">
              Switch View
            </h4>
          </div>
          <div className="p-1.5">
            {[
              { label: 'List', icon: List, active: false },
              { label: 'Board', icon: Columns2, active: false },
              { label: 'Table', icon: Table, active: false },
              { label: 'Ad Performance', icon: BarChart3, active: true },
              { label: 'IG Research', icon: Instagram, active: false },
            ].map((item) => (
              <div
                key={item.label}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 transition-colors ${
                  item.active ? 'bg-white/10 text-white' : 'text-white/40'
                }`}
              >
                <item.icon size={14} strokeWidth={item.active ? 2 : 1.5} />
                <span className="text-[12px] font-medium">{item.label}</span>
                {item.active ? (
                  <div className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                ) : null}
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 28, y: -20, rotate: 3 }}
          whileInView={{ opacity: 1, x: 0, y: 0, rotate: 1.5 }}
          viewport={{ once: true, amount: 0.22 }}
          transition={{ delay: 0.55, duration: 0.6, ease: EASE }}
          className="glass-card absolute right-10 top-16 z-30 w-[200px] p-4 shadow-xl"
        >
          <div className="mb-3 flex items-center gap-2">
            <div className="relative shrink-0">
              <MarketingPortraitCircle
                src={p.analystPhoto}
                alt={p.analystFirstName}
                className="h-7 w-7"
              />
              <div className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-black bg-emerald-400" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-tight text-white">
              {p.analystFirstName}{' '}
              <span className="font-semibold lowercase text-white/50">(agent)</span>
            </span>
          </div>
          <p className="text-[11px] leading-relaxed text-white/80">
            &quot;I've updated the <span className="font-medium text-blue-400">Ad Performance</span>{' '}
            view with yesterday's spend and ROAS data.&quot;
          </p>
          <div className="mt-3 flex items-center gap-2 text-[9px] text-white/30">
            <span>Just now</span>
            <span>·</span>
            <span>CRM Sync active</span>
          </div>
        </motion.div>
      </div>
    </FeatureFloatingMockShell>
  )
}
