'use client'

import { backendGet, backendPatch, backendPost } from '@/lib/api/backend-client'
import type {
  SkillRecommendation,
  SkillRecommendationApplyResponse,
  SkillRecommendationExperimentEvaluation,
  SkillRecommendationHomeResponse,
  SkillRecommendationSettings,
} from './types'

export async function fetchSkillRecommendationSettings(): Promise<SkillRecommendationSettings> {
  return backendGet<SkillRecommendationSettings>('/api/skill-recommendations/settings')
}

export async function updateSkillRecommendationSettings(
  enabled: boolean,
): Promise<SkillRecommendationSettings> {
  return backendPatch<SkillRecommendationSettings>('/api/skill-recommendations/settings', {
    enabled,
  })
}

export async function fetchSkillRecommendationHome(
  limit = 5,
): Promise<SkillRecommendationHomeResponse> {
  return backendGet<SkillRecommendationHomeResponse>(
    `/api/skill-recommendations/home?limit=${encodeURIComponent(String(limit))}`,
  )
}

export async function fetchSkillRecommendationDetail(id: string): Promise<SkillRecommendation> {
  return backendGet<SkillRecommendation>(`/api/skill-recommendations/${encodeURIComponent(id)}`)
}

export async function updateSkillRecommendationStatus(
  id: string,
  status: 'dismissed' | 'converted',
): Promise<SkillRecommendation> {
  return backendPatch<SkillRecommendation>(`/api/skill-recommendations/${encodeURIComponent(id)}`, {
    status,
  })
}

export async function applySkillRecommendation(
  id: string,
): Promise<SkillRecommendationApplyResponse> {
  return backendPost<SkillRecommendationApplyResponse>(
    `/api/skill-recommendations/${encodeURIComponent(id)}/apply`,
    {},
  )
}

export async function evaluateSkillRecommendationExperiment(
  id: string,
): Promise<SkillRecommendationExperimentEvaluation> {
  return backendPost<SkillRecommendationExperimentEvaluation>(
    `/api/skill-recommendations/${encodeURIComponent(id)}/experiment/evaluate`,
    {},
  )
}
