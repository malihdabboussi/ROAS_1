'use client'

import { backendGet, backendPost } from '@/lib/api/backend-client'

export type DailyRecommendationKey =
  | 'customer_brain'
  | 'feed_brain'
  | 'cortex_max'
  | 'nightly_dreaming'
  | 'review_signals'
  | 'skill_recommendations'
  | 'first_integration'
  | 'connect_slack'
  | 'connect_telegram'
  | 'sender_domain'
  | 'custom_domain'
  | 'first_automation'
  | 'first_funnel'
  | 'import_contacts'
  | 'invite_teammate'
  | 'first_form'
  | 'first_custom_skill'

export interface DailyRecommendation {
  key: DailyRecommendationKey
  tier: 1 | 2 | 3
  meta?: { brainId?: string }
}

export interface DailyRecommendationResponse {
  recommendations: DailyRecommendation[]
}

export async function fetchDailyRecommendation(options?: {
  retainKeys?: DailyRecommendationKey[]
}): Promise<DailyRecommendationResponse> {
  const params = new URLSearchParams()
  if (options?.retainKeys?.length) {
    params.set('retain', options.retainKeys.join(','))
  }
  const suffix = params.toString()
  return backendGet<DailyRecommendationResponse>(
    suffix ? `/api/home/daily-recommendation?${suffix}` : '/api/home/daily-recommendation',
  )
}

export async function dismissDailyRecommendation(
  key: DailyRecommendationKey,
): Promise<{ success: boolean }> {
  return backendPost<{ success: boolean }>(
    `/api/home/daily-recommendation/${encodeURIComponent(key)}/dismiss`,
    {},
  )
}
