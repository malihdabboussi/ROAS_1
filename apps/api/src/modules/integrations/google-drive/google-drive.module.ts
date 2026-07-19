import { Module } from '@nestjs/common'
import { ComposioModule } from '../../composio/composio.module'
import { GoogleDriveDocumentExportController } from './controllers/google-drive-document-export.controller'
import { GoogleDriveFilesController } from './controllers/google-drive-files.controller'
import { GoogleDriveController } from './controllers/google-drive.controller'
import { DriveFolderMappingsRepository } from './repositories/drive-folder-mappings.repository'
import { GoogleDriveAdminClientRepository } from './repositories/google-drive-admin-client.repository'
import { GoogleDriveRepository } from './repositories/google-drive.repository'
import { GoogleDriveApiService } from './services/google-drive-api.service'
import { GoogleDriveComposioFilesService } from './services/google-drive-composio-files.service'
import { GoogleDriveComposioMultiTabDocsService } from './services/google-drive-composio-multi-tab-docs.service'
import { GoogleDriveComposioPayloadService } from './services/google-drive-composio-payload.service'
import { GoogleDriveConnectionService } from './services/google-drive-connection.service'
import { GoogleDriveContentCacheService } from './services/google-drive-content-cache.service'
import { DriveFolderMappingsController } from './sync/drive-folder-mappings.controller'
import { DrivePushInternalController } from './sync/drive-push-internal.controller'
import { DrivePushWebhookController } from './sync/drive-push-webhook.controller'
import { DriveSyncDiffService } from './sync/drive-sync-diff.service'
import { DriveSyncInternalController } from './sync/drive-sync-internal.controller'
import { DriveSyncService } from './sync/drive-sync.service'

@Module({
  imports: [ComposioModule],
  controllers: [
    GoogleDriveController,
    GoogleDriveFilesController,
    GoogleDriveDocumentExportController,
    DriveFolderMappingsController,
    DriveSyncInternalController,
    DrivePushWebhookController,
    DrivePushInternalController,
  ],
  providers: [
    GoogleDriveApiService,
    GoogleDriveAdminClientRepository,
    GoogleDriveComposioFilesService,
    GoogleDriveComposioMultiTabDocsService,
    GoogleDriveComposioPayloadService,
    GoogleDriveContentCacheService,
    GoogleDriveConnectionService,
    DriveFolderMappingsRepository,
    GoogleDriveRepository,
    DriveSyncDiffService,
    DriveSyncService,
  ],
  exports: [GoogleDriveApiService, DriveSyncService],
})
export class GoogleDriveModule {}
