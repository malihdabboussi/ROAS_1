// SharedModule — Global NestJS module providing auth, logging, and Supabase client
export { SharedModule } from './shared.module'
export { AppErrorsModule } from './app-errors.module'

// Guards
export { AuthGuard } from './guards/auth.guard'
export { RoleGuard, Roles, ROLES_KEY } from './guards/role.guard'
export type { UserRole } from './guards/role.guard'
export { OrgContextGuard } from './guards/org-context.guard'
export { OrgRoleGuard, RequireOrgRole, ORG_ROLE_KEY } from './guards/org-role.guard'
export { OrgThrottlerGuard } from './guards/org-throttler.guard'

// Decorators
export { CurrentUser } from './decorators/current-user.decorator'
export { Public, IS_PUBLIC_ROUTE } from './decorators/public-route.decorator'
export { Supabase } from './decorators/supabase.decorator'
export { OrgContext } from './decorators/org-context.decorator'

// Pipes
export { ZodValidationPipe } from './pipes/zod-validation.pipe'

// Filters
export { GlobalExceptionFilter } from './filters/global-exception.filter'

// Observability
export {
  extractSourceCodePointer,
  normalizeRequestTraceEvent,
  parseFirstStackFrame,
  resolveReleaseContext,
  sanitizeSourceCodePointer,
} from './observability/public'
export type {
  ReleaseContext,
  RequestTraceEventInput,
  SourceCodePointer,
  SourceCodePointerInput,
} from './observability/public'
export { RouteTraceReporter } from './observability/route-trace-reporter.service'
export { createRequestTraceMiddleware } from './observability/request-trace.middleware'
export type { RequestTraceMiddlewareOptions } from './observability/request-trace.middleware'

// Services
export { applyOwnerScope, OrgScopeService, resolveScopedOrgId } from './services/org-scope.service'
export type { OrgScopedQuery, RequestScope, OrgRole } from './services/org-scope.service'
export { LoggerService } from './services/logger.service'
export type { LogErrorParams } from './services/logger.service'
export { ErrorReporter } from './services/error-reporter.service'
export type { ReportErrorParams } from './services/error-reporter.service'
export { markAppErrorReported, reportAppError } from './utils/report-app-error'
export type { ReportedError } from './utils/report-app-error'
export {
  AuthError,
  AuthInputError,
  AuthUpstreamUnavailableError,
  InvalidTokenError,
} from './services/auth-errors'
export { PostgresDirectService } from './services/postgres-direct.service'
export { SupabaseJwtVerifierService } from './services/supabase-jwt-verifier.service'
export { SupabaseClientFactory } from './services/supabase-client.factory'
export { SupabaseServiceClient } from './services/supabase-service-client.provider'
export { UserSessionMintService } from './services/user-session-mint.service'
export { createResilientFetch } from './services/supabase-resilient-fetch'
export { safeFetchText } from './services/safe-fetch'
export type { SafeFetchOptions } from './services/safe-fetch'
export { deriveProjectSessionKey, verifyProjectSessionKey } from './services/project-session-key'
export { withRetry } from './services/with-retry'
export type { WithRetryOptions } from './services/with-retry'
export { isTransientNetworkError } from './services/transient-error.util'
export { retrySupabaseQuery } from './services/retry-supabase-query'
export type { RetrySupabaseQueryOptions } from './services/retry-supabase-query'
export {
  assessDocumentTextQuality,
  buildDocumentIntelligenceMetadata,
  isDocumentTextUsable,
} from './services/document-intelligence-policy'
export type {
  AssessDocumentTextQualityInput,
  DocumentExtractionStrategy,
  DocumentIntelligenceMetadata,
  DocumentIntelligenceStatus,
  DocumentTextQuality,
  DocumentTextQualityAssessment,
} from './services/document-intelligence-policy'
export {
  buildMachineProfileUpdate,
  hasSharedRailwayRuntime,
  resolveMachineProfileColumns,
  resolveMachineProfileRow,
  resolveRuntimeEnvironmentName,
} from './services/machine-profile-env'
export type {
  AgentRuntimeType,
  CanonicalMachineProfileRow,
  MachineProfileColumns,
  RuntimeEnvironment,
} from './services/machine-profile-env'
export {
  AGENT_RUNTIME_ARTIFACT_QUEUE,
  AGENT_RUNTIME_AUTOMATION_QUEUE,
  AGENT_RUNTIME_BRAIN_IMPORT_QUEUE,
  AGENT_RUNTIME_BRAIN_QUEUE,
  AGENT_RUNTIME_CHAT_QUEUE,
  AGENT_RUNTIME_MISSION_QUEUE,
  AGENT_RUNTIME_QUEUE_NAMES,
  AGENT_RUNTIME_REDIS_URL_ENV_KEYS,
  AGENT_RUNTIME_SUB_AGENT_QUEUE,
  resolveAgentRuntimeRedisPrefix,
  resolveAgentRuntimeRedisUrl,
} from './services/agent-runtime-queues'
export type {
  AgentRuntimeEnv,
  AgentRuntimeRedisEnvKey,
  AgentRuntimeWorkload,
} from './services/agent-runtime-queues'
export {
  buildSafeFallbackFunnelTsx,
  normalizeFunnelPageSource,
  programmaticTsxRepair,
  validateFunnelTsxContract,
  recoverFunnelTsx,
  prepareFunnelPageForWrite,
} from './services/funnel-tsx-contract'
export type {
  FunnelTsxValidationCode,
  FunnelTsxValidationResult,
  NormalizeFunnelPageSourceInput,
  NormalizeFunnelPageSourceResult,
  RecoverFunnelTsxInput,
  RecoverFunnelTsxResult,
  FunnelWriteContractInput,
  FunnelWriteContractResult,
  ProgrammaticTsxRepairInput,
  ProgrammaticTsxRepairResult,
} from './services/funnel-tsx-contract'
export { countPresentationSlides } from './services/presentation-slide-count'
export {
  isModelStrategy,
  resolveFallbackForStrategy,
  resolveModelForStrategy,
} from './services/model-strategy'
export {
  resolveGeminiApiKeys,
  shouldTryNextGeminiApiKey,
  GEMINI_API_KEY_FALLBACK_ENV_KEYS,
} from './services/gemini-api-keys'
export type { GeminiEnvReader } from './services/gemini-api-keys'
export type {
  ModelStrategy,
  ResolvedStrategyModel,
  StrategyModelReasoningEffort,
  StrategyModelSettings,
  TaskType,
} from './services/model-strategy'

