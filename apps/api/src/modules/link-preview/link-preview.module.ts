import { Module } from '@nestjs/common'
import { GoogleDriveModule } from '../integrations/google-drive/google-drive.module'
import { LinkPreviewController } from './controllers/link-preview.controller'
import { LinkPreviewRepository } from './repositories/link-preview.repository'
import { LinkPreviewService } from './services/link-preview.service'

@Module({
  imports: [GoogleDriveModule],
  controllers: [LinkPreviewController],
  providers: [LinkPreviewService, LinkPreviewRepository],
  exports: [LinkPreviewService],
})
export class LinkPreviewModule {}
