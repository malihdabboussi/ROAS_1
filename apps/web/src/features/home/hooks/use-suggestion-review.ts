'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  toAtlasSuggestionItem,
  toJaimeSuggestionItem,
  type SuggestionReviewItem,
} from '@/features/home/lib/suggestion-review'
import { fetchCompanyCortexSignals, reviewCompanyCortexSignal } from '@/lib/brain'
import { useOrgStore } from '@/lib/org'
import {
  applySkillRecommendation,
  evaluateSkillRecommendationExperiment,
  fetchSkillRecommendationHome,
  updateSkillRecommendationStatus,
} from '@/lib/skill-recommendations'
import type { SkillRecommendation, SkillRecommendationStatus } from '@/lib/skill-recommendations'

const HOME_SUGGESTION_LIMIT = 20

function replaceItem(
  items: SuggestionReviewItem[],
  id: string,
  patch: (item: SuggestionReviewItem) => SuggestionReviewItem,
): SuggestionReviewItem[] {
  return items.map((item) => (item.id === id ? patch(item) : item))
}

function updateJaimeStatus(
  item: SuggestionReviewItem,
  status: SkillRecommendationStatus,
  recommendation?: SkillRecommendation,
): SuggestionReviewItem {
  if (item.source !== 'jaime') return item
  return {
    ...item,
    recommendation: {
      ...(recommendation ?? item.recommendation),
      status,
    },
  }
}

function decisionToStatus(
  decision: 'keep' | 'revise' | 'revert' | 'inconclusive',
): SkillRecommendationStatus {
  if (decision === 'keep') return 'kept'
  if (decision === 'revise') return 'revising'
  if (decision === 'revert') return 'reverted'
  return 'inconclusive'
}

function atlasLocalStatus(decision: 'approve' | 'reject'): 'approved' | 'rejected' {
  return decision === 'approve' ? 'approved' : 'rejected'
}

export function useSuggestionReview() {
  const activeOrgId = useOrgStore((s) => s.activeOrgId)
  const [items, setItems] = useState<SuggestionReviewItem[]>([])
  const [loaded, setLoaded] = useState(false)
  const [open, setOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!activeOrgId) {
      setItems([])
      setLoaded(true)
      return
    }

    setLoaded(false)
    const [jaimeResult, atlasResult] = await Promise.allSettled([
      fetchSkillRecommendationHome(HOME_SUGGESTION_LIMIT),
      fetchCompanyCortexSignals(),
    ])

    const jaimeItems =
      jaimeResult.status === 'fulfilled'
        ? jaimeResult.value.recommendations.map(toJaimeSuggestionItem)
        : []
    const atlasItems =
      atlasResult.status === 'fulfilled' ? atlasResult.value.map(toAtlasSuggestionItem) : []
    const next = [...jaimeItems, ...atlasItems]

    setItems(next)
    setSelectedId((current) =>
      current && next.some((item) => item.id === current) ? current : (next[0]?.id ?? null),
    )
    setLoaded(true)
  }, [activeOrgId])

  useEffect(() => {
    void load()
  }, [load])

  const applyJaime = useCallback(async (item: SuggestionReviewItem & { source: 'jaime' }) => {
    setBusyId(item.id)
    try {
      const result = await applySkillRecommendation(item.recommendation.id)
      setItems((current) =>
        replaceItem(current, item.id, (existing) =>
          updateJaimeStatus(existing, 'experiment_running', result.recommendation),
        ),
      )
      toast.success('Agent improvement applied')
    } catch {
      toast.error('Failed to apply agent improvement')
    } finally {
      setBusyId(null)
    }
  }, [])

  const dismissJaime = useCallback(async (item: SuggestionReviewItem & { source: 'jaime' }) => {
    setBusyId(item.id)
    try {
      const updated = await updateSkillRecommendationStatus(item.recommendation.id, 'dismissed')
      setItems((current) =>
        replaceItem(current, item.id, (existing) =>
          updateJaimeStatus(existing, 'dismissed', updated),
        ),
      )
    } catch {
      toast.error('Failed to dismiss recommendation')
    } finally {
      setBusyId(null)
    }
  }, [])

  const evaluateJaime = useCallback(async (item: SuggestionReviewItem & { source: 'jaime' }) => {
    setBusyId(item.id)
    try {
      const result = await evaluateSkillRecommendationExperiment(item.recommendation.id)
      const status = decisionToStatus(result.decision)
      setItems((current) =>
        replaceItem(current, item.id, (existing) => updateJaimeStatus(existing, status)),
      )
      if (result.decision === 'keep') toast.success('Experiment kept')
      else if (result.decision === 'revert') toast.success('Experiment reverted')
      else if (result.decision === 'revise') toast.message('Experiment needs revision')
      else toast.message('Experiment is inconclusive')
    } catch {
      toast.error('Failed to evaluate experiment')
    } finally {
      setBusyId(null)
    }
  }, [])

  const reviewAtlas = useCallback(
    async (item: SuggestionReviewItem & { source: 'atlas' }, decision: 'approve' | 'reject') => {
      setBusyId(item.id)
      try {
        await reviewCompanyCortexSignal(item.signal.id, decision)
        setItems((current) =>
          replaceItem(current, item.id, (existing) =>
            existing.source === 'atlas'
              ? { ...existing, localStatus: atlasLocalStatus(decision) }
              : existing,
          ),
        )
        toast.success(
          decision === 'approve'
            ? 'Company signal approved and queued for formation.'
            : 'Company signal rejected.',
        )
      } catch {
        toast.error('Could not review company signal.')
      } finally {
        setBusyId(null)
      }
    },
    [],
  )

  return {
    items,
    loaded,
    open,
    selectedId,
    busyId,
    setOpen,
    setSelectedId,
    applyJaime,
    dismissJaime,
    evaluateJaime,
    reviewAtlas,
  }
}
