import { Injectable } from '@nestjs/common'
import { ArtifactAvatarsRepository } from '../repositories/artifact-avatars.repository'
import {
  buildDeleteConfirmBlock,
  callOrExtracted,
  tryPersistMissionDeliverable,
} from '../utils/artifact-domain-handler-shared.util'
import type { ArtifactActionHandler } from './artifact-action.registry'
import { getActiveSpaceId } from './artifact-space-scope'
import { ensureSpaceView } from './ensure-space-view'

@Injectable()
export class ArtifactAvatarsService {
  constructor(
    private readonly avatarsRepository: ArtifactAvatarsRepository = new ArtifactAvatarsRepository(),
  ) {}

  private static readonly REQUIRED_PERSONA_SECTIONS = [
    'demographics',
    'core_problem',
    'powerful_emotions',
    'biggest_fears',
    'fear_impact_on_relationships',
    'hurtful_comments',
    'past_attempts_to_solve',
    'avoidance_behaviors',
    'perfect_outcomes',
    'transformation_impact',
    'success_markers',
    'secondary_gains',
    'blame_targets',
    'main_objections',
    'background_profile',
    'psychological_drivers',
    'internal_voice',
    'content_preferences',
    'comprehensive_summary',
  ] as const

  getHandlers(target: Record<string, any>): Record<string, ArtifactActionHandler> {
    return {
      list_avatars: (data, sessionKey) =>
        callOrExtracted(
          target,
          'listAvatars',
          () => this.listAvatars(target, data, sessionKey),
          data,
          sessionKey,
        ),
      get_avatar: (data, sessionKey) =>
        callOrExtracted(
          target,
          'getAvatar',
          () => this.getAvatar(target, data, sessionKey),
          data,
          sessionKey,
        ),
      create_avatar: (data, sessionKey) =>
        callOrExtracted(
          target,
          'createAvatar',
          () => this.createAvatar(target, data, sessionKey),
          data,
          sessionKey,
        ),
      update_avatar: (data, sessionKey) =>
        callOrExtracted(
          target,
          'updateAvatar',
          () => this.updateAvatar(target, data, sessionKey),
          data,
          sessionKey,
        ),
      delete_avatar: (data, sessionKey) => this.deleteAvatar(target, data, sessionKey),
    }
  }

  private async listAvatars(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const campaignId = await target.resolveCampaignId(supabase, input, userId, sessionKey)
    if (!campaignId) {
      return { success: false, error: 'campaign_id required. Select a campaign first.' }
    }
    const { data, error } = await this.avatarsRepository.listAvatars(supabase, {
      userId,
      campaignId,
    })
    if (error) throw error
    return data
  }

  private resolveAvatarId(input: Record<string, unknown>): string {
    const raw = input.avatar_id ?? input.id
    return typeof raw === 'string' ? raw.trim() : ''
  }

