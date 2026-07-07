import { Global, Module } from '@nestjs/common'
import { GlobalExceptionFilter } from './filters/global-exception.filter'
import { AuthGuard } from './guards/auth.guard'
import { OrgContextGuard } from './guards/org-context.guard'
import { OrgRoleGuard } from './guards/org-role.guard'
import { RouteTraceReporter } from './observability/route-trace-reporter.service'
import { ErrorReporter } from './services/error-reporter.service'
import { LoggerService } from './services/logger.service'
import { OrgScopeService } from './services/org-scope.service'
import { PostgresDirectService } from './services/postgres-direct.service'
import { SupabaseClientFactory } from './services/supabase-client.factory'
import { SupabaseJwtVerifierService } from './services/supabase-jwt-verifier.service'
import { SupabaseServiceClient } from './services/supabase-service-client.provider'
import { UserSessionMintService } from './services/user-session-mint.service'

@Global()
@Module({
  providers: [
    AuthGuard,
    OrgContextGuard,
    OrgRoleGuard,
    OrgScopeService,
    SupabaseJwtVerifierService,
    LoggerService,
    RouteTraceReporter,
    ErrorReporter,
    GlobalExceptionFilter,
    SupabaseClientFactory,
    SupabaseServiceClient,
    UserSessionMintService,
    PostgresDirectService,
  ],
  exports: [
    AuthGuard,
    OrgContextGuard,
    OrgRoleGuard,
    OrgScopeService,
    SupabaseJwtVerifierService,
    LoggerService,
    RouteTraceReporter,
    ErrorReporter,
    GlobalExceptionFilter,
    SupabaseClientFactory,
    SupabaseServiceClient,
    UserSessionMintService,
    PostgresDirectService,
  ],
})
export class SharedModule {}
