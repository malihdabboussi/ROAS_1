import { Body, Controller, Post, UseGuards } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import {
  AuthGuard,
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  ZodValidationPipe,
  type RequestScope,
} from '@vibey/api-shared'
import { CreditsGuard } from '../../../billing/guards/credits.guard'
import {
  BacklinksSummaryDto,
  BacklinksSummarySchema,
  CompetitorsDomainDto,
  CompetitorsDomainSchema,
  DataForSeoTaskDto,
  GoogleSerpDto,
  GoogleSerpSchema,
  KeywordIdeasDto,
  KeywordIdeasSchema,
  KeywordOverviewDto,
  KeywordOverviewSchema,
} from '../dto/dataforseo.dto'
import { DataForSeoUsageService } from '../services/dataforseo-usage.service'

@Controller('integrations/dataforseo')
@UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard, ThrottlerGuard)
export class DataForSeoController {
  constructor(private readonly usage: DataForSeoUsageService) {}

  @Post('keyword/overview')
  @UseGuards(CreditsGuard)
  async keywordOverview(
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(KeywordOverviewSchema)) body: KeywordOverviewDto,
    @OrgContext() scope: RequestScope,
  ) {
    return this.usage.run(user.id, 'keyword_overview', body, scope.orgId ?? undefined)
  }

  @Post('keyword/ideas')
  @UseGuards(CreditsGuard)
  async keywordIdeas(
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(KeywordIdeasSchema)) body: KeywordIdeasDto,
    @OrgContext() scope: RequestScope,
  ) {
    return this.usage.run(user.id, 'keyword_ideas', body, scope.orgId ?? undefined)
  }

  @Post('serp/google/organic')
  @UseGuards(CreditsGuard)
  async googleSerp(
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(GoogleSerpSchema)) body: GoogleSerpDto,
    @OrgContext() scope: RequestScope,
  ) {
    return this.usage.run(user.id, 'google_serp', body, scope.orgId ?? undefined)
  }

  @Post('competitors/domain')
  @UseGuards(CreditsGuard)
  async competitorsDomain(
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(CompetitorsDomainSchema)) body: CompetitorsDomainDto,
    @OrgContext() scope: RequestScope,
  ) {
    return this.usage.run(user.id, 'competitors_domain', body, scope.orgId ?? undefined)
  }

  @Post('backlinks/summary')
  @UseGuards(CreditsGuard)
  async backlinksSummary(
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(BacklinksSummarySchema)) body: BacklinksSummaryDto,
    @OrgContext() scope: RequestScope,
  ) {
    return this.usage.run(user.id, 'backlinks_summary', body, scope.orgId ?? undefined)
  }
}
