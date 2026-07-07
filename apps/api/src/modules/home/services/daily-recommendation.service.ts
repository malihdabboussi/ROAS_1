import { Injectable } from '@nestjs/common'
import type { RequestScope } from '@vibey/api-shared'
import {
  DAILY_RECOMMENDATION_RULES,
  type DailyRecommendationFacts,
  type DailyRecommendationKey,
  type DailyRecommendationRule,
  type DailyRecommendationTier,
} from '../config/daily-recommendation-rules'
import { DailyRecommendationRepository } from '../repositories/daily-recommendation.repository'

const SNOOZE_DAYS = 30
const MS_PER_DAY = 86_400_000
const MAX_RECOMMENDATIONS = 3

export interface DailyRecommendationItem {
  key: DailyRecommendationKey
  tier: DailyRecommendationTier
  meta?: { brainId?: string }
}

export interface DailyRecommendationResult {
  recommendations: DailyRecommendationItem[]
}

export interface GetDailyRecommendationOptions {
  retainKeys?: DailyRecommendationKey[]
}

@Injectable()
export class DailyRecommendationService {
  constructor(private readonly repository: DailyRecommendationRepository) {}

  async getDailyRecommendation(
    scope: RequestScope,
    options: GetDailyRecommendationOptions = {},
  ): Promise<DailyRecommendationResult> {
    // Viewers cannot act on any recommendation (toggles and setup flows are editor+).
    if (scope.orgId && scope.orgRole === 'viewer') return { recommendations: [] }

    const isAdmin = !scope.orgId || scope.orgRole === 'owner' || scope.orgRole === 'admin'

    const candidates: DailyRecommendationRule[] = []
    const seenKeys = new Set<DailyRecommendationKey>()
    let tier1Facts: DailyRecommendationFacts | null = null

    for (const tier of [1, 2, 3] as DailyRecommendationTier[]) {
      const facts = await this.repository.fetchTierFacts(tier, scope)
      if (tier === 1) tier1Facts = facts

      const tierCandidates = this.resolveTierCandidates(tier, facts, scope, isAdmin)
      for (const rule of tierCandidates) {
        if (seenKeys.has(rule.key)) continue
        seenKeys.add(rule.key)
        candidates.push(rule)
      }
    }

    const picked = this.pickUpToMax(candidates, MAX_RECOMMENDATIONS, options.retainKeys)

    return {
      recommendations: picked.map((rule) => ({
        key: rule.key,
        tier: rule.tier,
        meta:
          rule.key === 'cortex_max' && tier1Facts?.defaultBrainId
            ? { brainId: tier1Facts.defaultBrainId }
            : undefined,
      })),
    }
  }

  async dismiss(scope: RequestScope, key: DailyRecommendationKey): Promise<{ success: boolean }> {
    const snoozedUntil = new Date(Date.now() + SNOOZE_DAYS * MS_PER_DAY).toISOString()
    await this.repository.upsertDismissal(scope, key, snoozedUntil)
    return { success: true }
  }

  private resolveTierCandidates(
    tier: DailyRecommendationTier,
    facts: DailyRecommendationFacts,
    scope: RequestScope,
    isAdmin: boolean,
  ): DailyRecommendationRule[] {
    const eligible = DAILY_RECOMMENDATION_RULES.filter(
      (rule) =>
        rule.tier === tier &&
        (!rule.orgOnly || Boolean(scope.orgId)) &&
        (!rule.adminOnly || isAdmin) &&
        rule.isUnmet(facts),
    )
    if (eligible.length === 0) return []

    const order = new Map(DAILY_RECOMMENDATION_RULES.map((rule, index) => [rule.key, index]))
    return eligible.sort((a, b) => (order.get(a.key) ?? 0) - (order.get(b.key) ?? 0))
  }

  private pickUpToMax(
    candidates: DailyRecommendationRule[],
    max: number,
    retainKeys: DailyRecommendationKey[] = [],
  ): DailyRecommendationRule[] {
    if (candidates.length === 0 || max <= 0) return []

    const candidateByKey = new Map(candidates.map((rule) => [rule.key, rule]))
    const picked: DailyRecommendationRule[] = []
    const pickedKeys = new Set<DailyRecommendationKey>()

    for (const key of retainKeys) {
      if (picked.length >= max) break
      const rule = candidateByKey.get(key)
      if (!rule || pickedKeys.has(rule.key)) continue
      picked.push(rule)
      pickedKeys.add(rule.key)
    }

    for (const rule of candidates) {
      if (picked.length >= max) break
      if (pickedKeys.has(rule.key)) continue
      picked.push(rule)
      pickedKeys.add(rule.key)
    }

    return picked
  }
}