export {
  UserAgentApiClient,
  UserMachineUnreachableError,
  UserMachineCircuitOpenError,
  defaultProbeReachable,
  USER_AGENT_API_DEFAULTS,
} from './services/user-agent-api-client'
export type {
  AgentApiTarget,
  AgentApiLogger,
  UserAgentApiClientDeps,
  UserAgentApiFetchOptions,
} from './services/user-agent-api-client'

// Billing health wrapper
export { trackBilledCost } from './services/track-billed-cost'
export type {
  BilledServiceType,
  TokenUsageData,
  CostData,
  TrackBilledCostOptions,
  BilledCostResult,
  CreditsBillingAdapter,
  HealthLogWriter,
} from './services/track-billed-cost'
export {
  coerceFiniteNumber,
  extractOpenRouterGenerationId,
  normalizeOpenRouterGenerationPayload,
  normalizeProviderBillingUsage,
  readHeaderValue,
  readOpenRouterGenerationId,
  readOpenRouterRequestId,
  validateOpenRouterSettledCost,
} from './services/provider-billing/openrouter-metadata'
export {
  fetchOpenRouterGeneration,
  isOpenRouterSettlementReady,
  isRetryableOpenRouterGenerationLookupError,
  isRetryableOpenRouterGenerationStatus,
  OpenRouterGenerationLookupError,
  OPENROUTER_GENERATION_LOOKUP_URL,
} from './services/provider-billing/openrouter-generation-client'
export type {
  OpenRouterGenerationSettlement,
  ProviderBillingAttemptInput,
  ProviderBillingAttemptRow,
  ProviderBillingAttemptStatus,
  ProviderBillingOwnerType,
  ProviderBillingServiceType,
  ProviderBillingUsage,
  ZeroCostValidationResult,
} from './services/provider-billing/provider-billing.types'

// Legacy integration routing (DB route_config + agent-api proxy)
export {
  buildLegacyIntegrationHttpRoute,
  getLegacyIntegrationRouteConfig,
  LEGACY_INTEGRATION_ROUTE_MAP,
  listLegacyIntegrationRouteRows,
} from './legacy-integration-routes'
export type {
  GhlProxyRouteTarget,
  IntegrationLegacyRouteConfig,
  LegacyHttpMethod,
} from './legacy-integration-routes'

// Modal Sandbox client (Spaces Projects runtime)
export {
  getModalApp,
  getModalSandboxClient,
  getModalImageBuilder,
} from './services/modal-sandbox-client'

