import { Controller, Get, HttpException, HttpStatus, Param, Query, UseGuards } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { AuthGuard, CurrentUser, OrgContextGuard, OrgRoleGuard, Supabase } from '@vibey/api-shared'
import { MetaApiService } from '../services/meta-api.service'

@Controller('integrations/meta')
export class MetaPagesSearchController {
  constructor(private readonly api: MetaApiService) {}

  @Get('pages/:pageId/instagram-accounts')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async instagramAccountsForPage(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Param('pageId') pageId: string,
  ) {
    if (!pageId) {
      throw new HttpException(
        { success: false, error: 'pageId is required' },
        HttpStatus.BAD_REQUEST,
      )
    }
    const accounts = await this.api.getInstagramAccountsForPage(supabase, user.id, pageId)
    return { success: true, data: accounts }
  }

  @Get('pages/:pageId')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async page(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Param('pageId') pageId: string,
  ) {
    if (!pageId) {
      throw new HttpException(
        { success: false, error: 'pageId is required' },
        HttpStatus.BAD_REQUEST,
      )
    }
    const page = await this.api.getPageInfo(supabase, user.id, pageId)
    if (!page) {
      throw new HttpException({ success: false, error: 'Page not found' }, HttpStatus.NOT_FOUND)
    }
    return { success: true, data: page }
  }

  @Get('search-countries')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async searchCountries(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Query('q') q?: string,
  ) {
    const countries = await this.api.searchCountries(supabase, user.id, q ?? '')
    return { success: true, data: countries }
  }

  @Get('search-locations')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async searchLocations(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Query('q') q?: string,
  ) {
    const locations = await this.api.searchLocations(supabase, user.id, q ?? '')
    return { success: true, data: locations }
  }

  @Get('search-interests')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async searchInterests(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Query('q') q?: string,
  ) {
    const interests = await this.api.searchInterests(supabase, user.id, q ?? '')
    return { success: true, data: interests }
  }
}
