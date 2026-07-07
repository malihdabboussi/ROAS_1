/**
 * Themes Service
 * Layer 2: Business logic for theme CRUD
 * Ported from: Vibey_legacy/apps/app-backend/src/modules/themes/services/themes.service.ts
 */

import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { THEME_ERRORS } from '../config/theme-errors.config'
import type { CreateThemeInput, UpdateThemeInput } from '../dto/theme.dto'
import { ThemesRepository } from '../repositories/themes.repository'
import type { DEFAULT_DESIGN_SETTINGS, Theme, UserThemeColors } from '../types'
import { DEFAULT_DESIGN_SETTINGS as DEFAULTS } from '../types'
import { generateCompleteThemeColors } from '../utils/color-generator.util'

@Injectable()
export class ThemesService {
  private readonly logger = new Logger(ThemesService.name)

  constructor(private readonly themesRepository: ThemesRepository) {}

  async listThemes(
    supabase: SupabaseClient,
    userId: string,
    orgId?: string | null,
  ): Promise<Theme[]> {
    return this.themesRepository.findAllForUser(supabase, userId, orgId)
  }

  async getTheme(
    supabase: SupabaseClient,
    themeId: string,
    userId: string,
    orgId?: string | null,
  ): Promise<Theme> {
    const theme = await this.themesRepository.findById(supabase, themeId, userId, orgId)
    if (!theme) throw new NotFoundException(THEME_ERRORS.THEME_NOT_FOUND.userMessage)
    return theme
  }

  async createTheme(
    supabase: SupabaseClient,
    userId: string,
    dto: CreateThemeInput,
    orgId?: string | null,
  ): Promise<Theme> {
    const completeColors = generateCompleteThemeColors(dto.colors as UserThemeColors)
    let slug = this.generateSlug(dto.name)
    const slugExists = await this.themesRepository.checkSlugExists(
      supabase,
      userId,
      slug,
      undefined,
      orgId,
    )
    if (slugExists) slug = `${slug}-${Date.now()}`

    return this.themesRepository.create(
      supabase,
      {
        user_id: userId,
        slug,
        name: dto.name,
        colors: completeColors,
        logo_asset_id: dto.logo_asset_id || null,
        headshot_images: dto.headshot_images ?? [],
        product_images: dto.product_images ?? [],
        font_heading: dto.font_heading || null,
        font_body: dto.font_body || null,
        brand_voice: dto.brand_voice || null,
        brand_values: dto.brand_values || null,
        social_links: dto.social_links || null,
        design_settings: dto.design_settings || DEFAULTS,
        image_style_prompt: dto.image_style_prompt || null,
        is_system: false,
        status: dto.status || 'draft',
      },
      orgId,
    )
  }

  async updateTheme(
    supabase: SupabaseClient,
    themeId: string,
    userId: string,
    dto: UpdateThemeInput,
    orgId?: string | null,
  ): Promise<Theme> {
    const existing = await this.themesRepository.findById(supabase, themeId, userId, orgId)
    if (!existing) throw new NotFoundException(THEME_ERRORS.THEME_NOT_FOUND.userMessage)
    if (existing.is_system)
      throw new ForbiddenException(THEME_ERRORS.THEME_SYSTEM_IMMUTABLE.userMessage)
    if (existing.user_id !== userId)
      throw new ForbiddenException(THEME_ERRORS.THEME_NOT_FOUND.userMessage)

    const updateData: Record<string, unknown> = {}

    if (dto.name !== undefined) {
      updateData.name = dto.name
      let newSlug = this.generateSlug(dto.name)
      const slugExists = await this.themesRepository.checkSlugExists(
        supabase,
        userId,
        newSlug,
        themeId,
        orgId,
      )
      if (slugExists) newSlug = `${newSlug}-${Date.now()}`
      updateData.slug = newSlug
    }
    if (dto.colors !== undefined)
      updateData.colors = generateCompleteThemeColors(dto.colors as UserThemeColors)
    if (dto.logo_asset_id !== undefined) updateData.logo_asset_id = dto.logo_asset_id
    if (dto.headshot_images !== undefined) updateData.headshot_images = dto.headshot_images
    if (dto.product_images !== undefined) updateData.product_images = dto.product_images
    if (dto.font_heading !== undefined) updateData.font_heading = dto.font_heading
    if (dto.font_body !== undefined) updateData.font_body = dto.font_body
    if (dto.brand_voice !== undefined) updateData.brand_voice = dto.brand_voice
    if (dto.brand_values !== undefined) updateData.brand_values = dto.brand_values
    if (dto.social_links !== undefined) updateData.social_links = dto.social_links
    if (dto.design_settings !== undefined) updateData.design_settings = dto.design_settings
    if (dto.image_style_prompt !== undefined) updateData.image_style_prompt = dto.image_style_prompt
    if (dto.status !== undefined) updateData.status = dto.status

    return this.themesRepository.update(supabase, themeId, userId, updateData, orgId)
  }

  async deleteTheme(
    supabase: SupabaseClient,
    themeId: string,
    userId: string,
    orgId?: string | null,
  ): Promise<void> {
    const existing = await this.themesRepository.findById(supabase, themeId, userId, orgId)
    if (!existing) throw new NotFoundException(THEME_ERRORS.THEME_NOT_FOUND.userMessage)
    if (existing.is_system)
      throw new ForbiddenException(THEME_ERRORS.THEME_SYSTEM_IMMUTABLE.userMessage)
    if (existing.user_id !== userId)
      throw new ForbiddenException(THEME_ERRORS.THEME_NOT_FOUND.userMessage)
    await this.themesRepository.delete(supabase, themeId, userId, orgId)
  }

  async getThemeUsage(
    supabase: SupabaseClient,
    themeId: string,
    userId: string,
    orgId?: string | null,
  ): Promise<{ count: number }> {
    const theme = await this.themesRepository.findById(supabase, themeId, userId, orgId)
    if (!theme) throw new NotFoundException(THEME_ERRORS.THEME_NOT_FOUND.userMessage)
    const count = await this.themesRepository.countFunnelsUsingTheme(supabase, themeId, userId)
    return { count }
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  }
}
