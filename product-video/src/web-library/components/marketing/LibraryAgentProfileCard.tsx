'use client'

import { useState } from 'react'
import { ChevronDown, X } from 'lucide-react'
import type { PublicAgentLibraryRow } from '@/lib/public-agent-library'
import {
  getLibraryAgentDemoPerformance,
  LIBRARY_AGENT_PERFORMANCE_METRICS,
} from '@/lib/library-agent-demo-performance'

const TAB_IDS = ['info', 'skills', 'comms', 'context'] as const
type TabId = (typeof TAB_IDS)[number]

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'info', label: 'Info' },
  { id: 'skills', label: 'Skills' },
  { id: 'comms', label: 'Comms' },
  { id: 'context', label: 'Context' },
]


const DEMO_CAMPAIGNS = ['Sefy Tofan', 'Healing Waves', 'Vibey']

export function LibraryAgentProfileCard({ row, fixedTab }: { row: PublicAgentLibraryRow; fixedTab?: TabId }) {
  const [userTab, setUserTab] = useState<TabId | null>(null)
  const tab = userTab ?? fixedTab ?? 'info'
  const nameUpper = row.default_name.toUpperCase()
  const skillDetails = row.skill_details ?? []
  const demoPerf = getLibraryAgentDemoPerformance(row.role_key)

  return (
    <div className="agent-profile-shell flex w-full min-w-0 flex-col overflow-hidden rounded-spacing-3" style={{ height: 580 }}>
      <div className="agent-profile-card-glass relative flex h-full flex-col overflow-hidden border-0">
        <div className="shrink-0">
          {row.image_url ? (
            <img
              src={row.image_url}
              alt=""
              className="h-56 w-full object-cover object-top"
            />
          ) : (
            <div className="flex h-56 w-full items-center justify-center bg-white/[0.03]" />
          )}
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden">
          <div className="shrink-0 px-2 pb-1 pt-1">
            <div className="agent-profile-tabs-row flex flex-wrap gap-0.5 p-1">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setUserTab(t.id)}
                  className={
                    tab === t.id
                      ? 'agent-profile-tab agent-profile-tab-active body-3 flex min-h-9 flex-1 items-center justify-center rounded-md px-2 py-1 font-medium text-white'
                      : 'agent-profile-tab body-3 text-text-muted flex min-h-9 flex-1 items-center justify-center rounded-md border border-transparent px-2 py-1 font-medium'
                  }
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div
            className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-3"
            style={{ scrollbarWidth: 'none' }}
          >
            {tab === 'info' && (
              <div className="gap-spacing-3 flex flex-col px-3">
                <div className="gap-spacing-2 flex items-start justify-between">
                  <div className="min-w-0 flex-1 text-left">
                    <div className="flex items-baseline justify-between gap-2">
                      <h2 className="text-text-primary min-w-0 text-base font-bold uppercase leading-tight">
                        {nameUpper}{' '}
                        <span className="body-3 text-text-muted font-normal normal-case">
                          ({row.role})
                        </span>
                      </h2>
                    </div>
                  </div>
                  <span className="badge-glass badge-glass-muted body-4 shrink-0 rounded-full px-2 py-0.5">
                    Idle
                  </span>
                </div>

                <div className="space-y-2 text-left">
                  <p className="body-4 text-text-muted/60 uppercase tracking-wide">Performance</p>
                  <div className="gap-spacing-3 rounded-spacing-2 flex items-center border border-white/10 bg-white/[0.03] px-3 py-2">
                    <div className={`text-3xl font-bold leading-none ${demoPerf.overallColor}`}>
                      {demoPerf.overall.toFixed(1)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="body-4 text-text-muted">Overall score</p>
                      <p className="body-4 text-text-muted/50">
                        {demoPerf.missionsScored} mission{demoPerf.missionsScored !== 1 ? 's' : ''}{' '}
                        scored
                      </p>
                    </div>
                  </div>
                  {LIBRARY_AGENT_PERFORMANCE_METRICS.map(({ key, label }) => {
                    const val = demoPerf.stats[key] ?? 0
                    return (
                      <div key={key} className="gap-spacing-2 flex items-center">
                        <span className="body-4 text-text-muted w-16 shrink-0">{label}</span>
                        <div className="progress-bar-track flex-1">
                          <div
                            className="progress-bar-fill"
                            style={{ width: `${(val / 10) * 100}%` }}
                          />
                        </div>
                        <span className="body-4 text-text-muted w-6 text-right">{val.toFixed(1)}</span>
                      </div>
                    )
                  })}
                </div>

                <div className="space-y-2 text-left">
                  <div className="gap-spacing-2 flex items-center">
                    <p className="body-4 text-text-muted/60 shrink-0 uppercase tracking-wide">
                      Campaigns
                    </p>
                    <button
                      type="button"
                      className="surface-card border-subtle rounded-spacing-2 body-3 text-text-primary hover-subtle flex min-w-0 flex-1 items-center justify-between px-3 py-2 text-left opacity-90"
                      disabled
                    >
                      <span className="text-text-muted truncate">Assign to campaign...</span>
                      <ChevronDown className="text-text-muted h-4 w-4 shrink-0" />
                    </button>
                  </div>
                  <div className="gap-spacing-2 flex flex-wrap">
                    {DEMO_CAMPAIGNS.map((label) => (
                      <span
                        key={label}
                        className="badge-glass badge-glass-muted body-4 inline-flex items-center gap-2 px-3 py-1"
                      >
                        {label}
                        <X className="h-3 w-3 shrink-0 text-text-muted opacity-50" aria-hidden />
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {tab === 'skills' && (
              <div className="space-y-2 px-3 text-left">
                {skillDetails.length === 0 ? (
                  <p className="body-4 text-text-muted">No skills listed for this template.</p>
                ) : (
                  skillDetails.map((skill) => (
                    <div
                      key={skill.skill_key}
                      className="rounded-spacing-2 border border-white/10 bg-white/[0.03] p-3"
                    >
                      <p className="body-3 text-text-primary font-semibold">{skill.name}</p>
                      <p className="body-4 text-text-muted mt-1 line-clamp-2">{skill.description}</p>
                    </div>
                  ))
                )}
              </div>
            )}

            {tab === 'comms' && (
              <div className="space-y-3 px-3 text-left">
                <div>
                  <p className="body-4 text-text-muted/70 mb-1">Model</p>
                  <span className="chip-glass-blue body-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium">
                    Auto (Fast + Smart)
                    <ChevronDown className="h-3 w-3" />
                  </span>
                  <p className="body-4 text-text-muted/60 mt-2">
                    This model is used for this agent&apos;s Team chat and mission execution.
                  </p>
                </div>

                <div className="border-t border-white/10 pt-3">
                  <p className="body-4 text-text-muted/60 mb-2 uppercase tracking-wide">Channels</p>
                  <button
                    type="button"
                    disabled
                    className="rounded-spacing-2 mb-2 w-full border border-dashed border-white/20 bg-white/[0.02] px-3 py-3 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current text-white" aria-hidden><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" /></svg>
                      <div>
                        <p className="body-3 text-text-primary font-medium">Connect Telegram</p>
                        <p className="body-4 text-text-muted">Let this agent chat on Telegram</p>
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    disabled
                    className="rounded-spacing-2 w-full border border-dashed border-white/20 bg-white/[0.02] px-3 py-3 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current text-white" aria-hidden><path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.27 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.833 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.122 2.521a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zm-2.523 10.122a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.268a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" /></svg>
                      <div>
                        <p className="body-3 text-text-primary font-medium">Connect Slack</p>
                        <p className="body-4 text-text-muted">Let this agent chat in Slack channels</p>
                      </div>
                    </div>
                  </button>
                </div>

                <div className="border-t border-white/10 pt-3">
                  <p className="body-4 text-text-muted/60 mb-2 uppercase tracking-wide">Default Channel</p>
                  <p className="body-4 text-text-muted/50 mb-2">
                    Where {row.default_name} sends proactive updates
                  </p>
                  <div className="flex gap-2">
                    <span className="chip-glass-blue body-3 rounded-spacing-2 px-3 py-2 font-medium">Team Chat</span>
                    <span className="chip-glass-neutral body-3 rounded-spacing-2 px-3 py-2 font-medium">Telegram</span>
                    <span className="chip-glass-neutral body-3 rounded-spacing-2 px-3 py-2 font-medium">Slack</span>
                  </div>
                </div>

                <div className="border-t border-white/10 pt-3">
                  <p className="body-4 text-text-muted/60 mb-2 uppercase tracking-wide">Daily Digest</p>
                  <div className="rounded-spacing-2 flex items-center justify-between border border-white/10 bg-white/[0.03] px-3 py-2">
                    <div>
                      <span className="body-3 text-text-primary">Enable daily digest</span>
                      <p className="body-4 text-text-muted/60">
                        {row.default_name} sends a daily summary of all awareness points
                      </p>
                    </div>
                    <div className="h-6 w-11 shrink-0 rounded-full bg-emerald-500/30" aria-hidden>
                      <div className="ml-[22px] mt-[2px] h-5 w-5 rounded-full bg-emerald-400" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {tab === 'context' && (
              <div className="space-y-3 px-3 text-left">
                <div>
                  <p className="body-4 text-text-muted/60 mb-2 uppercase tracking-wide">
                    Share your brain
                  </p>
                  <div className="rounded-spacing-2 flex items-center justify-between gap-3 border border-white/10 bg-white/[0.03] px-3 py-2">
                    <div className="min-w-0">
                      <span className="body-3 text-text-primary">Share your brain</span>
                      <p className="body-4 text-text-muted/60">
                        Let {row.default_name} read from your personal knowledge base
                      </p>
                    </div>
                    <div className="h-6 w-11 shrink-0 rounded-full bg-emerald-500/30" aria-hidden>
                      <div className="ml-[22px] mt-[2px] h-5 w-5 rounded-full bg-emerald-400" />
                    </div>
                  </div>
                </div>

                <div>
                  <p className="body-4 text-text-muted/60 mb-2 uppercase tracking-wide">
                    Campaign access
                  </p>
                  <div className="rounded-spacing-2 flex items-center justify-between gap-3 border border-white/10 bg-white/[0.03] px-3 py-2">
                    <div className="min-w-0">
                      <span className="body-3 text-text-primary">Campaign context</span>
                      <p className="body-4 text-text-muted/60">
                        Access offers, funnels, avatars &amp; profile
                      </p>
                    </div>
                    <div className="h-6 w-11 shrink-0 rounded-full bg-emerald-500/30" aria-hidden>
                      <div className="ml-[22px] mt-[2px] h-5 w-5 rounded-full bg-emerald-400" />
                    </div>
                  </div>
                </div>

                <div>
                  <p className="body-4 text-text-muted/60 mb-2 uppercase tracking-wide">
                    Agent Brain
                  </p>
                  <p className="body-3 text-text-muted">
                    Give {row.default_name} a dedicated knowledge brain to store and recall
                    specific context across conversations.
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="body-4 text-text-muted">
                      {row.default_name} has their own knowledge brain.
                    </p>
                    <span className="badge-glass badge-glass-green badge-glass-sm">Active</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
