'use client'

import React from 'react'
import { motion } from 'framer-motion'
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  Brain,
  DollarSign,
  Flame,
  Minus,
  ShieldAlert,
  Target,
  TrendingUp,
  Users,
  Wallet,
  Zap,
} from 'lucide-react'
import { MARKETING_AGENT_LIBRARY_FALLBACK } from '@/lib/agent-library-fallback'

const PRIORITY_ICON = {
  urgent: { className: 'text-red-400', Icon: Flame },
  high: { className: 'text-orange-400', Icon: Zap },
  medium: { className: 'text-yellow-400', Icon: Minus },
  low: { className: 'text-zinc-500', Icon: ArrowDown },
}

const STATUS_STYLE: Record<string, string> = {
  in_progress: 'bg-amber-500/15 text-amber-400',
  done: 'bg-emerald-500/15 text-emerald-400',
  blocked: 'bg-yellow-500/15 text-yellow-400',
  pending_approval: 'bg-orange-500/15 text-orange-300',
  failed: 'bg-red-700/20 text-red-300',
}

const MISSION_DATA = [
  {
    title: 'Q2 Growth Strategy',
    campaign: 'SaaS Launch',
    agent: 'pm_marketing',
    status: 'in_progress',
    priority: 'high',
    updated: '2m ago',
  },
  {
    title: 'Ad Creative Batch',
    campaign: 'Cold Traffic',
    agent: 'designer',
    status: 'done',
    priority: 'medium',
    updated: '14m ago',
  },
  {
    title: 'Competitor Intel',
    campaign: 'General',
    agent: 'analyst',
    status: 'blocked',
    priority: 'urgent',
    updated: '1h ago',
  },
  {
    title: 'Lead Gen Funnel',
    campaign: 'SaaS Launch',
    agent: 'copywriter',
    status: 'in_progress',
    priority: 'high',
    updated: '3h ago',
  },
  {
    title: 'Email Nurture Flow',
    campaign: 'Webinar',
    agent: 'copywriter',
    status: 'done',
    priority: 'medium',
    updated: '5h ago',
  },
  {
    title: 'API Integration Fix',
    campaign: 'General',
    agent: 'automation_integrations_engineer',
    status: 'done',
    priority: 'low',
    updated: '1d ago',
  },
  {
    title: 'Social Content Plan',
    campaign: 'Instagram',
    agent: 'pm_marketing',
    status: 'pending_approval',
    priority: 'medium',
    updated: '45m ago',
  },
  {
    title: 'Market Trends Report',
    campaign: 'General',
    agent: 'pm_operations',
    status: 'done',
    priority: 'medium',
    updated: '2d ago',
  },
]

