import { BadRequestException, Injectable } from '@nestjs/common'
import type { RequestScope } from '@vibey/api-shared'
import { SkillRecommendationsRepository } from '../repositories/skill-recommendations.repository'
import type {
  SkillRecommendationCandidateRow,
  SkillRecommendationHomePending,
  SkillRecommendationHomeResponse,
  SkillRecommendationRow,
  SkillRecommendationSettings,
} from '../types/skill-recommendations.types'
import { SkillRecommendationDetectionService } from './skill-recommendation-detection.service'

const SETTINGS_KEY = 'skill_recommendations'

@Injectable()
export class SkillRecommendationsService {
  constructor(
    private readonly repository: SkillRecommendationsRepository,
    private readonly detection: SkillRecommendationDetectionService,
  ) {}

  async getSettings(scope: Pick<RequestScope, 'orgId'>): Promise<SkillRecommendationSettings> {
    if (!scope.orgId) return { enabled: false }
    return this.readSettings(scope.orgId)
  }

  async updateSettings(orgId: string, enabled: boolean): Promise<SkillRecommendationSettings> {
    const { data: org, error: readError } = await this.repository.readOrganizationSettings(orgId)
    if (readError) throw new Error(`Failed to read organization settings: ${readError.message}`)
    if (!org) throw new BadRequestException('Organization not found')

    const settings =
      org.settings && typeof org.settings === 'object' && !Array.isArray(org.settings)
        ? (org.settings as Record<string, unknown>)
        : {}
    const current =
      settings[SETTINGS_KEY] &&
      typeof settings[SETTINGS_KEY] === 'object' &&
      !Array.isArray(settings[SETTINGS_KEY])
        ? (settings[SETTINGS_KEY] as Record<string, unknown>)
        : {}
    const nextSettings = {
      ...settings,
      [SETTINGS_KEY]: {
        ...current,
        enabled,
      },
    }

    const { error: updateError } = await this.repository.updateOrganizationSettings(
      orgId,
      nextSettings,
    )
    if (updateError) {
      throw new Error(`Failed to update skill recommendation settings: ${updateError.message}`)
    }
    if (enabled) {
      await this.repository.materializeAgentLearningDreamSettings(orgId)
      void this.detection.scanOrg(orgId).catch(() => undefined)
    }
    return { enabled }
  }

  async getHome(
    scope: Pick<RequestScope, 'orgId'>,
    limit = 5,
  ): Promise<SkillRecommendationHomeResponse> {
    if (!scope.orgId) {
      return { settings: { enabled: false }, recommendations: [], pending: [] }
    }
    const settings = await this.readSettings(scope.orgId)
    if (!settings.enabled) {
      return { settings, recommendations: [], pending: [] }
    }

    void this.detection.scanOrg(scope.orgId).catch(() => undefined)

    const cappedLimit = Math.min(Math.max(Number(limit) || 5, 1), 20)
    const [{ data: recommendationRows, error: recError }, pending] = await Promise.all([
      this.repository.listReadyRecommendations(scope.orgId, cappedLimit),
      this.listPending(scope.orgId, cappedLimit),
    ])
    if (recError) throw new Error(`Failed to load skill recommendations: ${recError.message}`)

    return {
      settings,
      recommendations: (recommendationRows ?? []) as SkillRecommendationRow[],
      pending,
    }
  }

  async getRecommendation(
    scope: Pick<RequestScope, 'orgId'>,
    id: string,
  ): Promise<SkillRecommendationRow> {
    if (!scope.orgId) throw new BadRequestException('Organization context required')
    const { data, error } = await this.repository.getRecommendation(scope.orgId, id)
    if (error) throw new Error(`Failed to load skill recommendation: ${error.message}`)
    if (!data) throw new BadRequestException('Skill recommendation not found')
    return data as SkillRecommendationRow
  }

  async updateRecommendation(
    scope: Pick<RequestScope, 'orgId'>,
    id: string,
    status: 'dismissed' | 'converted',
  ): Promise<SkillRecommendationRow> {
    if (!scope.orgId) throw new BadRequestException('Organization context required')
    const { data, error } = await this.repository.updateRecommendationStatus(
      scope.orgId,
      id,
      status,
    )
    if (error) throw new Error(`Failed to update skill recommendation: ${error.message}`)
    if (!data) throw new BadRequestException('Skill recommendation not found')
    const row = data as SkillRecommendationRow
    await this.repository.updateCandidateStatusByOrg(scope.orgId, row.candidate_id, status)
    return row
  }

  private async readSettings(orgId: string): Promise<SkillRecommendationSettings> {
    const { data, error } = await this.repository.readOrganizationSettings(orgId)
    if (error) throw new Error(`Failed to read organization settings: ${error.message}`)
    const settings = data?.settings
    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
      return { enabled: false }
    }
    const raw = (settings as Record<string, unknown>)[SETTINGS_KEY]
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { enabled: false }
    return { enabled: (raw as Record<string, unknown>).enabled === true }
  }

  private async listPending(
    orgId: string,
    limit: number,
  ): Promise<SkillRecommendationHomePending[]> {
    const { data, error } = await this.repository.listPendingCandidates(orgId, limit)
    if (error) throw new Error(`Failed to load pending recommendations: ${error.message}`)
    return ((data ?? []) as SkillRecommendationCandidateRow[]).map((candidate) => ({
      id: candidate.id,
      candidate_id: candidate.id,
      target_agent_key: candidate.agent_key,
      run_count: candidate.run_count,
      status: candidate.status,
      last_seen_at: candidate.last_event_at,
      tool_names: candidate.tool_names ?? [],
    }))
  }
}
