'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { toast } from 'sonner'
import { SuggestionReviewModal } from '@/features/home/components/SuggestionReviewModal'
import { useSuggestionReview } from '@/features/home/hooks/use-suggestion-review'
import { getSuggestionBannerBody } from '@/features/home/lib/suggestion-review'
import { setCustomerBrainEnabled, toggleCortexMax, updateCompanyCortexSettings } from '@/lib/brain'
import { useOrgStore } from '@/lib/org'
import { useAccountSettingsModal, useWorkspaceSettingsModal } from '@/lib/settings'
import { updateSkillRecommendationSettings } from '@/lib/skill-recommendations'
import { DAILY_RECOMMENDATION_COPY } from '../config/daily-recommendation-copy.config'
import {
  fetchDailyRecommendation,
  type DailyRecommendation,
  type DailyRecommendationKey,
} from '../services/daily-recommendation.service'

const AUTO_ROTATE_MS = 6_000

const GRADIENT_TITLE_KEYS = new Set<DailyRecommendationKey>([
  'customer_brain',
  'feed_brain',
  'cortex_max',
  'nightly_dreaming',
  'skill_recommendations',
])

const SUGGESTION_REVIEW_KEYS = new Set<DailyRecommendationKey>(['review_signals'])

type StripSlide =
  | { kind: 'suggestion'; key: 'suggestion-review' }
  | { kind: 'daily'; key: DailyRecommendationKey; rec: DailyRecommendation }

function visibleDailyRecommendations(items: DailyRecommendation[]): DailyRecommendation[] {
  return items.filter((item) => !SUGGESTION_REVIEW_KEYS.has(item.key))
}

const INLINE_SUCCESS_TOASTS: Partial<Record<DailyRecommendation['key'], string>> = {
  customer_brain: 'Customer Brain enabled.',
  cortex_max: 'Cortex Max enabled.',
  nightly_dreaming: 'Nightly dreaming enabled.',
  skill_recommendations: 'Skill recommendations enabled.',
}

function clampIndex(index: number, length: number): number {
  if (length <= 0) return 0
  return ((index % length) + length) % length
}

