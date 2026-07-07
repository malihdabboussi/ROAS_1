'use client'

import { useCallback, useEffect, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  SlideTeamOrgDeck,
  TeamOrgPhaseContext,
} from './pitch-deck-workforce'
import {
  SlideCTA,
} from './pitch-slides-closing'
import {
  SlideModel,
  SlideTraction,
  SlideUseCaseAdley,
  SlideUseCaseBrian,
  SlideUseCaseNeel,
  SlideUseCaseRoas,
} from './pitch-slides-customers-model'
import {
  SlideCover,
  SlideFounders,
  SlideProblemSprawl,
} from './pitch-slides-intro'
import {
  SlideCompetition,
  SlideScalePlan,
  SlideTeamOps,
} from './pitch-slides-proof-team'
import {
  SlideArchitecturePyramid,
  SlideOrgChartOnboarding,
  SlideProblemMemory,
  SlideSpacesWorkspace,
  SlideSolutionHeadline,
} from './pitch-slides-shift-demo-gtm'
import { PITCH_SLIDE_COUNT } from './pitch-nav'

const TOTAL_SLIDES = PITCH_SLIDE_COUNT
/** 0-based index of unified team -> org slide in v2b deck. */
const TEAM_ORG_SLIDE_INDEX = 7

// ─── All Slides ───────────────────────────────────────────────────────────────

const SLIDES = [
  SlideCover, // 1
  SlideProblemMemory, // 2
  SlideProblemSprawl, // 3
  SlideSolutionHeadline, // 4
  SlideTraction, // 5
  SlideFounders, // 6
  SlideArchitecturePyramid, // 7
  SlideTeamOrgDeck, // 8 (two-phase)
  SlideOrgChartOnboarding, // 9
  SlideSpacesWorkspace, // 10
  SlideUseCaseAdley, // 11
  SlideUseCaseBrian, // 12
  SlideUseCaseRoas, // 13
  SlideUseCaseNeel, // 14
  SlideCompetition, // 15
  SlideModel, // 16
  SlideScalePlan, // 17
  SlideTeamOps, // 18
  SlideCTA, // 19
]

// ─── Main Deck ────────────────────────────────────────────────────────────────

export function PitchDeck() {
  const [current, setCurrent] = useState(0)
  const [direction, setDirection] = useState(0)
  /** Unified team -> org slide has two phases before advancing index. */
  const [teamOrgPhase, setTeamOrgPhase] = useState<0 | 1>(0)

  const backToStart = useCallback(() => {
    setDirection(-1)
    setTeamOrgPhase(0)
    setCurrent(0)
  }, [])

  const go = useCallback(
    (delta: number) => {
      if (delta > 0 && current === TEAM_ORG_SLIDE_INDEX && teamOrgPhase === 0) {
        setTeamOrgPhase(1)
        return
      }
      if (delta < 0 && current === TEAM_ORG_SLIDE_INDEX && teamOrgPhase === 1) {
        setTeamOrgPhase(0)
        return
      }

      const next = current + delta
      if (next < 0 || next >= TOTAL_SLIDES) return

      setDirection(delta)

      if (next === TEAM_ORG_SLIDE_INDEX) {
        if (current === TEAM_ORG_SLIDE_INDEX - 1) setTeamOrgPhase(0)
        else if (current === TEAM_ORG_SLIDE_INDEX + 1) setTeamOrgPhase(1)
      } else if (current === TEAM_ORG_SLIDE_INDEX && next === TEAM_ORG_SLIDE_INDEX + 1) {
        setTeamOrgPhase(0)
      }

      setCurrent(next)
    },
    [current, teamOrgPhase],
  )

  const handleDeckClick = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (event.button !== 0 && event.button !== 2) return
      if (event.button === 2) event.preventDefault()

      const rect = event.currentTarget.getBoundingClientRect()
      const clickX = event.clientX - rect.left
      const isLeftHalf = clickX < rect.width / 2
      go(isLeftHalf ? -1 : 1)
    },
    [go],
  )

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (!target) return

      const tag = target.tagName
      const isEditable =
        target.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
      if (isEditable) return

      if (event.key === 'ArrowRight') {
        event.preventDefault()
        go(1)
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        go(-1)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [go])

  useEffect(() => {
    if (current >= TOTAL_SLIDES) {
      setCurrent(TOTAL_SLIDES - 1)
    }
  }, [current])

  const SlideComponent = SLIDES[current] ?? SLIDES[0]!

  return (
    <TeamOrgPhaseContext.Provider value={{ phase: teamOrgPhase }}>
      <div className="fixed inset-0 z-[9999] flex flex-col bg-[#09090b]">
        <div className="absolute left-0 right-0 top-0 z-50 h-0.5 bg-white/5">
          <motion.div
            className="h-full"
            style={{
              background:
                'linear-gradient(90deg, rgb(var(--accent-secondary-rgb)), rgb(var(--accent-secondary-mid-rgb)), rgb(var(--accent-emerald-rgb)))',
            }}
            animate={{ width: `${((current + 1) / TOTAL_SLIDES) * 100}%` }}
            transition={{ duration: 0.2 }}
          />
        </div>

        <div className="pointer-events-none absolute right-0 top-0 z-[70] flex justify-end gap-2 pr-3 pt-2.5 md:pr-5 md:pt-3.5">
          <div className="pointer-events-auto flex items-center gap-2 sm:gap-2.5">
            <button
              type="button"
              onClick={backToStart}
              className="shrink-0 rounded-lg bg-white/[0.06] px-2.5 py-1.5 text-[11px] font-semibold text-white/60 backdrop-blur-sm transition-colors hover:bg-white/10 hover:text-white md:px-3 md:text-xs"
              title="Jump to first slide"
            >
              Restart
            </button>
          </div>
        </div>

        <div
          className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden max-md:px-1.5 max-md:py-4"
          onMouseDown={handleDeckClick}
          onContextMenu={(event) => event.preventDefault()}
        >
          <motion.div
            id="pitch-slide-container"
            className="relative h-full w-full overflow-hidden max-md:h-[calc(100svh-3.75rem)] max-md:w-[100vw] max-md:max-h-[calc(100svh-3.75rem)] max-md:max-w-[100vw] max-[380px]:h-[calc(100svh-3.4rem)] max-[380px]:max-h-[calc(100svh-3.4rem)]"
          >
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={current}
                custom={direction}
                initial={{ opacity: 0, x: direction >= 0 ? 60 : -60 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction >= 0 ? -60 : 60 }}
                transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                className="absolute inset-0"
              >
                <SlideComponent />
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </TeamOrgPhaseContext.Provider>
  )
}
