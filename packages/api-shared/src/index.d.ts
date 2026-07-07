export { SharedModule } from './shared.module'
export { AppErrorsModule } from './app-errors.module'
export { AuthGuard } from './guards/auth.guard'
export { RoleGuard, Roles, ROLES_KEY } from './guards/role.guard'
export type { UserRole } from './guards/role.guard'
export { CurrentUser } from './decorators/current-user.decorator'
export { Supabase } from './decorators/supabase.decorator'
export { ZodValidationPipe } from './pipes/zod-validation.pipe'
export { GlobalExceptionFilter } from './filters/global-exception.filter'
export { LoggerService } from './services/logger.service'
export type { LogErrorParams } from './services/logger.service'
export {
  AuthError,
  AuthInputError,
  AuthUpstreamUnavailableError,
  InvalidTokenError,
} from './services/auth-errors'
export { PostgresDirectService } from './services/postgres-direct.service'
export { SupabaseJwtVerifierService } from './services/supabase-jwt-verifier.service'
export { SupabaseClientFactory } from './services/supabase-client.factory'
export { safeFetchText } from './services/safe-fetch'
export type { SafeFetchOptions } from './services/safe-fetch'
export { isTransientNetworkError } from './services/transient-error.util'
export {
  buildSafeFallbackFunnelTsx,
  normalizeFunnelPageSource,
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
} from './services/funnel-tsx-contract'
export {
  CHAT_SCOPE_KINDS,
  createChatScope,
  describeScope,
  normalizeChatScopeKind,
  normalizeScopeId,
  scopesEqual,
} from './types/chat-scope'
export type { ChatScope, ChatScopeKind } from './types/chat-scope'
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
