import { Body, Controller, Get, HttpException, HttpStatus, Param, Post, UseGuards } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { AuthGuard, CurrentUser, OrgContextGuard, OrgRoleGuard, Supabase } from '@vibey/api-shared'
import { CreateMetaPixelSchema } from '../dto/meta.dto'
import { MetaApiService } from '../services/meta-api.service'

@Controller('integrations/meta')
export class MetaAdAssetsController {
  constructor(private readonly api: MetaApiService) {}

  @Get('ad-accounts')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async adAccounts(@Supabase() supabase: SupabaseClient, @CurrentUser() user: { id: string }) {
    const accounts = await this.api.getAdAccounts(supabase, user.id)
    return { success: true, data: accounts }
  }

  @Get('pages')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async pages(@Supabase() supabase: SupabaseClient, @CurrentUser() user: { id: string }) {
    const pages = await this.api.getPages(supabase, user.id)
    return { success: true, data: pages }
  }

  @Get('ad-accounts/:adAccountId/pixels')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async pixels(
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
    const pixels = await this.api.getPixels(supabase, user.id, adAccountId)
    return { success: true, data: pixels }
  }

  @Get('ad-accounts/:adAccountId/adimages')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async adImages(
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
    const images = await this.api.getAdImages(supabase, user.id, adAccountId)
    return { success: true, data: images }
  }

  @Post('ad-accounts/:adAccountId/pixels')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async createPixel(
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
    const validation = CreateMetaPixelSchema.safeParse(body)
    if (!validation.success) {
      throw new HttpException(
        { success: false, error: 'Invalid request', details: validation.error.flatten() },
        HttpStatus.BAD_REQUEST,
      )
    }
    const pixel = await this.api.createPixel(supabase, user.id, adAccountId, validation.data)
    return { success: true, data: pixel }
  }
}