export function AutopilotDepthIllustration() {
  const allAgents = MARKETING_AGENT_LIBRARY_FALLBACK
  const activeAgents = MARKETING_AGENT_LIBRARY_FALLBACK.slice(0, 4)

  return (
    <div className="relative h-[400px] w-full overflow-hidden rounded-2xl bg-[#030303] md:h-[500px] lg:h-[600px]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.1),transparent_70%)]" />

      {/* ── Mobile layout ── spread dashboard vertically, scroll inside card */}
      <div className="absolute inset-0 flex flex-col overflow-hidden md:hidden">
        <div className="flex-none space-y-2 p-2.5 pb-0">
          {/* Mission Control header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target size={14} className="text-purple-400" />
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-white">
                Mission Control
              </h2>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              <span className="text-[9px] font-medium uppercase tracking-wider text-emerald-400/80">
                Live
              </span>
            </div>
          </div>

          {/* Mission rows — show 3 to fit */}
          <div className="space-y-1">
            {MISSION_DATA.slice(0, 3).map((m, i) => {
              const P = PRIORITY_ICON[m.priority as keyof typeof PRIORITY_ICON]
              const agent = allAgents.find((a) => a.role_key === m.agent)
              const progress =
                m.status === 'done'
                  ? 100
                  : m.status === 'in_progress'
                    ? 65
                    : m.status === 'pending_approval'
                      ? 85
                      : 0
              return (
                <div
                  key={i}
                  className="flex items-center gap-1.5 rounded-md border border-white/5 bg-white/[0.02] px-2 py-1.5"
                >
                  <P.Icon size={9} className={P.className} />
                  <span className="min-w-0 flex-1 truncate text-[9px] font-medium text-white">
                    {m.title}
                  </span>
                  <span
                    className={`shrink-0 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-tighter ${STATUS_STYLE[m.status]}`}
                  >
                    {m.status.replace('_', ' ')}
                  </span>
                  <span className="shrink-0 text-[7px] text-white/20">{m.updated}</span>
                </div>
              )
            })}
          </div>

          {/* Active Team - avatar strip */}
          <div className="flex items-center gap-2 rounded-md border border-white/5 bg-white/[0.02] px-2 py-1.5">
            <Users size={10} className="shrink-0 text-blue-400" />
            <span className="shrink-0 text-[8px] font-bold uppercase tracking-widest text-white/60">
              Team
            </span>
            <div className="flex -space-x-1.5">
              {activeAgents.map((agent, i) => (
                <img
                  key={i}
                  src={agent.image_url}
                  alt=""
                  className="h-5 w-5 rounded-full border border-white/10 object-cover"
                />
              ))}
            </div>
            <span className="ml-auto text-[7px] font-bold text-emerald-400">4 Active</span>
          </div>

          {/* Metrics row */}
          <div className="grid grid-cols-2 gap-2">
            <div className="glass-card border-white/5 bg-white/[0.02] px-2.5 py-2">
              <div className="mb-1 flex items-center gap-1">
                <Wallet size={10} className="text-emerald-400" />
                <span className="text-[7px] font-bold uppercase tracking-widest text-white/40">
                  Revenue
                </span>
                <span className="ml-auto text-[7px] font-bold text-emerald-400">+14.2%</span>
              </div>
              <div className="text-base font-black leading-none text-white">$14,240</div>
              <div className="mt-0.5 text-[7px] font-bold uppercase tracking-widest text-white/20">
                Total (30d)
              </div>
            </div>
            <div className="glass-card border-white/5 bg-white/[0.02] px-2.5 py-2">
              <div className="mb-1 flex items-center gap-1">
                <Activity size={10} className="text-blue-400" />
                <span className="text-[7px] font-bold uppercase tracking-widest text-white/40">
                  Ops
                </span>
                <span className="ml-auto text-[7px] font-bold text-blue-400">91%</span>
              </div>
              <div className="text-base font-black leading-none text-white">420h</div>
              <div className="mt-0.5 text-[7px] font-bold uppercase tracking-widest text-white/20">
                Time Saved
              </div>
            </div>
          </div>

          {/* Alerts - single compact row */}
          <div className="flex items-center gap-2 rounded-md border border-red-500/10 bg-red-500/[0.03] px-2 py-1.5">
            <ShieldAlert size={10} className="shrink-0 text-red-400" />
            <span className="shrink-0 text-[8px] font-bold uppercase tracking-wider text-red-400/80">
              Alerts
            </span>
            <span className="min-w-0 truncate text-[8px] text-red-200/70">
              Credits critical · SEO Analysis failed
            </span>
            <div className="ml-auto h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-red-400" />
          </div>
        </div>

        {/* Overlays */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
        <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_60px_rgba(0,0,0,0.6)]" />

        {/* ROAS at bottom */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 flex items-end justify-center">
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 1.5, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="relative aspect-[4/3] w-[200px]"
          >
            <img
              src="/images/autopilot/Title.png"
              alt="Pixel"
              className="h-full w-full object-contain object-bottom drop-shadow-[0_-10px_20px_rgba(168,85,247,0.3)]"
            />
          </motion.div>
        </div>
      </div>

      {/* ── Desktop layout (original, untouched) ── */}
      <div className="absolute inset-0 hidden items-center justify-center md:flex">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative h-full w-full overflow-hidden bg-black/20 backdrop-blur-3xl"
        >
          {/* Screen Content: Dashboard Port */}
          <div className="absolute inset-0 grid grid-cols-12 gap-6 overflow-hidden p-8 md:scale-[0.85] lg:scale-100">
            {/* 1. Mission Control (Top Left) */}
            <div className="col-span-7 flex flex-col gap-5 overflow-hidden">
              <div className="flex min-h-0 flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target size={18} className="text-purple-400" />
                    <h2 className="text-[13px] font-bold uppercase tracking-widest text-white">
                      Mission Control
                    </h2>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                      <span className="text-[10px] font-medium uppercase tracking-wider text-emerald-400/80">
                        Live
                      </span>
                    </div>
                  </div>
                </div>

                {/* Inbox List Header - Ported 1:1 from MissionList.tsx */}
                <div className="grid grid-cols-[2.5fr_1fr_1.2fr_1fr_0.8fr_0.6fr] border-b border-white/5 px-4 py-2 text-[9px] font-bold uppercase tracking-widest text-white/30">
                  <span>Title</span>
                  <span>Campaign</span>
                  <span>Assigned</span>
                  <span>Status</span>
                  <span>Progress</span>
                  <span className="text-right">Updated</span>
                </div>

                {/* Inbox Rows */}
                <div className="space-y-1 overflow-y-auto pr-1">
                  {MISSION_DATA.map((m, i) => {
                    const P = PRIORITY_ICON[m.priority as keyof typeof PRIORITY_ICON]
                    const agent = allAgents.find((a) => a.role_key === m.agent)
                    const progress =
                      m.status === 'done'
                        ? 100
                        : m.status === 'in_progress'
                          ? 65
                          : m.status === 'pending_approval'
                            ? 85
                            : 0
                    return (
                      <div
                        key={i}
                        className="grid grid-cols-[2.5fr_1fr_1.2fr_1fr_0.8fr_0.6fr] items-center rounded-lg border border-white/5 bg-white/[0.02] px-4 py-2.5 transition-colors hover:bg-white/[0.04]"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <P.Icon size={12} className={P.className} />
                          <span className="truncate text-[11px] font-medium text-white">
                            {m.title}
                          </span>
                        </div>
                        <span className="truncate text-[10px] text-white/40">{m.campaign}</span>
                        <div className="flex min-w-0 items-center gap-2">
                          <img
                            src={agent?.image_url}
                            alt=""
                            className="h-4 w-4 rounded-full border border-white/10 object-cover"
                          />
                          <span className="truncate text-[10px] text-white/60">
                            {agent?.default_name}
                          </span>
                        </div>
                        <div>
                          <span
                            className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-tighter ${STATUS_STYLE[m.status]}`}
                          >
                            {m.status.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="pr-4">
                          <div className="h-1 w-full overflow-hidden rounded-full bg-white/5">
                            <div
                              className={`h-full rounded-full ${progress === 100 ? 'bg-emerald-400' : 'bg-blue-400'}`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                        <span className="whitespace-nowrap text-right text-[9px] text-white/20">
                          {m.updated}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* 2. Financial Dashboard (Charts & Numbers) - Ported 1:1 from DashboardMetricsCards.tsx */}
              <div className="mt-auto grid grid-cols-2 gap-5">
                <div className="glass-card flex flex-col gap-4 border-white/5 bg-white/[0.02] p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wallet size={16} className="text-emerald-400" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                        Revenue
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-400">+14.2%</span>
                  </div>
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <div className="text-2xl font-black text-white">$14,240.50</div>
                      <div className="mt-1 text-[9px] font-bold uppercase tracking-widest text-white/20">
                        Total (30d)
                      </div>
                    </div>
                    <div className="flex h-10 flex-1 items-end gap-0.5">
                      {[30, 45, 25, 60, 55, 80, 70].map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-t-sm bg-emerald-400/20"
                          style={{ height: `${h}%` }}
                        >
                          <div className="h-1/3 w-full rounded-t-sm bg-emerald-400/40" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="glass-card flex flex-col gap-4 border-white/5 bg-white/[0.02] p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity size={16} className="text-blue-400" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                        Operations
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-blue-400">91% Eff.</span>
                  </div>
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <div className="text-2xl font-black text-white">420h</div>
                      <div className="mt-1 text-[9px] font-bold uppercase tracking-widest text-white/20">
                        Time Saved
                      </div>
                    </div>
                    <div className="flex h-10 flex-1 items-center justify-center">
                      <div className="h-1 w-full overflow-hidden rounded-full bg-white/5">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: '91%' }}
                          transition={{ duration: 1.5, delay: 0.8 }}
                          className="h-full bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.5)]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Agents & Alerts */}
            <div className="col-span-5 flex flex-col gap-5 overflow-hidden">
              {/* 3. Active Agents (Ported List) */}
              <div className="glass-card flex flex-1 flex-col gap-4 overflow-hidden border-white/5 bg-white/[0.02] p-5">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-blue-400" />
                  <h3 className="text-[11px] font-bold uppercase tracking-widest text-white/80">
                    Active Team
                  </h3>
                </div>
                <div className="space-y-3 overflow-y-auto">
                  {activeAgents.map((agent, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.01] p-2"
                    >
                      <div className="relative shrink-0">
                        <img
                          src={agent.image_url}
                          alt=""
                          className="h-9 w-9 rounded-full border border-white/10 object-cover"
                        />
                        <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0a0a0a] bg-emerald-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[11px] font-bold text-white">
                          {agent.default_name}
                        </div>
                        <div className="truncate text-[9px] italic text-white/40">
                          {i === 0
                            ? 'Designing Q2 Funnel'
                            : i === 1
                              ? 'Analyzing Lead Data'
                              : i === 2
                                ? 'Writing Ad Copies'
                                : 'Routing Missions'}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end">
                        <div className="text-[8px] font-bold uppercase text-emerald-400">
                          Working
                        </div>
                        <div className="mt-0.5 font-mono text-[10px] text-white/20">
                          {i === 0 ? '94%' : i === 1 ? '68%' : i === 2 ? '42%' : '81%'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Critical Alerts (Ported Style) */}
              <div className="glass-card flex flex-col gap-4 border-red-500/10 bg-red-500/[0.03] p-5">
                <div className="flex items-center gap-2">
                  <ShieldAlert size={16} className="text-red-400" />
                  <h3 className="text-[11px] font-bold uppercase tracking-widest text-red-400/80">
                    Critical System Alerts
                  </h3>
                </div>
                <div className="space-y-2">
                  {[
                    { label: 'Credits critical (2%)', dot: 'bg-red-400' },
                    { label: 'Mission failed: SEO Analysis', dot: 'bg-orange-400' },
                  ].map((alert, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 rounded-lg border border-red-400/10 bg-red-400/5 p-3 transition-colors hover:bg-red-400/10"
                    >
                      <AlertTriangle size={14} className="shrink-0 text-red-400" />
                      <span className="truncate text-[10px] font-medium text-red-200/80">
                        {alert.label}
                      </span>
                      <div
                        className={`ml-auto h-1.5 w-1.5 rounded-full ${alert.dot} animate-pulse`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Screen Overlays */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
          <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_100px_rgba(0,0,0,0.8)]" />
          <div className="pointer-events-none absolute inset-0 bg-[url('/grid.svg')] opacity-[0.02] invert" />
        </motion.div>
      </div>

      {/* Foreground: ROAS Sitting — desktop only (mobile has its own smaller version) */}
      <div className="pointer-events-none absolute inset-0 hidden items-end justify-center md:flex">
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1.5, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative -mb-10 aspect-[4/3] w-full max-w-[600px] sm:-mb-20"
        >
          <img
            src="/images/autopilot/Title.png"
            alt="Pixel watching campaign activity"
            className="h-full w-full object-contain object-bottom drop-shadow-[0_-20px_40px_rgba(168,85,247,0.3)]"
          />
          <div className="absolute bottom-[20%] left-1/2 -z-10 h-64 w-64 -translate-x-1/2 rounded-full bg-purple-500/20 blur-[100px]" />
        </motion.div>
      </div>

      {/* Scanline/Grid Overlay */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] opacity-[0.05]" />
    </div>
  )
}
