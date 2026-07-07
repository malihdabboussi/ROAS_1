'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, FileText, Flag, FolderOpen, Loader2, Mic, Paperclip } from 'lucide-react'
import { FeatureFloatingMockShell } from '@/components/feature-pages/FeatureFloatingMockShell'
import {
  MARKETING_AGENT_LIBRARY_FALLBACK,
  VIBEY_MARKETING_PORTRAIT_FALLBACK,
} from '@/lib/agent-library-fallback'
import type { PublicAgentLibraryRow } from '@/lib/public-agent-library'
import { cn } from '@/lib/utils'

/** Keep in sync with `apps/web/src/features/mission-control/config/mission-field-limits.config.ts`. */
const MISSION_CAPTURE_TEXT_MAX_CHARS = 10_000

/** Keep in sync with `apps/web/src/features/mission-control/config/messages.config.ts`. */
const QUICK_CAPTURE_PLACEHOLDER = 'Tell me what to run...'

/** Demo brief shown in missions marketing mockups (execution cycle + “Delegate in three steps”). */
export const MISSION_MARKETING_DEMO_BRIEF =
  'Create a 3-part nurture sequence for our Q2 SaaS launch. Focus on conversion and maintaining our brand voice.'

const SUBTASK_META = [
  { id: '1', title: 'Research & Planning', desc: 'Analyzing brief and workspace context' },
  { id: '2', title: 'Content Drafting', desc: 'Generating 3-part nurture sequence' },
  { id: '3', title: 'Quality Assurance', desc: 'Reviewing alignment with brand voice' },
]

/**
 * Same shell as chat `PdfCard` in `MessageBubble.tsx`, but a static page preview (no iframe)
 * with real copy so it reads like a zoomed-out PDF.
 */
function MissionDeliverablePdfMockup({ label }: { label: string }) {
  return (
    <div className="site-mock-dark studio-app-preview-root w-full overflow-hidden rounded-[var(--spacing-3)]">
      <div className="card-glass w-full overflow-hidden">
        <div className="bg-deep-muted relative flex max-h-56 min-h-[13.5rem] flex-col p-4">
          <div className="border-color-glass mb-3 flex shrink-0 items-center justify-between border-b border-white/10 pb-2">
            <span className="text-app-muted text-[10px] font-semibold uppercase tracking-wider">
              Preview
            </span>
            <span className="rounded bg-red-500/90 px-1.5 py-0.5 text-[9px] font-bold text-white">
              PDF
            </span>
          </div>
          <div className="text-app-foreground min-h-0 flex-1 select-none overflow-hidden">
            <p className="body-4 text-app-foreground mb-1 font-semibold leading-tight">
              Q2 SaaS launch — 3-part nurture sequence
            </p>
            <p className="text-app-muted mb-2 text-[10px] leading-snug">
              Campaign: Q2 SaaS Launch · Tone: confident, clear, on-brand
            </p>
            <p className="body-4 mb-1 leading-snug opacity-90">
              <span className="text-app-foreground font-medium">Email 1 — Problem.</span>{' '}
              <span className="text-app-muted">
                Open on the cost of a leaky funnel: missed follow-ups, long cycles, and demos that
                never convert. Anchor on one metric your ICP already tracks.
              </span>
            </p>
            <p className="body-4 mb-1 leading-snug opacity-90">
              <span className="text-app-foreground font-medium">Email 2 — Reframe.</span>{' '}
              <span className="text-app-muted">
                Show how teams like theirs operationalize nurture without adding headcount—brief
                proof, one customer snapshot, no hype.
              </span>
            </p>
            <p className="body-4 line-clamp-2 leading-snug opacity-90">
              <span className="text-app-foreground font-medium">Email 3 — CTA.</span>{' '}
              <span className="text-app-muted">
                Single ask: book a 20-minute working session. Restate value, remove risk (what to
                expect), link above the fold.
              </span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 px-3.5 py-2">
          <FileText className="text-app-muted h-4 w-4 shrink-0" />
          <span className="text-app-foreground min-w-0 truncate text-sm font-medium">{label}</span>
        </div>
      </div>
    </div>
  )
}

function pickThreePortraitUrls(agents: PublicAgentLibraryRow[] | undefined): string[] {
  const list = agents != null && agents.length >= 3 ? agents : MARKETING_AGENT_LIBRARY_FALLBACK
  return [0, 1, 2].map((i) => list[i]?.image_url).filter(Boolean) as string[]
}

/**
 * Mission Control quick capture shell — structure and spacing ported 1:1 from
 * `apps/web/src/features/mission-control/components/MissionQuickCapture.tsx`
 * (input-glass, textarea row, footer toolbar). Website tokens: `text-white`,
 * `placeholder-muted`, `caret-[rgb(var(--accent-emerald-rgb))]` where the app
 * uses `text-foreground` / `caret-accent` (not in website Tailwind theme).
 */
