import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import {
  AuthGuard,
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  type RequestScope,
} from '@vibey/api-shared'
import { CreditsGuard } from '../../../billing/guards/credits.guard'
import {
  ScrapeCreatorsActionService,
  type ScrapeCreatorsRawQuery,
} from '../services/scrapecreators-action.service'

@Controller('integrations/scrapecreators')
@UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard, ThrottlerGuard)
export class ScrapeCreatorsAdLibraryController {
  constructor(private readonly actions: ScrapeCreatorsActionService) {}

  @Get('facebook/ad-library/search/companies')
  @UseGuards(CreditsGuard)
  async searchCompanies(
    @CurrentUser() user: { id: string },
    @Query() q: ScrapeCreatorsRawQuery,
    @OrgContext() scope: RequestScope,
  ) {
    return this.actions.runPicked(
      user.id,
      'facebook_ad_library_search_companies',
      '/v1/facebook/adLibrary/search/companies',
      q,
      ['query'],
      scope.orgId ?? undefined,
      { required: 'query' },
    )
  }

  @Get('facebook/ad-library/company/ads')
  @UseGuards(CreditsGuard)
  async companyAds(
    @CurrentUser() user: { id: string },
    @Query() q: ScrapeCreatorsRawQuery,
    @OrgContext() scope: RequestScope,
  ) {
    return this.actions.runPicked(
      user.id,
      'facebook_ad_library_company_ads',
      '/v1/facebook/adLibrary/company/ads',
      q,
      [
        'pageId',
        'companyName',
        'country',
        'status',
        'media_type',
        'language',
        'sort_by',
        'start_date',
        'end_date',
        'cursor',
        'trim',
      ],
      scope.orgId ?? undefined,
      {
        requiredAny: ['pageId', 'companyName'],
        requiredMessage: 'pageId or companyName is required',
      },
    )
  }

  @Get('facebook/ad-library/search/ads')
  @UseGuards(CreditsGuard)
  async searchAds(
    @CurrentUser() user: { id: string },
    @Query() q: ScrapeCreatorsRawQuery,
    @OrgContext() scope: RequestScope,
  ) {
    return this.actions.runPicked(
      user.id,
      'facebook_ad_library_search_ads',
      '/v1/facebook/adLibrary/search/ads',
      q,
      [
        'query',
        'sort_by',
        'search_type',
        'ad_type',
        'country',
        'status',
        'media_type',
        'start_date',
        'end_date',
        'cursor',
        'trim',
      ],
      scope.orgId ?? undefined,
      { required: 'query' },
    )
  }

  @Get('facebook/ad-library/ad')
  @UseGuards(CreditsGuard)
  async adDetails(
    @CurrentUser() user: { id: string },
    @Query() q: ScrapeCreatorsRawQuery,
    @OrgContext() scope: RequestScope,
  ) {
    return this.actions.runPicked(
      user.id,
      'facebook_ad_library_ad',
      '/v1/facebook/adLibrary/ad',
      q,
      ['id', 'url', 'trim'],
      scope.orgId ?? undefined,
      {
        requiredAny: ['id', 'url'],
        requiredMessage: 'id or url is required',
      },
    )
  }

  @Get('facebook/ad-library/ad/transcript')
  @UseGuards(CreditsGuard)
  async adTranscript(
    @CurrentUser() user: { id: string },
    @Query() q: ScrapeCreatorsRawQuery,
    @OrgContext() scope: RequestScope,
  ) {
    return this.actions.runPicked(
      user.id,
      'facebook_ad_library_ad_transcript',
      '/v1/facebook/adLibrary/ad/transcript',
      q,
      ['id', 'url'],
      scope.orgId ?? undefined,
      {
        requiredAny: ['id', 'url'],
        requiredMessage: 'id or url is required',
      },
    )
  }
}
