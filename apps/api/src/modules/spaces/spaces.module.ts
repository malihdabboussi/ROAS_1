import { BullModule } from '@nestjs/bullmq'
import { forwardRef, Module } from '@nestjs/common'
import { AGENT_RUNTIME_AUTOMATION_QUEUE } from '../agent-runtime/agent-runtime-queues'
import { BillingModule } from '../billing/billing.module'
import { BrainModule } from '../brain/brain.module'
import { ChannelsModule } from '../channels/channels.module'
import { ComposioModule } from '../composio/composio.module'
import { EmailModule } from '../email/email.module'
import { CursorModule } from '../integrations/cursor/cursor.module'
import { ScrapeCreatorsModule } from '../integrations/scrapecreators/scrapecreators.module'
import { SearchApiModule } from '../integrations/searchapi/searchapi.module'
import { LinkPreviewModule } from '../link-preview/link-preview.module'
import { MachinesModule } from '../machines/machines.module'
import { MediaModule } from '../media/media.module'
import { MeetingsModule } from '../meetings/meetings.module'
import { ProgramsModule } from '../programs/programs.module'
import { ProviderBillingModule } from '../provider-billing/provider-billing.module'
import { SlackModule } from '../slack/slack.module'
import { SpaceRetrievalModule } from '../space-retrieval/space-retrieval.module'
import { UserAgentApiModule } from '../user-agent-api/user-agent-api.module'
import { VaultModule } from '../vault/vault.module'
import { AdsResearchSavedSearchesController } from './controllers/ads-research-saved-searches.controller'
import { AdsResearchController } from './controllers/ads-research.controller'
import { OrgAutomationFlowsController } from './controllers/org-automation-flows.controller'
import { SocialResearchAccountsController } from './controllers/social-research-accounts.controller'
import { SocialResearchFavoritesController } from './controllers/social-research-favorites.controller'
import { SocialResearchTopicSearchesController } from './controllers/social-research-topic-searches.controller'
import { SocialResearchController } from './controllers/social-research.controller'
import { SpaceAutomationCapabilitiesController } from './controllers/space-automation-capabilities.controller'
import { SpaceAutomationFlowUpdatesController } from './controllers/space-automation-flow-updates.controller'
import { SpaceAutomationLifecycleController } from './controllers/space-automation-lifecycle.controller'
import { SpaceAutomationReadController } from './controllers/space-automation-read.controller'
import { SpaceAutomationSchedulerInternalController } from './controllers/space-automation-scheduler-internal.controller'
import { SpaceAutomationTemplatesController } from './controllers/space-automation-templates.controller'
import { SpaceAutomationsInternalController } from './controllers/space-automations-internal.controller'
import { SpaceAutomationsController } from './controllers/space-automations.controller'
import { SpaceFlowBuildSessionsController } from './controllers/space-flow-build-sessions.controller'
import { SpaceFlowBuilderBlueprintsController } from './controllers/space-flow-builder-blueprints.controller'
import { SpaceFlowBuilderController } from './controllers/space-flow-builder.controller'
import { SpaceFlowPlansController } from './controllers/space-flow-plans.controller'
import { SpaceItemActionsController } from './controllers/space-item-actions.controller'
import { SpaceItemActivityController } from './controllers/space-item-activity.controller'
import { SpaceItemAgentActionsController } from './controllers/space-item-agent-actions.controller'
import { SpaceItemSharingInvitesController } from './controllers/space-item-sharing-invites.controller'
import { SpaceItemSharingController } from './controllers/space-item-sharing.controller'
import { SpaceItemsController } from './controllers/space-items.controller'
import { SpacePrecallPrepController } from './controllers/space-precall-prep.controller'
import { SpacePublicSharingController } from './controllers/space-public-sharing.controller'
import { SpaceSharingController } from './controllers/space-sharing.controller'
import { SpaceUndoController } from './controllers/space-undo.controller'
import { SpaceViewOverridesController } from './controllers/space-view-overrides.controller'
import { SpaceViewSharingController } from './controllers/space-view-sharing.controller'
import { SpaceWebhookReceiverController } from './controllers/space-webhook-receiver.controller'
import { SpaceWebhooksController } from './controllers/space-webhooks.controller'
import { SpacesSharedListController } from './controllers/spaces-shared-list.controller'
import { SpacesStateController } from './controllers/spaces-state.controller'
import { SpacesController } from './controllers/spaces.controller'
import { AdsResearchSearchRepository } from './repositories/ads-research-search.repository'
import { SlackOpenItemsRepository } from './repositories/slack-open-items.repository'
import { SlackPendingOffersRepository } from './repositories/slack-pending-offers.repository'
import { SlackTeamLoopRepository } from './repositories/slack-team-loop.repository'
import { SocialResearchFavoritesRepository } from './repositories/social-research-favorites.repository'
import { SocialResearchTopicSearchRepository } from './repositories/social-research-topic-search.repository'
import { SpaceAutomationActionsRepository } from './repositories/space-automation-actions.repository'
import { SpaceAutomationExternalEventsRepository } from './repositories/space-automation-external-events.repository'
import { SpaceAutomationReadRepository } from './repositories/space-automation-read.repository'
import { SpaceAutomationReconcilerRepository } from './repositories/space-automation-reconciler.repository'
import { SpaceAutomationRunsRepository } from './repositories/space-automation-runs.repository'
import { SpaceAutomationTemplatesRepository } from './repositories/space-automation-templates.repository'
import { SpaceAutomationsRepository } from './repositories/space-automations.repository'
import { SpaceFlowBuilderRepository } from './repositories/space-flow-builder.repository'
import { SpaceFlowDefinitionsRepository } from './repositories/space-flow-definitions.repository'
import { SpaceItemActivityRepository } from './repositories/space-item-activity.repository'
import { SpaceItemsRepository } from './repositories/space-items.repository'
import { SpaceNotificationsRepository } from './repositories/space-notifications.repository'
import { SpacePermissionsRepository } from './repositories/space-permissions.repository'
import { SpacePublicShareRepository } from './repositories/space-public-share.repository'
import { SpaceRecurrenceRepository } from './repositories/space-recurrence.repository'
import { SpaceShareManagementRepository } from './repositories/space-share-management.repository'
import { SpaceViewOverridesRepository } from './repositories/space-view-overrides.repository'
import { SpaceWebhooksRepository } from './repositories/space-webhooks.repository'
import { SpacesGeneralCampaignRepository } from './repositories/spaces-general-campaign.repository'
import { SpacesUndoRepository } from './repositories/spaces-undo.repository'
import { SpacesUserStateRepository } from './repositories/spaces-user-state.repository'
import { SpacesRepository } from './repositories/spaces.repository'
import { AdsResearchBreakdownService } from './services/ads-research-breakdown.service'
import { AdsResearchSearchService } from './services/ads-research-search.service'
import { MeetingFollowUpSlackConfirmService } from './services/meeting-follow-up-slack-confirm.service'
import { MeetingsPrecallDriveAgendaService } from './services/meetings-precall-drive-agenda.service'
import { MeetingsPrecallPrepService } from './services/meetings-precall-prep.service'
import { OrgAutomationFlowsService } from './services/org-automation-flows.service'
import { SlackContextStakesService } from './services/slack-context-stakes.service'
import { SlackOfferFulfillmentService } from './services/slack-offer-fulfillment.service'
import { SlackOpenItemsService } from './services/slack-open-items.service'
import { SlackPendingOfferAcceptanceService } from './services/slack-pending-offer-acceptance.service'
import { SlackPendingOffersService } from './services/slack-pending-offers.service'
import { SlackTeamLoopService } from './services/slack-team-loop.service'
import { SlackTeamMessageComposerService } from './services/slack-team-message-composer.service'
import { SlackTeamSignalDeliveryService } from './services/slack-team-signal-delivery.service'
import { SlackTeamSignalRoutingService } from './services/slack-team-signal-routing.service'
import { SocialResearchAccountSyncService } from './services/social-research-account-sync.service'
import { SocialResearchFavoritesService } from './services/social-research-favorites.service'
import { SocialResearchOrchestrationService } from './services/social-research-orchestration.service'
import { SocialResearchScrapeCreatorsService } from './services/social-research-scrapecreators.service'
import { SocialResearchTopicSearchSnapshotsService } from './services/social-research-topic-search-snapshots.service'
import { SocialResearchTopicSearchService } from './services/social-research-topic-search.service'
import { SocialResearchTranscriptFallbackService } from './services/social-research-transcript-fallback.service'
import { SocialResearchVideoBreakdownService } from './services/social-research-video-breakdown.service'
import { SpaceAutomationControllerPolicyService } from './services/space-automation-controller-policy.service'
import { SpaceAutomationInternalService } from './services/space-automation-internal.service'
import { SpaceAutomationLivenessService } from './services/space-automation-liveness.service'
import { SpaceAutomationReadService } from './services/space-automation-read.service'
import { SpaceAutomationReconcilerService } from './services/space-automation-reconciler.service'
import { SpaceAutomationRuntimeProcessor } from './services/space-automation-runtime.processor'
import { SpaceAutomationSchedulerService } from './services/space-automation-scheduler.service'
import { SpaceAutomationService } from './services/space-automation.service'
import { SpaceFlowBuilderAccessService } from './services/space-flow-builder-access.service'
import { SpaceFlowBuilderContextService } from './services/space-flow-builder-context.service'
import { SpaceFlowBuilderPlanService } from './services/space-flow-builder-plan.service'
import { SpaceFlowBuilderService } from './services/space-flow-builder.service'
import { SpaceFlowCapabilityService } from './services/space-flow-capability.service'
import { SpaceNotificationsService } from './services/space-notifications.service'
import { SpacePermissionsService } from './services/space-permissions.service'
import { SpacePublicShareResolverService } from './services/space-public-share-resolver.service'
import { SpaceRecurrenceService } from './services/space-recurrence.service'
import { SpaceShareManagementService } from './services/space-share-management.service'
import { SpaceWebhooksService } from './services/space-webhooks.service'
import { SpacesUndoService } from './services/spaces-undo.service'
import { SpacesService } from './services/spaces.service'