export function MissionQuickCaptureChrome(props: {
  briefText: string
  phase: 'brief' | 'planning' | 'execution' | 'done'
  /** Tighter chrome for missions “Delegate in three steps” column. */
  compact?: boolean
}) {
  const { briefText, phase, compact } = props
  const inputValue = briefText
  const demoCampaignName = 'Q2 SaaS Launch'
  const iconBtn = compact ? 'h-7 w-7' : 'h-8 w-8'
  const iconSz = compact ? 'h-3 w-3' : 'h-3.5 w-3.5'

  return (
    <div
      className={cn(
        'input-glass rounded-spacing-3 relative flex flex-col',
        compact && 'rounded-lg',
      )}
    >
      <div className={cn('flex-1', compact ? 'px-3 pt-2' : 'px-4 pt-3')}>
        <textarea
          value={inputValue}
          readOnly
          tabIndex={-1}
          rows={1}
          placeholder={QUICK_CAPTURE_PLACEHOLDER}
          className={cn(
            'placeholder-muted w-full resize-none bg-transparent text-white caret-[rgb(var(--accent-emerald-rgb))] outline-none focus:outline-none',
            compact
              ? 'body-3 max-h-[72px] min-h-[38px] leading-snug'
              : 'body-2 max-h-[200px] min-h-[60px]',
          )}
        />
      </div>

      <div className={cn('flex items-center justify-between px-3', compact ? 'py-1.5' : 'py-2')}>
        <div className="flex items-center gap-1">
          <span className="tooltip relative" data-tooltip="Attach files">
            <button
              type="button"
              tabIndex={-1}
              className={cn(
                'button-glass-neutral flex cursor-default items-center justify-center rounded-full transition-all',
                iconBtn,
              )}
              aria-hidden
            >
              <Paperclip className={iconSz} />
            </button>
          </span>

          <span className="tooltip relative" data-tooltip={demoCampaignName}>
            <button
              type="button"
              tabIndex={-1}
              className={cn(
                'button-glass-neutral flex cursor-default items-center gap-1.5 rounded-full text-white transition-all',
                compact ? 'h-7 px-2' : 'h-8 px-2.5',
              )}
              aria-hidden
            >
              <FolderOpen className={`${iconSz} shrink-0`} />
              <span className="typo-caption max-w-[88px] truncate font-medium md:max-w-[100px]">
                {demoCampaignName}
              </span>
            </button>
          </span>

          <span className="tooltip relative" data-tooltip="Medium priority">
            <button
              type="button"
              tabIndex={-1}
              className={cn(
                'button-glass-neutral flex cursor-default items-center justify-center rounded-full transition-all',
                iconBtn,
              )}
              aria-hidden
            >
              <Flag className={`${iconSz} text-amber-400`} />
            </button>
          </span>
        </div>

        <div className="flex items-center gap-1">
          <span
            className={cn('text-color-muted tabular-nums', compact ? 'typo-caption' : 'body-4')}
          >
            {inputValue.length.toLocaleString()}/{MISSION_CAPTURE_TEXT_MAX_CHARS.toLocaleString()}
          </span>
          <span className="tooltip" data-tooltip="Voice input">
            <button
              type="button"
              tabIndex={-1}
              className={cn(
                'button-glass-neutral flex cursor-default items-center justify-center rounded-full transition-all',
                iconBtn,
              )}
              aria-hidden
            >
              <Mic className={iconSz} />
            </button>
          </span>
          <span
            className="tooltip"
            data-tooltip={
              phase === 'done'
                ? 'Completed'
                : !inputValue.trim()
                  ? 'Choose a campaign first'
                  : 'Send mission'
            }
          >
            <button
              type="button"
              tabIndex={-1}
              disabled={!inputValue.trim()}
              className={cn(
                'button-glass-neutral flex cursor-default items-center justify-center rounded-full transition-all disabled:opacity-30',
                iconBtn,
              )}
              aria-hidden
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </span>
        </div>
      </div>
    </div>
  )
}