// Mission admin / reliability (shared classification)
export {
  classifyMissionSubtaskFeedback,
  emptyMissionFeedbackCounts,
  MISSION_SUBTASK_FEEDBACK_BUCKET_KEYS,
} from './mission-subtask-feedback-bucket'
export type { MissionSubtaskFeedbackBucketKey } from './mission-subtask-feedback-bucket'

// Humans-as-teammates status types
export type {
  AssigneeType,
  SubtaskStatus,
  MissionStatus,
  TeamRosterEntry,
} from './types/mission-status'

// Canonical resource share level (admin | edit | view) — shared across spaces, channels, conversations, campaigns.
export {
  ResourceShareLevelSchema,
  RESOURCE_SHARE_LEVEL_WEIGHT,
  ORG_ROLE_RESOURCE_BASELINE,
  maxResourceShareLevel,
  meetsResourceShareLevel,
  baselineFromOrgRole,
} from './types/resource-share-level'
export type { ResourceShareLevel } from './types/resource-share-level'

// Normalized asset references for Vibey media, first-party storage, and provider-owned files.
export {
  buildExternalAssetRef,
  buildStorageAssetRef,
  buildVibeyAssetRef,
  inferAssetRefType,
} from './types/asset-ref'
export type {
  AssetRef,
  AssetRefType,
  ExternalAssetProvider,
  ExternalAssetRef,
  StorageAssetRef,
  VibeyAssetRef,
} from './types/asset-ref'

// Agent-facing tool error contract
export type {
  AgentToolCorrectionPlan,
  AgentToolErrorContract,
  AgentToolErrorEffectState,
  AgentToolErrorObservability,
  AgentToolErrorReliability,
  AgentToolFallbackPlan,
  AgentToolRetryPolicy,
  AgentToolRetryPolicyMode,
  AgentToolUserExplanation,
} from './types/agent-tool-error-contract'
export { normalizeAgentToolFailureFields } from './utils/agent-tool-error-normalizer'
export type { NormalizedAgentToolFailureFields } from './utils/agent-tool-error-normalizer'
export {
  looksLikeFathomSummaryMarkdown,
  repairBrokenMarkdownLinks,
  sanitizeFathomSummaryMarkdown,
  stripAtxHeaders,
  stripMarkdownEmphasis,
  unwrapFathomProseLinks,
} from './utils/sanitize-fathom-summary-markdown'

// Conversation sharing
export {
  ConversationIdParamSchema,
  ConversationShareEntityTypeSchema,
  ConversationShareIdParamSchema,
  ConversationShareLevelSchema,
  UpsertConversationShareSchema,
} from './types/conversation-sharing'
export type {
  ConversationIdParam,
  ConversationShareEntityType,
  ConversationShareIdParam,
  ConversationShareLevel,
  ConversationShareRecord,
  UpsertConversationShareDto,
} from './types/conversation-sharing'

// Customer signal loop — interaction envelope contract
export {
  CUSTOMER_INTERACTION_ROUTE_EVENT,
  INTERACTION_CHANNELS,
  INTERACTION_PARTICIPANT_ROLES,
  buildInteractionDedupeKey,
  parseInteractionEnvelope,
} from './types/customer-interaction'
export type {
  InteractionChannel,
  InteractionEnvelopeV1,
  InteractionIdentifier,
  InteractionParticipant,
  InteractionParticipantRole,
} from './types/customer-interaction'

// Chat scope contract
export {
  CHAT_SCOPE_KINDS,
  createChatScope,
  describeScope,
  normalizeChatScopeKind,
  normalizeScopeId,
  scopesEqual,
} from './types/chat-scope'
export type { ChatScope, ChatScopeKind } from './types/chat-scope'

// Forms builder and runtime contracts
export {
  CreateFormSchema,
  FormIdParamSchema,
  FormQuestionOptionSchema,
  FormQuestionSchema,
  FormQuestionTypeSchema,
  FormSchemaPayload,
  FormSettingsPayload,
  FormStatusSchema,
  FormVisibilitySchema,
  PublicFormTokenParamSchema,
  SubmitFormSchema,
  UpdateFormSchema,
} from './types/forms'
export type {
  CreateFormDto,
  FormIdParam,
  PublicFormTokenParam,
  SubmitFormDto,
  UpdateFormDto,
} from './types/forms'

// Flows capability catalog
export {
  FLOW_CAPABILITY_CATALOG,
  getFlowCapability,
  searchFlowCapabilities,
} from './types/flow-capabilities'
export type {
  FlowCapability,
  FlowCapabilityKind,
  FlowCapabilitySearchInput,
  FlowCapabilitySearchResult,
} from './types/flow-capabilities'

