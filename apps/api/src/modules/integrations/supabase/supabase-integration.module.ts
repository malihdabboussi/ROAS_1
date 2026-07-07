import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { IntegrationConnectionsRepository } from '../repositories/integration-connections.repository'
import { SupabaseAuthController } from './controllers/supabase-auth.controller'
import { SupabaseDatabaseQueryController } from './controllers/supabase-database-query.controller'
import { SupabaseDatabaseRowsController } from './controllers/supabase-database-rows.controller'
import { SupabaseProjectsController } from './controllers/supabase-projects.controller'
import { SupabaseController } from './controllers/supabase.controller'
import { SupabaseProjectLinksRepository } from './repositories/supabase-project-links.repository'
import { SupabaseManagementService } from './services/supabase-management.service'
import { SupabaseOAuthService } from './services/supabase-oauth.service'
import { SupabaseProjectLinksService } from './services/supabase-project-links.service'

@Module({
  imports: [ConfigModule],
  controllers: [
    SupabaseController,
    SupabaseProjectsController,
    SupabaseAuthController,
    SupabaseDatabaseQueryController,
    SupabaseDatabaseRowsController,
  ],
  providers: [
    IntegrationConnectionsRepository,
    SupabaseProjectLinksRepository,
    SupabaseOAuthService,
    SupabaseManagementService,
    SupabaseProjectLinksService,
  ],
  exports: [SupabaseOAuthService, SupabaseManagementService, SupabaseProjectLinksService],
})
export class SupabaseIntegrationModule {}
