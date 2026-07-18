import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ArtifactThemesRepository } from '../repositories/artifact-themes.repository'
import {
  buildDeleteConfirmBlock,
  callOrExtracted,
} from '../utils/artifact-domain-handler-shared.util'
import { generateCompleteThemeColors } from '../utils/theme-color-generator.util'
import type { UserThemeColors } from '../utils/theme-color-generator.util'
import type { ArtifactActionHandler } from './artifact-action.registry'

const BRANDING_THEME_UPDATE_KEYS = [
  'colors',
  'logo_asset_id',
  'headshot_images',
  'product_images',
  'font_heading',
  'font_body',
  'brand_voice',
  'brand_values',
  'social_links',
  'design_settings',
  'image_style_prompt',
  'status',
] as const

const BRANDING_THEME_CREATE_KEYS = [
  'logo_asset_id',
  'headshot_images',
  'product_images',
  'brand_values',
  'social_links',
  'design_settings',
  'image_style_prompt',
] as const

const BRANDING_THEME_CREATE_DEFAULTS: Partial<Record<(typeof BRANDING_THEME_CREATE_KEYS)[number], unknown>> = {
  headshot_images: [],
  product_images: [],
  social_links: {},
}

@Injectable()
export class ArtifactThemesService {
  constructor(
    private readonly themesRepository: ArtifactThemesRepository = new ArtifactThemesRepository(),
  ) {}

  getHandlers(target: Record<string, any>): Record<string, ArtifactActionHandler> {
    return {
      list_themes: (data, sessionKey) =>
        callOrExtracted(
          target,
          'listThemes',
          () => this.listThemes(target, data, sessionKey),
          data,
          sessionKey,
        ),
      create_theme: (data, sessionKey) =>
        callOrExtracted(
          target,
          'createTheme',
          () => this.createTheme(target, data, sessionKey),
          data,
          sessionKey,
        ),
      get_theme: (data, sessionKey) =>
        callOrExtracted(
          target,
          'getTheme',
          () => this.getTheme(target, data, sessionKey),
          data,
          sessionKey,
        ),
      update_theme: (data, sessionKey) =>
        callOrExtracted(
          target,
          'updateTheme',
          () => this.updateTheme(target, data, sessionKey),
          data,
          sessionKey,
        ),
      delete_theme: (data, sessionKey) => this.deleteTheme(target, data, sessionKey),
      extract_website_theme: (data, sessionKey) =>
        this.extractWebsiteTheme(target, data, sessionKey),
    }
  }

  private async listThemes(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const userId = target.resolveUserId(sessionKey)
    const orgId = target.resolveOrgId?.(sessionKey) as string | null | undefined
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const table = await target.getThemeTableName()
    const listResult =
      table === 'branding_themes'
        ? await this.themesRepository.listBrandingThemes(supabase, {
            userId,
            orgId,
          })
        : await this.themesRepository.listLegacyThemes(supabase)
    const { data, error } = listResult
    if (error) throw error

    const campaignId = await target.resolveCampaignId(supabase, input, userId, sessionKey)
    let activeThemeId: string | null = null
    if (campaignId) {
      const { data: campaign, error: campaignError } =
        await this.themesRepository.findCampaignConfigForUser(supabase, {
          campaignId,
          userId,
        })
      if (campaignError) throw campaignError
      const config = (campaign?.config ?? {}) as Record<string, unknown>
      const agentSettings = (config.agent_settings ?? {}) as Record<string, unknown>
      activeThemeId = target.parseThemeId(agentSettings.theme_id)
    }

    return (data ?? []).map((theme: any) => {
      const row = theme as Record<string, unknown>
      return {
        ...row,
        is_active: !!activeThemeId && row.id === activeThemeId,
      }
    })
  }

  private async createTheme(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const orgId = target.resolveOrgId?.(sessionKey) as string | null | undefined
    const table = await target.getThemeTableName()

    if (table === 'branding_themes') {
      const slug = String((input.slug as string) || (input.name as string) || 'untitled-theme')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')

      // Support both flat `colors` and legacy `config.colors` payloads during migration.
      const rawColors =
        input.colors && typeof input.colors === 'object' && !Array.isArray(input.colors)
          ? (input.colors as Record<string, unknown>)
          : (input.config as Record<string, unknown>)?.colors &&
              typeof (input.config as Record<string, unknown>).colors === 'object'
            ? ((input.config as Record<string, unknown>).colors as Record<string, unknown>)
            : {}

      const { data, error } = await this.themesRepository.createBrandingTheme(supabase, {
        user_id: userId,
        org_id: orgId ?? null,
        slug,
        name: (input.name as string) ?? 'Untitled Theme',
        colors: generateCompleteThemeColors(rawColors),
        font_heading:
          (input.font_heading as string | null) ??
          ((input.config as Record<string, unknown>)?.fonts as Record<string, unknown>)?.heading ??
          null,
        font_body:
          (input.font_body as string | null) ??
          ((input.config as Record<string, unknown>)?.fonts as Record<string, unknown>)?.body ??
          null,
        brand_voice:
          (input.brand_voice as Record<string, unknown> | null) ??
          ((input.config as Record<string, unknown>)?.voice as Record<string, unknown> | null) ??
          null,
        ...Object.fromEntries(
          BRANDING_THEME_CREATE_KEYS.map((key) => [
            key,
            input[key] ?? BRANDING_THEME_CREATE_DEFAULTS[key] ?? null,
          ]),
        ),
        is_system: false,
        status: (input.status as string | null) ?? 'draft',
      })
      if (error) throw error
      const theme = data as Record<string, any>

      // Auto-assign the new theme to the active campaign
      const campaignId = await target.resolveCampaignId(supabase, input, userId, sessionKey)
      if (campaignId) {
        const { data: campaign } = await this.themesRepository.findCampaignConfig(
          supabase,
          campaignId,
        )
        if (campaign) {
          const existingConfig = (campaign.config ?? {}) as Record<string, unknown>
          const existingAgentSettings = (existingConfig.agent_settings ?? {}) as Record<
            string,
            unknown
          >
          await this.themesRepository.updateCampaignConfig(supabase, {
            campaignId,
            config: {
              ...existingConfig,
              agent_settings: {
                ...existingAgentSettings,
                theme_id: theme.id,
              },
            },
          })
        }
      }

      return data
    }

    const { data, error } = await this.themesRepository.createLegacyTheme(supabase, {
      name: (input.name as string) ?? 'Untitled Theme',
      config: input.config ?? {},
      is_system: false,
    })
    if (error) throw error
    return data
  }

