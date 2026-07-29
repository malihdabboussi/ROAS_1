'use client'

import { motion } from 'framer-motion'
import { Clock } from 'lucide-react'
import {
  MARKETING_AGENT_LIBRARY_FALLBACK,
  VIBEY_MARKETING_PORTRAIT_FALLBACK,
} from '@/lib/agent-library-fallback'
import type { PublicAgentLibraryRow } from '@/lib/public-agent-library'

function buildAgentByRole(libraryAgents: PublicAgentLibraryRow[] | undefined) {
  const byRole = new Map<string, PublicAgentLibraryRow>()
  for (const r of MARKETING_AGENT_LIBRARY_FALLBACK) {
    byRole.set(r.role_key, r)
  }
  if (libraryAgents) {
    for (const r of libraryAgents) {
      byRole.set(r.role_key, r)
    }
  }
  return byRole
}

function resolveVibeyPortrait(vibeyPortraitUrl: string | undefined) {
  const t = vibeyPortraitUrl?.trim()
  return t && t.length > 0 ? t : VIBEY_MARKETING_PORTRAIT_FALLBACK
}

function ActivityFace(props: { src: string; name: string }) {
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <span
        className="mission-mock-activity-wrap overflow-hidden rounded-full"
        style={{ width: 14, height: 14, flexShrink: 0 }}
      >
        <img
          src={props.src}
          alt=""
          className="block h-full w-full object-cover"
          decoding="async"
        />
      </span>
      <span className="text-app-muted" style={{ fontSize: 10 }}>
        {props.name}
      </span>
    </div>
  )
}

const STAGGER_BETWEEN_ROWS = 0.42
const ROW_DURATION = 0.4
const ROW_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

const activityListVariants = {
  hidden: {},
  visible: {
    transition: {
      delayChildren: 0.08,
      staggerChildren: STAGGER_BETWEEN_ROWS,
    },
  },
}

const activityRowVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: ROW_DURATION, ease: ROW_EASE },
  },
}

/** Activity feed: parity with hero `MarketingMissionDetailModalMockup` Activity timeline (no composer). */
export function MarketingMissionActivityTimelineMockup(props?: {
  libraryAgents?: PublicAgentLibraryRow[]
  vibeyPortraitUrl?: string
}) {
  const byRole = buildAgentByRole(props?.libraryAgents)
  const vibeyPortrait = resolveVibeyPortrait(props?.vibeyPortraitUrl)
  const pm = byRole.get('pm_marketing')
  const copywriter = byRole.get('copywriter')
  const designer = byRole.get('designer')

  return (
    <div className="flex h-full min-h-[480px] w-full flex-1 flex-col px-5 pb-7 pt-3 sm:px-8 sm:pb-10">
      <div className="card-glass flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-white/10 shadow-xl">
        <div className="flex-shrink-0 px-5 py-3">
          <h3
            className="text-color-primary font-semibold"
            style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}
          >
            Activity
          </h3>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto px-5 py-3">
            <div className="relative min-h-[140px]">
              <div className="bg-app-border absolute bottom-2 left-[5px] top-2 w-px" />
              <motion.div
                className="space-y-5"
                variants={activityListVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.12 }}
              >
                <motion.div className="relative pl-6" variants={activityRowVariants}>
                  <div className="absolute left-[5px] top-1.5 h-2.5 w-2.5 -translate-x-1/2 rounded-full border border-emerald-500/40 bg-emerald-500/20" />
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-emerald-400">Plan approved</span>
                      <ActivityFace src={vibeyPortrait} name="Pixel" />
                    </div>
                    <p className="text-app-muted-dim" style={{ fontSize: 9 }}>
                      3h ago
                    </p>
                  </div>
                </motion.div>

                <motion.div className="relative pl-6" variants={activityRowVariants}>
                  <div className="absolute left-[5px] top-1.5 h-2.5 w-2.5 -translate-x-1/2 rounded-full border border-blue-500/40 bg-blue-500/20" />
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-color-secondary text-[10px] font-bold">Execution started</span>
                      {pm ? <ActivityFace src={pm.image_url} name={pm.default_name} /> : null}
                    </div>
                    <p className="text-app-muted-dim" style={{ fontSize: 9 }}>
                      2h ago
                    </p>
                  </div>
                </motion.div>

                <motion.div className="relative pl-6" variants={activityRowVariants}>
                  <div className="absolute left-[5px] top-1.5 h-2.5 w-2.5 -translate-x-1/2 rounded-full border border-amber-400/45 bg-amber-400/15" />
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-start gap-1.5">
                        <Clock className="mt-0.5 shrink-0 text-amber-400/90" size={11} />
                        <p className="text-app-muted leading-relaxed" style={{ fontSize: 10 }}>
                          <span className="text-app-foreground font-semibold">Waiting on dependency</span>
                          {' — '}
                          {designer?.default_name ?? 'Designer'} is blocked until{' '}
                          <strong className="text-app-foreground">Outline 3-email nurture arc + CTAs</strong>
                          {' '}
                          completes before starting visual blocks + hero variants.
                        </p>
                      </div>
                      {designer ? <ActivityFace src={designer.image_url} name={designer.default_name} /> : null}
                    </div>
                    <p className="text-app-muted-dim" style={{ fontSize: 9 }}>
                      1h 20m ago
                    </p>
                  </div>
                </motion.div>

                <motion.div className="relative pl-6" variants={activityRowVariants}>
                  <div className="absolute left-[5px] top-1.5 h-2.5 w-2.5 -translate-x-1/2 rounded-full border border-blue-500/40 bg-blue-500/20" />
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-app-muted leading-relaxed" style={{ fontSize: 10 }}>
                        Executing subtask{' '}
                        <strong className="text-app-foreground">Outline 3-email nurture arc + CTAs</strong>
                      </p>
                      {copywriter ? (
                        <ActivityFace src={copywriter.image_url} name={copywriter.default_name} />
                      ) : null}
                    </div>
                    <p className="text-app-muted-dim" style={{ fontSize: 9 }}>
                      1h ago
                    </p>
                  </div>
                </motion.div>

                <motion.div className="relative pl-6" variants={activityRowVariants}>
                  <div className="absolute left-[5px] top-1.5 h-2.5 w-2.5 -translate-x-1/2 rounded-full border border-white/10 bg-white/5" />
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-color-secondary text-[10px] font-bold">User comment</span>
                      <span className="text-app-muted-dim" style={{ fontSize: 9 }}>
                        45m ago
                      </span>
                    </div>
                    <div className="card-glass mt-1 rounded-xl p-3">
                      <p className="text-color-secondary leading-snug italic" style={{ fontSize: 10 }}>
                        &quot;Lead with the ROI headline in email 1 — mirror the landing proof strip.&quot;
                      </p>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
