'use client'

import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { DeliverableVisualPreview } from '@/components/marketing/MarketingMissionDetailModalMockup'
import {
  MISSION_MARKETING_DEMO_BRIEF,
  MissionQuickCaptureChrome,
} from '@/components/marketing/MarketingMissionExecutionMockup'
import { VIBEY_MARKETING_PORTRAIT_FALLBACK } from '@/lib/agent-library-fallback'
import { cn } from '@/lib/utils'

/** Same strings as `apps/web/src/features/mission-control/config/messages.config.ts` (page header). */
const MISSION_CONTROL_PAGE_TITLE = 'MISSION CONTROL'
const MISSION_CONTROL_PAGE_SUBTITLE =
  'Run missions, watch delegation, and keep momentum moving.'

function sleep(ms: number) {
  return new Promise<void>((r) => {
    setTimeout(r, ms)
  })
}

/** Shared column: brain grid + auto-height shell, minimal vertical padding. */
function DelegateStepColumnShell(props: {
  children: ReactNode
  /** e.g. `overflow-visible` when a child uses a slight rotate so corners are not clipped. */
  shellClassName?: string
}) {
  return (
    <div
      className={cn(
        'compare-hero-card-shell compare-hero-card-shell--auto-height border-color-glass bg-color-panel-mid relative !min-h-0 flex h-full min-h-0 w-full flex-1 flex-col rounded-xl border backdrop-blur-xl',
        props.shellClassName ?? 'overflow-hidden',
      )}
    >
      <div className="compare-hero-brain-grid pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative z-[1] flex min-h-0 flex-1 flex-col gap-2 px-3 py-2">{props.children}</div>
    </div>
  )
}

/** Mission Control quick capture + looping typewriter — same brief as Block 1 execution mockup. */
export function MarketingMissionDelegateStepBriefMockup() {
  const [briefText, setBriefText] = useState('')

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const text = MISSION_MARKETING_DEMO_BRIEF
      while (!cancelled) {
        setBriefText('')
        await sleep(450)
        for (let i = 0; i <= text.length; i++) {
          if (cancelled) return
          setBriefText(text.slice(0, i))
          await sleep(30)
        }
        await sleep(2400)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <DelegateStepColumnShell>
      <div className="shrink-0">
        <h4 className="typo-caption font-bold uppercase tracking-wider text-white">{MISSION_CONTROL_PAGE_TITLE}</h4>
        <p className="body-4 text-text-muted mt-0.5 leading-snug">{MISSION_CONTROL_PAGE_SUBTITLE}</p>
      </div>
      <div className="mt-auto min-h-0 w-full">
        <MissionQuickCaptureChrome briefText={briefText} phase="brief" compact />
      </div>
    </DelegateStepColumnShell>
  )
}

/** Timeline on shell background + nested plan-approval `card-glass` only (no outer card). */
export function MarketingMissionDelegateStepPlanMockup() {
  const vibeySrc = VIBEY_MARKETING_PORTRAIT_FALLBACK

  return (
    <DelegateStepColumnShell>
      <div className="flex min-h-0 w-full flex-1 flex-col justify-center">
        <div className="flex max-h-full min-h-0 w-full shrink-0 flex-col gap-3 overflow-y-auto">
        <div className="relative shrink-0 grid gap-2.5">
          <span
            className="absolute bottom-0 left-[5px] top-1 w-px -translate-x-1/2 bg-white/10"
            aria-hidden
          />
          <div className="relative flex pl-4">
            <div className="indicator-dot-glass absolute left-[5px] top-1 z-10 h-2 w-2 shrink-0 -translate-x-1/2 bg-white/20 opacity-40" />
            <span className="body-4 font-medium text-white/50">Mission initialized</span>
          </div>
          <div className="relative flex pl-4 opacity-55">
            <div className="indicator-dot-glass absolute left-[5px] top-1 z-10 h-2 w-2 shrink-0 -translate-x-1/2 bg-white/20" />
            <span className="body-4 font-medium text-white/65">Brief captured</span>
          </div>
          <div className="relative flex items-start justify-between gap-2 pl-4">
            <div className="indicator-dot-glass indicator-dot-glass-green absolute left-[5px] top-1 z-10 h-2.5 w-2.5 shrink-0 -translate-x-1/2" />
            <div className="min-w-0 flex-1">
              <span className="body-4 font-medium text-white">ROAS planned this mission</span>
              <span className="body-4 text-text-muted mt-0.5 block opacity-60">Just now</span>
            </div>
            <div className="border-color-glass h-7 w-7 shrink-0 overflow-hidden rounded-full border">
              <img src={vibeySrc} alt="" className="h-full w-full object-cover" />
            </div>
          </div>
        </div>

        <div className="card-glass shrink-0 rounded-lg px-3 py-2">
          <p className="body-3 font-medium text-white">Plan ready for your approval</p>
          <p className="body-4 mt-0.5 text-amber-400">Includes 2 recommended hires</p>
          <div className="mt-spacing-2 gap-spacing-2 flex flex-wrap">
            <button
              type="button"
              tabIndex={-1}
              className="button-glass-neutral typo-caption cursor-default rounded-md px-2 py-1"
              aria-hidden
            >
              View Plan
            </button>
            <button
              type="button"
              tabIndex={-1}
              className="chip-glass-green typo-caption cursor-default rounded-md px-2 py-1 font-medium"
              aria-hidden
            >
              Approve
            </button>
            <button
              type="button"
              tabIndex={-1}
              className="typo-caption text-text-muted cursor-default rounded-md px-2 py-1 transition-colors"
              aria-hidden
            >
              Reject
            </button>
          </div>
        </div>
      </div>
      </div>
    </DelegateStepColumnShell>
  )
}

/** Section label + full-bleed social preview (hero asset), tilted — no title/chip strip inside the card. */
export function MarketingMissionDelegateStepDeliverableMockup() {
  return (
    <DelegateStepColumnShell shellClassName="overflow-visible">
      <div className="shrink-0">
        <span className="body-4 font-medium text-white">Deliverables</span>
      </div>
      <div className="mt-auto flex min-h-0 w-full flex-1 items-end justify-center overflow-visible pb-1">
        <div className="card-glass mission-delegate-social-tilt h-spacing-60 w-spacing-60 shrink-0 overflow-hidden rounded-spacing-3">
          <div className="bg-muted-20 relative h-full min-h-0 w-full overflow-hidden">
            <DeliverableVisualPreview type="social_post" />
          </div>
        </div>
      </div>
    </DelegateStepColumnShell>
  )
}
