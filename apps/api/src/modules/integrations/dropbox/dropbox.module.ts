import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { IntegrationConnectionsRepository } from '../repositories/integration-connections.repository'
import { DropboxController } from './controllers/dropbox.controller'
import { DropboxIntegration } from './integrations/dropbox.integration'
import { DropboxApiService } from './services/dropbox-api.service'
import { DropboxOAuthService } from './services/dropbox-oauth.service'

@Module({
  imports: [ConfigModule],
  controllers: [DropboxController],
  providers: [
    DropboxIntegration,
    IntegrationConnectionsRepository,
    DropboxOAuthService,
    DropboxApiService,
  ],
  exports: [DropboxIntegration, DropboxOAuthService, DropboxApiService],
})
export class DropboxModule {}