@Module({
  imports: [
    MeetingsModule,
    BillingModule,
    BrainModule,
    EmailModule,
    UserAgentApiModule,
    LinkPreviewModule,
    ComposioModule,
    SlackModule,
    ChannelsModule,
    MachinesModule,
    MediaModule,
    ProgramsModule,
    ProviderBillingModule,
    ScrapeCreatorsModule,
    SearchApiModule,
    SpaceRetrievalModule,
    VaultModule,
    BullModule.registerQueue({ name: AGENT_RUNTIME_AUTOMATION_QUEUE }),
    forwardRef(() => CursorModule),
  ],
  controllers: [
    OrgAutomationFlowsController,
    SpacesSharedListController,
    SpacesStateController,
    SpacesController,
    SpaceItemsController,
    SpaceItemActionsController,
    SpaceItemAgentActionsController,
    SpaceItemActivityController,
    SocialResearchFavoritesController,
    SocialResearchTopicSearchesController,
    SocialResearchAccountsController,
    SocialResearchController,
    AdsResearchSavedSearchesController,
    AdsResearchController,
    SpacePublicSharingController,
    SpaceSharingController,
    SpaceItemSharingController,
    SpaceItemSharingInvitesController,
    SpaceUndoController,
    SpaceViewSharingController,
    SpaceViewOverridesController,
    SpaceFlowBuilderController,
    SpaceFlowBuildSessionsController,
    SpaceFlowPlansController,
    SpaceFlowBuilderBlueprintsController,
    SpaceAutomationsController,
    SpaceAutomationFlowUpdatesController,
    SpaceAutomationCapabilitiesController,
    SpaceAutomationLifecycleController,
    SpaceAutomationTemplatesController,
    SpaceAutomationReadController,
    SpaceAutomationSchedulerInternalController,
    SpacePrecallPrepController,
    SpaceAutomationsInternalController,
    SpaceWebhooksController,
    SpaceWebhookReceiverController,
  ],
  providers: [
    SpacesService,
    SpacesRepository,
    SpaceItemsRepository,
    SlackTeamLoopRepository,
    SpaceItemActivityRepository,
    SpaceViewOverridesRepository,
    SpaceShareManagementRepository,
    SpacePublicShareRepository,
    SpacesUndoRepository,
    AdsResearchSearchRepository,
    SocialResearchFavoritesRepository,
    SocialResearchTopicSearchRepository,
    SpaceAutomationActionsRepository,
    SpaceAutomationExternalEventsRepository,
    SpaceAutomationReadRepository,
    SpaceAutomationReconcilerRepository,
    SpaceAutomationRunsRepository,
    SpaceAutomationsRepository,
    SpaceAutomationTemplatesRepository,
    SpaceFlowDefinitionsRepository,
    SpaceFlowBuilderRepository,
    SpaceNotificationsRepository,
    SpacePermissionsRepository,
    SpacesGeneralCampaignRepository,
    SpacesUserStateRepository,
    SpaceWebhooksRepository,
    SpacePermissionsService,
    SpacePublicShareResolverService,
    SpaceRecurrenceRepository,
    SpaceShareManagementService,
    SpaceRecurrenceService,
    SocialResearchScrapeCreatorsService,
    SocialResearchTopicSearchSnapshotsService,
    SocialResearchTranscriptFallbackService,
    SocialResearchAccountSyncService,
    SocialResearchOrchestrationService,
    SocialResearchTopicSearchService,
    SocialResearchFavoritesService,
    SocialResearchVideoBreakdownService,
    AdsResearchSearchService,
    AdsResearchBreakdownService,
    SpaceAutomationService,
    SlackTeamLoopService,
    SlackTeamSignalDeliveryService,
    SlackTeamMessageComposerService,
    SlackOpenItemsRepository,
    SlackOpenItemsService,
    SlackPendingOffersRepository,
    SlackPendingOffersService,
    SlackPendingOfferAcceptanceService,
    SlackContextStakesService,
    SlackOfferFulfillmentService,
    SlackTeamSignalRoutingService,
    MeetingsPrecallDriveAgendaService,
    MeetingsPrecallPrepService,
    MeetingFollowUpSlackConfirmService,
    SpaceAutomationInternalService,
    SpaceAutomationLivenessService,
    SpaceAutomationControllerPolicyService,
    SpaceAutomationReconcilerService,
    SpaceAutomationReadService,
    SpaceAutomationRuntimeProcessor,
    SpaceAutomationSchedulerService,
    SpaceFlowBuilderAccessService,
    SpaceFlowBuilderContextService,
    SpaceFlowBuilderPlanService,
    SpaceFlowBuilderService,
    SpaceFlowCapabilityService,
    OrgAutomationFlowsService,
    SpaceNotificationsService,
    SpacesUndoService,
    SpaceWebhooksService,
  ],
  exports: [
    SpacesService,
    SpacesRepository,
    SpacePermissionsService,
    SpacePublicShareResolverService,
    SpaceShareManagementService,
    SpaceAutomationsRepository,
    SpaceRecurrenceService,
    SpaceAutomationInternalService,
    SpaceAutomationReconcilerService,
    SpaceAutomationService,
    MeetingsPrecallPrepService,
    MeetingFollowUpSlackConfirmService,
    SpaceAutomationSchedulerService,
    SpaceFlowBuilderService,
    SpaceFlowCapabilityService,
  ],
})
export class SpacesModule {}