// Workflow capability graph contract derived from the current Flow catalog.
export {
  FLOW_WORKFLOW_CAPABILITIES,
  buildDefaultWorkflowUiSchema,
  getWorkflowCapability,
  searchWorkflowCapabilities,
  workflowCapabilityFromFlowCapability,
} from './types/workflow-capabilities'
export type {
  WorkflowCapability,
  WorkflowCapabilityApprovalPolicy,
  WorkflowCapabilityContractQuality,
  WorkflowCapabilityExecution,
  WorkflowCapabilityInputSchema,
  WorkflowCapabilityKind,
  WorkflowCapabilitySchemaSource,
  WorkflowCapabilitySearchInput,
  WorkflowCapabilitySearchResult,
  WorkflowCapabilitySideEffect,
  WorkflowCapabilityUiControl,
  WorkflowCapabilityUiField,
  WorkflowCapabilityUiSchema,
  WorkflowCapabilityUiSchemaSource,
} from './types/workflow-capabilities'

// Flows builder control-plane contracts
export {
  FLOW_BUILDER_TEMPLATE_TOKENS,
  createFlowBuildContextHash,
  isPlaceholderFlowDraftName,
  planHasExecutableSteps,
  resolveFlowDraftNameFromPlan,
  evaluateFlowBuild,
  resolveFlowBuildInspectorStage,
  resolveFlowBuildRequiredNextAction,
} from './types/flow-builder'
export type {
  FlowActionBlueprint,
  FlowActionBlueprintStatus,
  FlowBuildClarification,
  FlowBuildClarificationStatus,
  FlowBuildEvaluationInput,
  FlowBuildEvaluationRank,
  FlowBuildEvaluationSummary,
  FlowBuildInspectorStage,
  FlowBuildPlan,
  FlowBuildPlanStatus,
  FlowBuildPlanStep,
  FlowBuildRequiredNextAction,
  FlowBuildSessionSummary,
  FlowBuildSessionStatus,
  FlowBuildStepKind,
  FlowBuildStepSource,
  FlowBuildTraceEvent,
  FlowBuildTraceEventType,
  FlowBuilderCapabilityBucket,
  FlowBuilderContext,
  FlowBuilderExistingFlowRef,
  FlowBuilderFieldOptionRef,
  FlowBuilderFieldRef,
  FlowBuilderScopeKind,
  FlowBuilderTemplateToken,
  FlowBuilderViewRef,
  FlowClarificationQuestion,
  FlowClarificationTarget,
} from './types/flow-builder'

// Brain retrieval shared contract
export type {
  BrainAccessLevel,
  BrainAccessSource,
  BrainCandidateKind,
  BrainRetrievalCandidate,
  BrainRetrievalSearchInput,
  BrainRetrievalSearchResult,
  BrainSufficiencyResult,
  BrainSearchFamily,
} from './types/brain-retrieval'
export type {
  BrainTimeline,
  BrainTimelineItem,
  BrainTimelineItemType,
  BrainTimelineStatus,
  BrainTimelineTarget,
  BrainTimelineTargetType,
  BrainTimelineType,
  CreateBrainTimelineInput,
  UpsertBrainTimelineItemInput,
} from './types/brain-timeline'
export {
  BRAIN_RETRIEVAL_TIME_MODES,
  BRAIN_TEMPORAL_STATUSES,
  normalizeIsoDate,
  normalizeTemporalPayload,
  temporalCandidateMetadata,
  temporalInsertFields,
  temporalLabel,
} from './types/brain-temporal'
export type {
  BrainRetrievalTimeMode,
  BrainTemporalMetadata,
  BrainTemporalPayload,
  BrainTemporalStatus,
} from './types/brain-temporal'

// Ad creative canvas shared contracts
export { AD_STRATEGIES, AD_STRATEGY_BY_KEY, getAdStrategy } from './ad-strategies'
export type { AdFormatRecommendation, AdStrategyDefinition, AdStrategyKey } from './ad-strategies'
export {
  DEFAULT_IMAGE_MODEL_ID,
  IMAGE_MODELS,
  IMAGE_MODEL_BY_ID,
  assertImageModel,
  getImageModel,
  isValidImageModel,
} from './image-models'
export type { ImageModelDefinition, ImageModelProvider } from './image-models'
export { AD_CANVAS_AGENTS, AD_CANVAS_AGENT_SKILL_KEYS } from './ad-canvas-agents'
export type { AdCanvasAgentDefinition, AdCanvasAgentSkillKey } from './ad-canvas-agents'