  private mergePersonaData(
    existing: Record<string, unknown>,
    patch: Record<string, unknown>,
  ): Record<string, unknown> {
    const out = { ...existing }
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined) continue
      out[k] = v
    }
    return out
  }

  private async getAvatar(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const avatarId = this.resolveAvatarId(input)
    if (!avatarId) return { success: false, error: 'avatar_id required' }
    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const { data, error } = await this.avatarsRepository.findAvatar(supabase, {
      avatarId,
      userId,
      select: '*',
    })
    if (error) throw error
    if (!data) return { success: false, error: 'avatar not found or access denied' }
    return data
  }

  private async updateAvatar(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const avatarId = this.resolveAvatarId(input)
    if (!avatarId) return { success: false, error: 'avatar_id required' }
    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)

    const { data: row, error: fetchError } = await this.avatarsRepository.findAvatar(supabase, {
      avatarId,
      userId,
      select: 'id, persona_data, name, avatar_type, offer_id',
    })
    if (fetchError) throw fetchError
    if (!row) return { success: false, error: 'avatar not found or access denied' }

    const updates: Record<string, unknown> = {}
    if (typeof input.name === 'string') updates.name = input.name
    if (typeof input.avatar_type === 'string') updates.avatar_type = input.avatar_type
    if (Object.prototype.hasOwnProperty.call(input, 'offer_id')) {
      updates.offer_id = input.offer_id === null || input.offer_id === '' ? null : input.offer_id
    }
    if (input.persona_data !== undefined) {
      if (
        input.persona_data === null ||
        typeof input.persona_data !== 'object' ||
        Array.isArray(input.persona_data)
      ) {
        return { success: false, error: 'persona_data must be an object when provided' }
      }
      const existing =
        row.persona_data && typeof row.persona_data === 'object' && !Array.isArray(row.persona_data)
          ? (row.persona_data as Record<string, unknown>)
          : {}
      updates.persona_data = this.mergePersonaData(
        existing,
        input.persona_data as Record<string, unknown>,
      )
    }

    if (Object.keys(updates).length === 0) {
      return {
        success: false,
        error: 'No updatable fields supplied (name, avatar_type, offer_id, persona_data)',
      }
    }

    const { data, error } = await this.avatarsRepository.updateAvatar(supabase, {
      avatarId,
      userId,
      updates,
    })
    if (error) throw error
    if (!data) return { success: false, error: 'avatar not found or access denied' }
    return data
  }

  private async createAvatar(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const campaignId = await target.resolveCampaignId(supabase, input, userId, sessionKey)
    if (!campaignId) {
      return { success: false, error: 'campaign_id required. Create or select a campaign first.' }
    }

    const personaData = (input.persona_data ?? {}) as Record<string, unknown>
    const missingSections = ArtifactAvatarsService.REQUIRED_PERSONA_SECTIONS.filter(
      (key: string) =>
        !(key in personaData) ||
        personaData[key] === null ||
        personaData[key] === '' ||
        (Array.isArray(personaData[key]) && (personaData[key] as unknown[]).length === 0),
    )
    if (missingSections.length > 0) {
      return {
        success: false,
        error: 'incomplete_persona',
        missing_sections: missingSections,
        message: `Persona is missing ${missingSections.length} required sections: ${missingSections.join(', ')}. Generate all sections before saving.`,
      }
    }

    const orgId = target.resolveOrgId?.(sessionKey) as string | null | undefined
    const spaceId = getActiveSpaceId(input)
    const { data, error } = await this.avatarsRepository.createAvatar(supabase, {
      user_id: userId,
      org_id: orgId ?? null,
      campaign_id: campaignId,
      ...(spaceId ? { space_id: spaceId } : {}),
      offer_id: (input.offer_id as string) ?? null,
      name: (input.name as string) ?? 'Untitled Avatar',
      avatar_type: (input.avatar_type as string) ?? null,
      persona_data: personaData,
    })
    if (error) throw error
    const avatar = data as Record<string, any>
    await ensureSpaceView({
      supabase,
      spaceId,
      campaignId,
      viewType: 'avatars',
      logger: target.logger,
    })

    const demographics =
      personaData.demographics && typeof personaData.demographics === 'object'
        ? (personaData.demographics as Record<string, unknown>)
        : {}
    const pickCareer = (d: Record<string, unknown>): string | undefined => {
      for (const k of [
        'occupation',
        'career',
        'job_title',
        'role',
        'profession',
        'industry',
        'title',
      ]) {
        const v = d[k]
        if (typeof v === 'string' && v.trim()) return v.trim()
      }
      return undefined
    }
    const pickAge = (d: Record<string, unknown>): string | undefined => {
      for (const k of ['age', 'age_range']) {
        const v = d[k]
        if (v !== undefined && v !== null && String(v).trim()) return String(v).trim()
      }
      return undefined
    }
    const career = pickCareer(demographics) ?? pickCareer(personaData as Record<string, unknown>)
    const age = pickAge(demographics) ?? pickAge(personaData as Record<string, unknown>)
    const bgRaw = personaData.background_profile
    const backgroundProfile = typeof bgRaw === 'string' && bgRaw.trim() ? bgRaw.trim() : undefined

    await tryPersistMissionDeliverable(target, sessionKey, {
      type: 'avatar',
      entityId: avatar.id,
      entityTable: 'avatars',
      title: avatar.name ?? 'Untitled Avatar',
      sourceAction: 'create_avatar',
    })
    return {
      ui_blocks: [
        {
          type: 'artifact_preview',
          id: `artifact-avatar-${avatar.id}`,
          artifactType: 'avatar',
          artifactId: avatar.id,
          name: avatar.name ?? 'Untitled Avatar',
          career: career ?? undefined,
          age: age ?? undefined,
          backgroundProfile,
          imageUrl:
            typeof personaData.avatar_image === 'string' ? personaData.avatar_image : undefined,
          spaceId: spaceId ?? undefined,
        },
      ],
      ...avatar,
    }
  }

  private async deleteAvatar(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const avatarId = String(input.avatar_id ?? '').trim()
    if (!avatarId) return { success: false, error: 'avatar_id is required' }
    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const { data, error } = await this.avatarsRepository.findAvatar(supabase, {
      avatarId,
      userId,
      select: 'id, name',
    })
    if (error) throw error
    if (!data) return { success: false, error: 'Avatar not found' }
    const avatar = data as { id: string; name?: string | null }
    return {
      success: true,
      status: 'pending_approval',
      ui_blocks: [
        buildDeleteConfirmBlock({
          action: 'delete_avatar',
          entityType: 'avatar',
          entityId: avatar.id,
          entityName: avatar.name ?? 'Untitled Avatar',
        }),
      ],
    }
  }
}
