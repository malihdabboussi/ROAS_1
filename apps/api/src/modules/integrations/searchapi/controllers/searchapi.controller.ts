import { Body, Controller, Post, UseGuards } from '@nestjs/common'
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
import type { SearchApiAgentAction } from '../searchapi.constants'
import { SearchApiAgentService } from '../services/searchapi-agent.service'

@Controller('integrations/searchapi')
@UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard, ThrottlerGuard)
export class SearchApiController {
  constructor(private readonly agent: SearchApiAgentService) {}

  @Post('meta/page-search')
  @UseGuards(CreditsGuard)
  metaPageSearch(
    @CurrentUser() user: { id: string },
    @Body() body: Record<string, unknown>,
    @OrgContext() scope: RequestScope,
  ) {
    return this.run(user.id, 'meta_ads_page_search', body, scope.orgId)
  }

  @Post('meta/ads-search')
  @UseGuards(CreditsGuard)
  metaAdsSearch(
    @CurrentUser() user: { id: string },
    @Body() body: Record<string, unknown>,
    @OrgContext() scope: RequestScope,
  ) {
    return this.run(user.id, 'meta_ads_search', body, scope.orgId)
  }

  @Post('meta/ad-details')
  @UseGuards(CreditsGuard)
  metaAdDetails(
    @CurrentUser() user: { id: string },
    @Body() body: Record<string, unknown>,
    @OrgContext() scope: RequestScope,
  ) {
    return this.run(user.id, 'meta_ad_details', body, scope.orgId)
  }

  @Post('tiktok/advertiser-search')
  @UseGuards(CreditsGuard)
  tiktokAdvertiserSearch(
    @CurrentUser() user: { id: string },
    @Body() body: Record<string, unknown>,
    @OrgContext() scope: RequestScope,
  ) {
    return this.run(user.id, 'tiktok_advertiser_search', body, scope.orgId)
  }

  @Post('tiktok/ads-search')
  @UseGuards(CreditsGuard)
  tiktokAdsSearch(
    @CurrentUser() user: { id: string },
    @Body() body: Record<string, unknown>,
    @OrgContext() scope: RequestScope,
  ) {
    return this.run(user.id, 'tiktok_ads_search', body, scope.orgId)
  }

  @Post('tiktok/ad-details')
  @UseGuards(CreditsGuard)
  tiktokAdDetails(
    @CurrentUser() user: { id: string },
    @Body() body: Record<string, unknown>,
    @OrgContext() scope: RequestScope,
  ) {
    return this.run(user.id, 'tiktok_ad_details', body, scope.orgId)
  }

  @Post('google/advertiser-search')
  @UseGuards(CreditsGuard)
  googleAdvertiserSearch(
    @CurrentUser() user: { id: string },
    @Body() body: Record<string, unknown>,
    @OrgContext() scope: RequestScope,
  ) {
    return this.run(user.id, 'google_ads_advertiser_search', body, scope.orgId)
  }

  @Post('google/ads-search')
  @UseGuards(CreditsGuard)
  googleAdsSearch(
    @CurrentUser() user: { id: string },
    @Body() body: Record<string, unknown>,
    @OrgContext() scope: RequestScope,
  ) {
    return this.run(user.id, 'google_ads_search', body, scope.orgId)
  }

  @Post('google/ad-details')
  @UseGuards(CreditsGuard)
  googleAdDetails(
    @CurrentUser() user: { id: string },
    @Body() body: Record<string, unknown>,
    @OrgContext() scope: RequestScope,
  ) {
    return this.run(user.id, 'google_ad_details', body, scope.orgId)
  }

  private run(
    userId: string,
    action: SearchApiAgentAction,
    body: Record<string, unknown>,
    orgId?: string | null,
  ) {
    return this.agent.run(userId, action, body ?? {}, orgId ?? undefined)
  }
}
