import { Body, Controller, Get, HttpException, HttpStatus, Param, Post, UseGuards } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { AuthGuard, CurrentUser, OrgContextGuard, OrgRoleGuard, Supabase } from '@vibey/api-shared'
import {
  CreateMetaCustomAudienceSchema,
  CreateMetaCustomConversionSchema,
  CreateMetaLookalikeSchema,
} from '../dto/meta.dto'
import { MetaApiService } from '../services/meta-api.service'

@Controller('integrations/meta')
export class MetaAudiencesController {
  constructor(private readonly api: MetaApiService) {}

  @Get('ad-accounts/:adAccountId/customaudiences')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async customAudiences(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Param('adAccountId') adAccountId: string,
  ) {
    if (!adAccountId) {
      throw new HttpException(
        { success: false, error: 'adAccountId is required' },
        HttpStatus.BAD_REQUEST,
      )
    }
    const data = await this.api.getCustomAudiences(supabase, user.id, adAccountId)
    return { success: true, data }
  }

  @Post('ad-accounts/:adAccountId/customaudiences')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async createCustomAudience(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Param('adAccountId') adAccountId: string,
    @Body() body: unknown,
  ) {
    if (!adAccountId) {
      throw new HttpException(
        { success: false, error: 'adAccountId is required' },
        HttpStatus.BAD_REQUEST,
      )
    }
    const validation = CreateMetaCustomAudienceSchema.safeParse(body)
    if (!validation.success) {
      throw new HttpException(
        { success: false, error: 'Invalid request', details: validation.error.flatten() },
        HttpStatus.BAD_REQUEST,
      )
    }
    const data = await this.api.createCustomAudience(
      supabase,
      user.id,
      adAccountId,
      validation.data,
    )
    return { success: true, data }
  }

  @Post('ad-accounts/:adAccountId/customaudiences/lookalike')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async createLookalikeAudience(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Param('adAccountId') adAccountId: string,
    @Body() body: unknown,
  ) {
    if (!adAccountId) {
      throw new HttpException(
        { success: false, error: 'adAccountId is required' },
        HttpStatus.BAD_REQUEST,
      )
    }
    const validation = CreateMetaLookalikeSchema.safeParse(body)
    if (!validation.success) {
      throw new HttpException(
        { success: false, error: 'Invalid request', details: validation.error.flatten() },
        HttpStatus.BAD_REQUEST,
      )
    }
    const data = await this.api.createLookalikeAudience(
      supabase,
      user.id,
      adAccountId,
      validation.data,
    )
    return { success: true, data }
  }

  @Get('ad-accounts/:adAccountId/customconversions')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async customConversions(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Param('adAccountId') adAccountId: string,
  ) {
    if (!adAccountId) {
      throw new HttpException(
        { success: false, error: 'adAccountId is required' },
        HttpStatus.BAD_REQUEST,
      )
    }
    const data = await this.api.getCustomConversions(supabase, user.id, adAccountId)
    return { success: true, data }
  }

  @Post('ad-accounts/:adAccountId/customconversions')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async createCustomConversion(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Param('adAccountId') adAccountId: string,
    @Body() body: unknown,
  ) {
    if (!adAccountId) {
      throw new HttpException(
        { success: false, error: 'adAccountId is required' },
        HttpStatus.BAD_REQUEST,
      )
    }
    const validation = CreateMetaCustomConversionSchema.safeParse(body)
    if (!validation.success) {
      throw new HttpException(
        { success: false, error: 'Invalid request', details: validation.error.flatten() },
        HttpStatus.BAD_REQUEST,
      )
    }
    const data = await this.api.createCustomConversion(
      supabase,
      user.id,
      adAccountId,
      validation.data,
    )
    return { success: true, data }
  }
}