  private async getTheme(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const themeId = String(input.theme_id ?? '').trim()
    if (!themeId) return { success: false, error: 'theme_id is required' }
    const userId = target.resolveUserId(sessionKey)
    const orgId = target.resolveOrgId?.(sessionKey) as string | null | undefined
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const { data, error } = await this.themesRepository.findBrandingTheme(supabase, themeId)
    if (error) throw error
    if (!data) return { success: false, error: 'Theme not found' }
    if (!data.is_system && String(data.user_id ?? '') !== userId) {
      if (!orgId || String(data.org_id ?? '') !== orgId) {
        return { success: false, error: 'Theme not found' }
      }
    }
    return data
  }

  private generateThemeSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  }

  private async checkThemeSlugExists(
    supabase: SupabaseClient,
    userId: string,
    slug: string,
    excludeId: string | undefined,
    orgId: string | null | undefined,
  ): Promise<boolean> {
    const { exists, error } = await this.themesRepository.brandingSlugExists(supabase, {
      userId,
      slug,
      excludeId,
      orgId,
    })
    if (error) throw error
    return exists
  }

  private async updateTheme(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const themeId = String(input.theme_id ?? '').trim()
    if (!themeId) return { success: false, error: 'theme_id is required' }
    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const orgId =
      typeof target.resolveOrgId === 'function' ? target.resolveOrgId(sessionKey) : undefined

    const table = await target.getThemeTableName()

    if (table === 'themes') {
      const legacyUpdates: Record<string, unknown> = {}
      if (input.name !== undefined) legacyUpdates.name = input.name
      if (input.config !== undefined) legacyUpdates.config = input.config
      if (Object.keys(legacyUpdates).length === 0)
        return { success: false, error: 'No fields to update' }
      const { data, error } = await this.themesRepository.updateLegacyTheme(supabase, {
        themeId,
        userId,
        updates: legacyUpdates,
      })
      if (error) throw error
      if (!data) return { success: false, error: 'Theme not found' }
      return data
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (input.name !== undefined) {
      const nameStr = String(input.name)
      updates.name = nameStr
      let newSlug = this.generateThemeSlug(nameStr)
      const slugExists = await this.checkThemeSlugExists(supabase, userId, newSlug, themeId, orgId)
      if (slugExists) newSlug = `${newSlug}-${Date.now()}`
      updates.slug = newSlug
    }

    for (const key of BRANDING_THEME_UPDATE_KEYS) {
      if (input[key] !== undefined) {
        if (key === 'colors') {
          updates.colors = generateCompleteThemeColors(input.colors as UserThemeColors)
        } else {
          updates[key] = input[key]
        }
      }
    }

    const meaningfulKeys = Object.keys(updates).filter((k) => k !== 'updated_at')
    if (meaningfulKeys.length === 0) return { success: false, error: 'No fields to update' }

    const { data, error } = await this.themesRepository.updateBrandingTheme(supabase, {
      themeId,
      userId,
      orgId,
      updates,
    })
    if (error) throw error
    if (!data) return { success: false, error: 'Theme not found' }
    return data
  }

  private async deleteTheme(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const themeId = String(input.theme_id ?? '').trim()
    if (!themeId) return { success: false, error: 'theme_id is required' }
    const userId = target.resolveUserId(sessionKey)
    const orgId = target.resolveOrgId?.(sessionKey) as string | null | undefined
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const { data, error } = await this.themesRepository.findDeletableBrandingTheme(supabase, {
      themeId,
      userId,
      orgId,
    })
    if (error) throw error
    if (!data) return { success: false, error: 'Theme not found' }
    if (data.is_system) return { success: false, error: 'System themes cannot be deleted' }
    const theme = data as { id: string; name?: string | null }
    return {
      success: true,
      status: 'pending_approval',
      ui_blocks: [
        buildDeleteConfirmBlock({
          action: 'delete_theme',
          entityType: 'theme',
          entityId: theme.id,
          entityName: theme.name ?? 'Untitled Theme',
        }),
      ],
    }
  }

  private async extractWebsiteTheme(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const url = String(input.url ?? '').trim()
    if (!url) return { success: false, error: 'url is required' }
    try {
      new URL(url)
    } catch {
      return {
        success: false,
        error: 'Invalid URL format. Provide a full URL like https://example.com',
      }
    }
    return target.mainApiCall('POST', '/api/themes/extract/website', sessionKey, { url })
  }
}