export function MarketingMissionExecutionMockup(props?: {
  libraryAgents?: PublicAgentLibraryRow[]
  vibeyPortraitUrl?: string
  /** No brain-grid panel — flush on parent (e.g. pitch zoom). */
  embedTransparent?: boolean
}) {
  const vibeySrc =
    props?.vibeyPortraitUrl != null && String(props.vibeyPortraitUrl).trim() !== ''
      ? String(props.vibeyPortraitUrl).trim()
      : VIBEY_MARKETING_PORTRAIT_FALLBACK

  const agentPortraitUrls = useMemo(
    () => pickThreePortraitUrls(props?.libraryAgents),
    [props?.libraryAgents],
  )

  const [phase, setPhase] = useState<'brief' | 'planning' | 'execution' | 'done'>('brief')
  const [briefText, setBriefText] = useState('')
  const [visibleSubtasks, setVisibleSubtasks] = useState<number>(0)
  const [completedSubtasks, setCompletedSubtasks] = useState<string[]>([])
  const [isCEOPlanning, setIsCEOPlanning] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function runCycle() {
      if (cancelled) return

      setPhase('brief')
      setBriefText('')
      setVisibleSubtasks(0)
      setCompletedSubtasks([])
      setIsCEOPlanning(false)

      await new Promise((r) => setTimeout(r, 800))
      for (let i = 0; i <= MISSION_MARKETING_DEMO_BRIEF.length; i++) {
        if (cancelled) return
        setBriefText(MISSION_MARKETING_DEMO_BRIEF.slice(0, i))
        await new Promise((r) => setTimeout(r, 30))
      }

      await new Promise((r) => setTimeout(r, 1000))
      setPhase('planning')
      setIsCEOPlanning(true)
      await new Promise((r) => setTimeout(r, 2000))
      setIsCEOPlanning(false)
      setPhase('execution')

      for (let i = 0; i < SUBTASK_META.length; i++) {
        if (cancelled) return
        setVisibleSubtasks(i + 1)
        await new Promise((r) => setTimeout(r, 1500))
        setCompletedSubtasks((prev) => [...prev, SUBTASK_META[i].id])
        await new Promise((r) => setTimeout(r, 800))
      }

      setPhase('done')
      await new Promise((r) => setTimeout(r, 4000))
      if (!cancelled) runCycle()
    }

    runCycle()
    return () => {
      cancelled = true
    }
  }, [])

  const inner = (
    <div className="relative z-[1] flex h-full min-h-0 w-full flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4 pt-6">
        <div className="flex w-full flex-col gap-4">
          <AnimatePresence>
            {isCEOPlanning ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex items-center gap-3 rounded-xl border border-purple-500/20 bg-purple-500/5 p-4"
              >
                <div className="relative">
                  <div className="border-color-glass h-10 w-10 shrink-0 overflow-hidden rounded-full border">
                    <img src={vibeySrc} alt="" className="h-full w-full object-cover" />
                  </div>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                    className="pointer-events-none absolute -inset-1 rounded-full border border-dashed border-purple-500/30"
                  />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-white/90">Vibey CEO is planning...</p>
                  <p className="text-[10px] text-white/40">
                    Breaking brief into specialized subtasks
                  </p>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {phase === 'done' ? (
              <motion.div
                key="deliverable"
                role="presentation"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.38, ease: 'easeOut' }}
              >
                <MissionDeliverablePdfMockup label="Q2_Nurture_Sequence.pdf" />
              </motion.div>
            ) : visibleSubtasks > 0 ? (
              <motion.div
                key="subtasks"
                role="presentation"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.32, ease: 'easeOut' }}
                className="space-y-3"
              >
                <AnimatePresence>
                  {SUBTASK_META.slice(0, visibleSubtasks).map((task, i) => {
                    const isCompleted = completedSubtasks.includes(task.id)
                    const isWorking = !isCompleted && i === visibleSubtasks - 1
                    const portraitUrl = agentPortraitUrls[i] ?? agentPortraitUrls[0]

                    return (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`glass-card relative overflow-hidden rounded-xl border p-4 transition-colors ${
                          isWorking
                            ? 'border-white/20 bg-white/[0.05]'
                            : 'border-white/5 bg-white/[0.02]'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="relative shrink-0">
                            <div
                              className={`border-color-glass h-10 w-10 overflow-hidden rounded-lg border transition-colors ${
                                isCompleted
                                  ? 'border-emerald-500/40 ring-1 ring-emerald-500/25'
                                  : isWorking
                                    ? 'border-white/25'
                                    : 'border-white/10'
                              }`}
                            >
                              {portraitUrl ? (
                                <img
                                  src={portraitUrl}
                                  alt=""
                                  className={`h-full w-full object-cover transition-opacity ${
                                    isCompleted ? 'opacity-50' : 'opacity-100'
                                  }`}
                                />
                              ) : null}
                            </div>
                            {isCompleted ? (
                              <div className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#0a0a0a] bg-emerald-500/90 text-white shadow-sm">
                                <CheckCircle2 className="h-3 w-3" strokeWidth={2.5} />
                              </div>
                            ) : null}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={`text-[12px] font-bold transition-colors ${isCompleted ? 'text-white/40' : 'text-white/90'}`}
                              >
                                {task.title}
                              </span>
                              {isWorking ? (
                                <span className="flex shrink-0 items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-emerald-400">
                                  <Loader2 size={10} className="animate-spin" />
                                  Working
                                </span>
                              ) : null}
                            </div>
                            <p
                              className={`text-[10px] transition-colors ${isCompleted ? 'text-white/20' : 'text-white/40'}`}
                            >
                              {task.desc}
                            </p>
                          </div>
                        </div>
                        {isWorking ? (
                          <motion.div
                            initial={{ x: '-100%' }}
                            animate={{ x: '100%' }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                            className="absolute bottom-0 left-0 h-0.5 w-full bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent"
                          />
                        ) : null}
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      <div className="shrink-0 px-6 pb-6 pt-2">
        <MissionQuickCaptureChrome briefText={briefText} phase={phase} />
      </div>
    </div>
  )

  if (props?.embedTransparent) {
    return (
      <div className="flex min-h-[480px] w-full flex-col rounded-2xl bg-transparent">{inner}</div>
    )
  }

  return (
    <FeatureFloatingMockShell className="compare-hero-card-shell--auto-height h-full !min-h-[480px] min-h-0 w-full flex-1 flex-col">
      {inner}
    </FeatureFloatingMockShell>
  )
}
