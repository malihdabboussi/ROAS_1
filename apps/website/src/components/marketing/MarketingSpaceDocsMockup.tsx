'use client'

import React from 'react'
import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { FileText, HardDrive } from 'lucide-react'
import { FeatureFloatingMockShell } from '@/components/feature-pages/FeatureFloatingMockShell'
import type { PublicAgentLibraryRow } from '@/lib/public-agent-library'
import { MarketingPortraitCircle } from '@/components/marketing/MarketingPortraitCircle'
import {
  marketingAgentPortraitByRoleKey,
  resolveSpacesShowcasePortraits,
} from '@/components/marketing/marketing-space-showcase-portraits'

const EASE = [0.16, 1, 0.3, 1] as const

type DocOwner =
  | { kind: 'agent'; roleKey: 'analyst' | 'copywriter'; name: string }
  | { kind: 'drive'; icon: LucideIcon; name: string }
  | { kind: 'space'; icon: LucideIcon; name: string }

type DocCard = {
  title: string
  updatedAt: string
  preview: number[]
  owner: DocOwner
  fresh?: boolean
}

const FILTERS = ['All', 'Agents', 'Drive', 'Space'] as const

const DOCS: DocCard[] = [
  {
    title: 'Q2 GTM Strategy',
    updatedAt: 'Just now',
    preview: [90, 76, 60, 84],
    owner: { kind: 'agent', roleKey: 'analyst', name: 'Atlas' },
    fresh: true,
  },
  {
    title: 'Brand Guidelines',
    updatedAt: '1d ago',
    preview: [82, 90, 64],
    owner: { kind: 'drive', icon: HardDrive, name: 'Drive' },
  },
  {
    title: 'Ad Copy Drafts',
    updatedAt: '3h ago',
    preview: [88, 72, 80, 56],
    owner: { kind: 'agent', roleKey: 'copywriter', name: 'Ivy' },
  },
  {
    title: 'Product Roadmap',
    updatedAt: 'Yesterday',
    preview: [70, 86, 78],
    owner: { kind: 'space', icon: FileText, name: 'Space' },
  },
  {
    title: 'Finance Q1 Report',
    updatedAt: '5d ago',
    preview: [60, 82, 90, 68],
    owner: { kind: 'drive', icon: HardDrive, name: 'Drive' },
  },
  {
    title: 'Customer Feedback',
    updatedAt: '2d ago',
    preview: [88, 70, 60],
    owner: { kind: 'space', icon: FileText, name: 'Space' },
  },
]

function ownerTint(owner: DocOwner): string {
  if (owner.kind === 'agent') return 'rgb(192 132 252)'
  if (owner.kind === 'drive') return 'rgb(251 146 60)'
  return 'rgb(52 211 153)'
}

export function MarketingSpaceDocsMockup(props: {
  libraryAgents?: PublicAgentLibraryRow[]
}) {
  const { libraryAgents } = props
  resolveSpacesShowcasePortraits(libraryAgents)

  return (
    <FeatureFloatingMockShell className="!h-[480px] overflow-hidden">
      <div className="flex h-full min-h-0 w-full flex-col overflow-hidden px-5 pb-5 pt-5">
        <div className="mb-4 flex shrink-0 items-center justify-between gap-3">
          <div className="flex items-baseline gap-2">
            <h3 className="text-[14px] font-bold text-white">Docs</h3>
            <span className="text-[10px] font-medium text-white/40">24</span>
          </div>
          <div className="flex items-center gap-1.5">
            {FILTERS.map((label, i) => (
              <span
                key={label}
                className={`rounded-full px-2.5 py-1 text-[9px] font-semibold ${
                  i === 0
                    ? 'bg-white/[0.08] text-white/90'
                    : 'text-white/40'
                }`}
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        <motion.div
          className="grid min-h-0 flex-1 grid-cols-2 gap-3 sm:grid-cols-3"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
          }}
        >
          {DOCS.map((doc) => {
            const tint = ownerTint(doc.owner)

            return (
              <motion.div
                key={doc.title}
                variants={{
                  hidden: { opacity: 0, y: 8 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
                }}
                className="glass-card flex min-w-0 flex-col overflow-hidden"
                style={
                  doc.fresh
                    ? { border: `1px solid ${tint}40`, boxShadow: `0 0 0 1px ${tint}22, 0 8px 24px -12px ${tint}55` }
                    : { border: '1px solid rgb(255 255 255 / 0.04)' }
                }
              >
                <div
                  className="flex min-h-0 flex-1 flex-col gap-1.5 px-3 py-3"
                  style={{
                    background: doc.fresh
                      ? `linear-gradient(180deg, ${tint}10 0%, transparent 70%)`
                      : 'transparent',
                  }}
                >
                  {doc.preview.map((w, i) => (
                    <div
                      key={i}
                      className="h-1.5 rounded-full bg-white/[0.08]"
                      style={{ width: `${w}%`, opacity: 1 - i * 0.12 }}
                    />
                  ))}
                </div>
                <div className="border-t border-white/[0.04] px-3 py-2.5">
                  <p className="truncate text-[11px] font-semibold text-white">{doc.title}</p>
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-1.5">
                      {doc.owner.kind === 'agent' ? (
                        <MarketingPortraitCircle
                          src={marketingAgentPortraitByRoleKey(doc.owner.roleKey, libraryAgents)}
                          alt=""
                          className="h-4 w-4 shrink-0"
                        />
                      ) : (
                        <doc.owner.icon
                          size={11}
                          strokeWidth={2}
                          className="shrink-0"
                          style={{ color: tint }}
                        />
                      )}
                      <span className="truncate text-[9px] text-white/55">{doc.owner.name}</span>
                    </div>
                    <span className="shrink-0 text-[9px] text-white/35">{doc.updatedAt}</span>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 6 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ delay: 0.35, duration: 0.4, ease: EASE }}
          className="mt-3 flex shrink-0 items-center justify-center gap-2 text-[10px] text-white/50"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-purple-400 shadow-[0_0_6px_rgb(192_132_252_/_0.6)]" />
          <span>
            Atlas just delivered <span className="text-white/80">Q2 GTM Strategy</span>
          </span>
        </motion.div>
      </div>
    </FeatureFloatingMockShell>
  )
}