export function DailyRecommendationStrip({ variant = 'default' }: { variant?: 'default' | 'v4' }) {
  const router = useRouter()
  const prefersReducedMotion = useReducedMotion()
  const activeOrgId = useOrgStore((s) => s.activeOrgId)
  const { openWorkspaceSettings } = useWorkspaceSettingsModal()
  const { openAccountSettings } = useAccountSettingsModal()
  const [recommendations, setRecommendations] = useState<DailyRecommendation[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [acting, setActing] = useState(false)
  const [hovered, setHovered] = useState(false)
  const suggestionReview = useSuggestionReview()

  const slides = useMemo<StripSlide[]>(() => {
    const dailySlides: StripSlide[] = visibleDailyRecommendations(recommendations).map((rec) => ({
      kind: 'daily',
      key: rec.key,
      rec,
    }))
    if (suggestionReview.loaded && suggestionReview.items.length > 0) {
      const suggestionSlide: StripSlide = { kind: 'suggestion', key: 'suggestion-review' }
      return [suggestionSlide, ...dailySlides]
    }
    return dailySlides
  }, [recommendations, suggestionReview.items.length, suggestionReview.loaded])

  const loadRecommendations = useCallback(async (retainKeys?: DailyRecommendationKey[]) => {
    const response = await fetchDailyRecommendation(retainKeys?.length ? { retainKeys } : undefined)
    const next = visibleDailyRecommendations(response.recommendations)
    setRecommendations(next)
    setActiveIndex((current) => clampIndex(current, next.length))
    return next
  }, [])

  useEffect(() => {
    let cancelled = false
    setRecommendations([])
    setActiveIndex(0)
    fetchDailyRecommendation()
      .then((response) => {
        if (cancelled) return
        setRecommendations(visibleDailyRecommendations(response.recommendations))
        setActiveIndex(0)
      })
      .catch(() => {
        if (!cancelled) {
          setRecommendations([])
          setActiveIndex(0)
        }
      })
    return () => {
      cancelled = true
    }
  }, [activeOrgId])

  useEffect(() => {
    setActiveIndex((current) => clampIndex(current, slides.length))
  }, [slides.length])

  useEffect(() => {
    if (slides.length <= 1 || hovered || acting || suggestionReview.open) return
    const timer = window.setInterval(() => {
      setActiveIndex((current) => clampIndex(current + 1, slides.length))
    }, AUTO_ROTATE_MS)
    return () => window.clearInterval(timer)
  }, [acting, hovered, slides.length, suggestionReview.open])

  const runInlineEnable = useCallback(async (rec: DailyRecommendation) => {
    switch (rec.key) {
      case 'customer_brain':
        await setCustomerBrainEnabled(true)
        return
      case 'cortex_max': {
        if (!rec.meta?.brainId) throw new Error('Missing brain id')
        const result = await toggleCortexMax(rec.meta.brainId, true)
        if (!result.success) throw new Error('Cortex Max toggle failed')
        return
      }
      case 'nightly_dreaming':
        await updateCompanyCortexSettings({ enabled: true, schedule: 'daily' })
        return
      case 'skill_recommendations':
        await updateSkillRecommendationSettings(true)
        return
      default:
        throw new Error(`No inline action for ${rec.key}`)
    }
  }, [])

  const handleDailyCta = useCallback(
    async (rec: DailyRecommendation) => {
      if (acting) return
      const copy = DAILY_RECOMMENDATION_COPY[rec.key]
      const action = copy.action

      if (action.type === 'route') {
        router.push(action.path)
        return
      }
      if (action.type === 'team-communication') {
        const params = new URLSearchParams()
        params.set('agent', action.agentKey ?? 'vibey')
        params.set('panel', 'communication')
        if (action.connect) params.set('connect', action.connect)
        router.push(`/team?${params.toString()}`)
        return
      }
      if (action.type === 'workspace-settings') {
        openWorkspaceSettings(action.section)
        return
      }
      if (action.type === 'account-settings') {
        openAccountSettings(action.section)
        return
      }

      setActing(true)
      try {
        await runInlineEnable(rec)
        toast.success(INLINE_SUCCESS_TOASTS[rec.key] ?? 'Enabled.')
        const retainKeys = recommendations
          .filter((item) => item.key !== rec.key)
          .map((item) => item.key)
        await loadRecommendations(retainKeys)
      } catch {
        toast.error("I couldn't enable that. Try again from settings.")
      } finally {
        setActing(false)
      }
    },
    [
      acting,
      loadRecommendations,
      openAccountSettings,
      openWorkspaceSettings,
      recommendations,
      router,
      runInlineEnable,
    ],
  )

  if (!suggestionReview.loaded && recommendations.length === 0) return null
  if (slides.length === 0) return null

  const active = slides[activeIndex] ?? slides[0]
  if (!active) return null

  const fadeInitial = prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 6 }
  const fadeExit = prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -6 }

  const isSuggestionSlide = active.kind === 'suggestion'
  const bannerClass = isSuggestionSlide ? 'banner-glass-amber' : 'banner-glass-purple'
  const badgeClass = isSuggestionSlide
    ? 'badge-glass badge-glass-orange'
    : 'badge-glass badge-glass-purple'

  let title = 'Suggestions are ready for review'
  let body = getSuggestionBannerBody(suggestionReview.items)
  let cta = 'Review'
  let titleClass = 'body-2 font-semibold'
  let onCta = () => suggestionReview.setOpen(true)
  let ctaDisabled = acting

  if (active.kind === 'daily') {
    const copy = DAILY_RECOMMENDATION_COPY[active.rec.key]
    if (!copy) return null
    title = copy.title
    body = copy.body
    cta = copy.cta
    titleClass = GRADIENT_TITLE_KEYS.has(active.rec.key)
      ? 'body-2 font-semibold cortex-max-gradient-text'
      : 'body-2 font-semibold'
    onCta = () => void handleDailyCta(active.rec)
    ctaDisabled = acting
  }

  const isV4 = variant === 'v4'

  return (
    <>
      <div
        className={isV4 ? undefined : 'mb-6'}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={active.key}
            initial={fadeInitial}
            animate={{ opacity: 1, y: 0 }}
            exit={fadeExit}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className={
              isV4
                ? 'hd4-rec-banner'
                : `${bannerClass} gap-spacing-3 flex flex-col sm:flex-row sm:items-center sm:justify-between`
            }
          >
            <div className="relative z-10 min-w-0">
              <span
                className={
                  isV4
                    ? 'hd4-rec-badge'
                    : `${badgeClass} body-4 rounded-spacing-2 mb-2 inline-block px-2 py-0.5`
                }
              >
                For you
              </span>
              <p className={isV4 ? 'hd4-rec-title' : titleClass}>{title}</p>
              <p className={isV4 ? 'hd4-rec-body' : 'body-3 text-muted-foreground mt-1'}>{body}</p>
            </div>
            <div className="relative z-10 shrink-0">
              <button
                type="button"
                className={
                  isV4
                    ? 'hd4-rec-cta'
                    : 'button-glass-accent rounded-spacing-2 px-spacing-4 py-spacing-2 body-3 shrink-0 font-medium'
                }
                onClick={onCta}
                disabled={ctaDisabled}
              >
                {cta}
              </button>
            </div>
          </motion.div>
        </AnimatePresence>

        {slides.length > 1 ? (
          <div
            className={
              isV4 ? 'hd4-rec-dots' : 'gap-spacing-2 mt-3 flex items-center justify-center'
            }
          >
            {slides.map((slide, index) => (
              <button
                key={slide.key}
                type="button"
                aria-label={`Show recommendation ${index + 1}`}
                onClick={() => setActiveIndex(index)}
                className={
                  isV4
                    ? index === activeIndex
                      ? 'hd4-rec-dot hd4-rec-dot-active'
                      : 'hd4-rec-dot'
                    : `h-1.5 rounded-full border-0 p-0 transition-all duration-300 ${
                        index === activeIndex
                          ? 'bg-primary w-6 opacity-100'
                          : 'bg-muted-foreground w-1.5 opacity-30'
                      }`
                }
              />
            ))}
          </div>
        ) : null}
      </div>

      <SuggestionReviewModal
        open={suggestionReview.open}
        items={suggestionReview.items}
        selectedId={suggestionReview.selectedId}
        busyId={suggestionReview.busyId}
        onApplyJaime={(item) => void suggestionReview.applyJaime(item)}
        onAtlasDecision={(item, decision) => void suggestionReview.reviewAtlas(item, decision)}
        onDismissJaime={(item) => void suggestionReview.dismissJaime(item)}
        onEvaluateJaime={(item) => void suggestionReview.evaluateJaime(item)}
        onOpenChange={suggestionReview.setOpen}
        onSelect={suggestionReview.setSelectedId}
      />
    </>
  )
}
