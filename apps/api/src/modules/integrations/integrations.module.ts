import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ComposioModule } from '../composio/composio.module'
import { SpacesModule } from '../spaces/spaces.module'
import { ActiveCampaignModule } from './activecampaign/activecampaign.module'
import { AnthropicClaudeModule } from './anthropic-claude/anthropic-claude.module'
import { CalendlyModule } from './calendly/calendly.module'
import { IntegrationsCalendarController } from './controllers/integrations-calendar.controller'
import { IntegrationsCampaignController } from './controllers/integrations-campaign.controller'
import { IntegrationsComposioBridgeController } from './controllers/integrations-composio-bridge.controller'
import { IntegrationsComposioController } from './controllers/integrations-composio.controller'
import { IntegrationsSocialController } from './controllers/integrations-social.controller'
import { IntegrationsController } from './controllers/integrations.controller'
import { CursorModule } from './cursor/cursor.module'
import { DataForSeoModule } from './dataforseo/dataforseo.module'
import { DropboxModule } from './dropbox/dropbox.module'
import { FanbasisModule } from './fanbasis/fanbasis.module'
import { FathomModule } from './fathom/fathom.module'
import { FirefliesModule } from './fireflies/fireflies.module'
import { GitHubModule } from './github/github.module'
import { GoHighLevelModule } from './gohighlevel/gohighlevel.module'
import { GoogleDriveModule } from './google-drive/google-drive.module'
import { GoogleWorkspaceModule } from './google-workspace/google-workspace.module'
import { HiggsfieldModule } from './higgsfield/higgsfield.module'
import { MetaModule } from './meta/meta.module'
import { OpenAICodexModule } from './openai-codex/openai-codex.module'
import { PageGraderModule } from './page-grader/page-grader.module'
import { PaypalModule } from './paypal/paypal.module'
import { IntegrationsRepository } from './repositories/integrations.repository'
import { ScrapeCreatorsModule } from './scrapecreators/scrapecreators.module'
import { SearchApiModule } from './searchapi/searchapi.module'
import { IntegrationsCalendarTeamService } from './services/integrations-calendar-team.service'
import { IntegrationsCalendarService } from './services/integrations-calendar.service'
import { IntegrationsComposioCampaignService } from './services/integrations-composio-campaign.service'
import { IntegrationsComposioHealthService } from './services/integrations-composio-health.service'
import { IntegrationsComposioWebhookService } from './services/integrations-composio-webhook.service'
import { IntegrationsComposioService } from './services/integrations-composio.service'
import { IntegrationsCoreService } from './services/integrations-core.service'
import { IntegrationsFacebookService } from './services/integrations-facebook.service'
import { IntegrationsLinkedInService } from './services/integrations-linkedin.service'
import { IntegrationsOrgAccountsService } from './services/integrations-org-accounts.service'
import { IntegrationsOverviewService } from './services/integrations-overview.service'
import { IntegrationsStatusService } from './services/integrations-status.service'
import { IntegrationsYoutubeService } from './services/integrations-youtube.service'
import { StripeModule } from './stripe/stripe.module'
import { SupabaseIntegrationModule } from './supabase/supabase-integration.module'
import { WordpressModule } from './wordpress/wordpress.module'

@Module({
  imports: [
    ConfigModule,
    ComposioModule,
    SpacesModule,
    CursorModule,
    ActiveCampaignModule,
    GoHighLevelModule,
    GitHubModule,
    MetaModule,
    AnthropicClaudeModule,
    OpenAICodexModule,
    StripeModule,
    PaypalModule,
    CalendlyModule,
    GoogleDriveModule,
    GoogleWorkspaceModule,
    HiggsfieldModule,
    DropboxModule,
    FathomModule,
    FanbasisModule,
    FirefliesModule,
    PageGraderModule,
    ScrapeCreatorsModule,
    SearchApiModule,
    DataForSeoModule,
    SupabaseIntegrationModule,
    WordpressModule,
  ],
  controllers: [
    IntegrationsController,
    IntegrationsComposioController,
    IntegrationsComposioBridgeController,
    IntegrationsCampaignController,
    IntegrationsCalendarController,
    IntegrationsSocialController,
  ],
  providers: [
    IntegrationsRepository,
    IntegrationsCoreService,
    IntegrationsOrgAccountsService,
    IntegrationsOverviewService,
    IntegrationsStatusService,
    IntegrationsComposioCampaignService,
    IntegrationsComposioHealthService,
    IntegrationsComposioWebhookService,
    IntegrationsComposioService,
    IntegrationsCalendarService,
    IntegrationsCalendarTeamService,
    IntegrationsLinkedInService,
    IntegrationsFacebookService,
    IntegrationsYoutubeService,
  ],
})
export class IntegrationsModule {}
