import { join } from 'path'
import { BullModule } from '@nestjs/bullmq'
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'
import { ThrottlerModule } from '@nestjs/throttler'
import { SharedModule } from '@vibey/api-shared'
import { shouldEnableInProcessScheduling } from './cron-runtime-policy'
import { CronService } from './cron.service'
import { HealthController } from './health.controller'
import { AdminModule } from './modules/admin/admin.module'
import { AgentFeedbackModule } from './modules/agent-feedback/agent-feedback.module'
import {
  getAgentRuntimeRedisConnection,
  getAgentRuntimeRedisPrefix,
} from './modules/agent-runtime/agent-runtime-queues'
import { AgentTeamsModule } from './modules/agent-teams/agent-teams.module'
import { AgentsModule } from './modules/agents/agents.module'
import { ArtifactsModule } from './modules/artifacts/artifacts.module'
import { AuthModule } from './modules/auth/auth.module'
import { BillingCreditAlertsModule } from './modules/billing/billing-credit-alerts.module'
import { BillingModule } from './modules/billing/billing.module'
import { BrainModule } from './modules/brain/brain.module'
import { BrowserSessionsModule } from './modules/browser-sessions/browser-sessions.module'
import { CampaignsModule } from './modules/campaigns/campaigns.module'
import { CanvasModule } from './modules/canvas/canvas.module'
import { ChannelsModule } from './modules/channels/channels.module'
import { ClientErrorsModule } from './modules/client-errors/client-errors.module'
import { ComposioModule } from './modules/composio/composio.module'
import { ConversationsModule } from './modules/conversations/conversations.module'
import { CustomFieldsModule } from './modules/custom-fields/custom-fields.module'
import { DmModule } from './modules/dm/dm.module'
import { DomainsModule } from './modules/domains/domains.module'
import { EmailCampaignsModule } from './modules/email-campaigns/email-campaigns.module'
import { EmailModule } from './modules/email/email.module'
import { EnterpriseApplicationsModule } from './modules/enterprise-applications/enterprise-applications.module'
import { EntitySearchModule } from './modules/entity-search/entity-search.module'
import { FeatureUpdatesModule } from './modules/feature-updates/feature-updates.module'
import { FormsModule } from './modules/forms/forms.module'
import { FunnelsModule } from './modules/funnels/funnels.module'
import { HomeModule } from './modules/home/home.module'
import { IntegrationsModule } from './modules/integrations/integrations.module'
import { InternalModule } from './modules/internal/internal.module'
import { LeadsModule } from './modules/leads/leads.module'
import { LinkPreviewModule } from './modules/link-preview/link-preview.module'
import { MachinesModule } from './modules/machines/machines.module'
import { McpModule } from './modules/mcp/mcp.module'
import { MediaModule } from './modules/media/media.module'
import { MissionsModule } from './modules/missions/missions.module'
import { ModelsModule } from './modules/models/models.module'
import { OnboardingModule } from './modules/onboarding/onboarding.module'
import { OrgModule } from './modules/org/org.module'
import { ProgramsModule } from './modules/programs/programs.module'
import { ProjectsModule } from './modules/projects/projects.module'
import { ProviderBillingModule } from './modules/provider-billing/provider-billing.module'
import { SandboxesModule } from './modules/sandboxes/sandboxes.module'
import { SegmentsModule } from './modules/segments/segments.module'
import { SidebarModule } from './modules/sidebar/sidebar.module'
import { SkillRecommendationsModule } from './modules/skill-recommendations/skill-recommendations.module'
import { SlackModule } from './modules/slack/slack.module'
import { SpaceTemplatesModule } from './modules/space-templates/space-templates.module'
import { SpacesModule } from './modules/spaces/spaces.module'
import { TeamRosterModule } from './modules/team-roster/team-roster.module'
import { TelegramModule } from './modules/telegram/telegram.module'
import { ThemesModule } from './modules/themes/themes.module'
import { TranscribeModule } from './modules/transcribe/transcribe.module'
import { TransferModule } from './modules/transfer/transfer.module'
import { UsersModule } from './modules/users/users.module'
import { VaultModule } from './modules/vault/vault.module'
import { WaitlistModule } from './modules/waitlist/waitlist.module'
import { YourTurnModule } from './modules/your-turn/your-turn.module'

@Module({
  controllers: [HealthController],
  providers: [CronService],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        join(process.cwd(), '.env'),
        join(process.cwd(), '..', 'mission-worker', '.env'),
      ],
    }),
    ...(shouldEnableInProcessScheduling() ? [ScheduleModule.forRoot()] : []),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: getAgentRuntimeRedisConnection(configService),
        defaultJobOptions: {
          removeOnComplete: { age: 24 * 3600 },
          removeOnFail: { age: 7 * 24 * 3600 },
          attempts: 1,
        },
        prefix: getAgentRuntimeRedisPrefix(configService),
      }),
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 300,
      },
    ]),
    SharedModule,
    ClientErrorsModule,
    AdminModule,
    AgentsModule,
    AgentFeedbackModule,
    AgentTeamsModule,
    ArtifactsModule,
    AuthModule,
    BillingModule,
    BillingCreditAlertsModule,
    ConversationsModule,
    ChannelsModule,
    CanvasModule,
    CampaignsModule,
    ComposioModule,
    BrainModule,
    BrowserSessionsModule,
    LeadsModule,
    MachinesModule,
    McpModule,
    ModelsModule,
    OnboardingModule,
    ProjectsModule,
    ProgramsModule,
    ProviderBillingModule,
    SandboxesModule,
    SidebarModule,
    FormsModule,
    FunnelsModule,
    IntegrationsModule,
    InternalModule,
    LinkPreviewModule,
    MediaModule,
    MissionsModule,
    SpacesModule,
    SpaceTemplatesModule,
    TeamRosterModule,
    YourTurnModule,
    OrgModule,
    DomainsModule,
    DmModule,
    HomeModule,
    EmailCampaignsModule,
    EmailModule,
    EnterpriseApplicationsModule,
    EntitySearchModule,
    FeatureUpdatesModule,
    ThemesModule,
    TransferModule,
    CustomFieldsModule,
    SegmentsModule,
    SlackModule,
    SkillRecommendationsModule,
    TelegramModule,
    TranscribeModule,
    UsersModule,
    VaultModule,
    WaitlistModule,
  ],
})
export class AppModule {}
