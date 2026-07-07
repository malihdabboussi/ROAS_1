/**
 * Themes Controller
 * Layer 1: HTTP endpoints for theme CRUD
 * Ported from: Vibey_legacy/apps/app-backend/src/modules/themes/controllers/themes.controller.ts
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Put,
  UseGuards,
  UsePipes,
} from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  AuthGuard,
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  Supabase,
  ZodValidationPipe,
  type RequestScope,
} from '@vibey/api-shared'
import { CreditsGuard } from '../../billing/guards/credits.guard'
import { THEME_ERRORS } from '../config/theme-errors.config'
import {
  CreateThemeSchema,
  GenerateImageStyleSchema,
  UpdateThemeSchema,
  type GenerateImageStyleInput,
} from '../dto/theme.dto'
import { ThemeImageStyleService } from '../services/theme-image-style.service'
import { ThemesService } from '../services/themes.service'

@Controller('themes')
@UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard, ThrottlerGuard)
export class ThemesController {
  constructor(
    private readonly themesService: ThemesService,
    private readonly imageStyleService: ThemeImageStyleService,
  ) {}

  @Get()
  async list(
    @CurrentUser() user: { id: string; email: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
  ) {
    const themes = await this.themesService.listThemes(supabase, user.id, scope.orgId)
    return { themes }
  }

  @Post('generate-image-style')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CreditsGuard)
  @UsePipes(new ZodValidationPipe(GenerateImageStyleSchema))
  async generateImageStyle(
    @CurrentUser() user: { id: string; email: string },
    @Body() dto: GenerateImageStyleInput,
    @OrgContext() scope: RequestScope,
  ) {
    return this.imageStyleService.generate(dto, {
      userId: user.id,
      orgId: scope.orgId ?? null,
    })
  }

  @Get(':themeId')
  async getById(
    @CurrentUser() user: { id: string; email: string },
    @Supabase() supabase: SupabaseClient,
    @Param('themeId') themeId: string,
    @OrgContext() scope: RequestScope,
  ) {
    const theme = await this.themesService.getTheme(supabase, themeId, user.id, scope.orgId)
    return { theme }
  }

  @Get(':themeId/usage')
  async getUsage(
    @CurrentUser() user: { id: string; email: string },
    @Supabase() supabase: SupabaseClient,
    @Param('themeId') themeId: string,
    @OrgContext() scope: RequestScope,
  ) {
    const usage = await this.themesService.getThemeUsage(supabase, themeId, user.id, scope.orgId)
    return { count: usage.count }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: { id: string; email: string },
    @Supabase() supabase: SupabaseClient,
    @Body() rawBody: unknown,
    @OrgContext() scope: RequestScope,
  ) {
    const result = CreateThemeSchema.safeParse(rawBody)
    if (!result.success) {
      throw new HttpException(
        { error: 'Validation failed', details: result.error.issues },
        HttpStatus.BAD_REQUEST,
      )
    }
    const theme = await this.themesService.createTheme(supabase, user.id, result.data, scope.orgId)
    return { theme }
  }

  @Put(':themeId')
  async update(
    @CurrentUser() user: { id: string; email: string },
    @Supabase() supabase: SupabaseClient,
    @Param('themeId') themeId: string,
    @Body() rawBody: unknown,
    @OrgContext() scope: RequestScope,
  ) {
    const result = UpdateThemeSchema.safeParse(rawBody)
    if (!result.success) {
      throw new HttpException(
        { error: 'Validation failed', details: result.error.issues },
        HttpStatus.BAD_REQUEST,
      )
    }
    const theme = await this.themesService.updateTheme(
      supabase,
      themeId,
      user.id,
      result.data,
      scope.orgId,
    )
    return { theme }
  }

  @Delete(':themeId')
  async delete(
    @CurrentUser() user: { id: string; email: string },
    @Supabase() supabase: SupabaseClient,
    @Param('themeId') themeId: string,
    @OrgContext() scope: RequestScope,
  ) {
    await this.themesService.deleteTheme(supabase, themeId, user.id, scope.orgId)
    return { success: true }
  }
}
