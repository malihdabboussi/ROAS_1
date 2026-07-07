import { Module } from '@nestjs/common'
import { SharedModule } from '@vibey/api-shared'
import { BrowserSessionsController } from './controllers/browser-sessions.controller'
import { BrowserSessionsRepository } from './repositories/browser-sessions.repository'
import { BrowserSessionsCryptoService } from './services/browser-sessions-crypto.service'
import { BrowserSessionsMaintenanceService } from './services/browser-sessions-maintenance.service'
import { BrowserSessionsService } from './services/browser-sessions.service'

@Module({
  imports: [SharedModule],
  controllers: [BrowserSessionsController],
  providers: [
    BrowserSessionsCryptoService,
    BrowserSessionsService,
    BrowserSessionsMaintenanceService,
    BrowserSessionsRepository,
  ],
  exports: [BrowserSessionsCryptoService, BrowserSessionsMaintenanceService],
})
export class BrowserSessionsModule {}
