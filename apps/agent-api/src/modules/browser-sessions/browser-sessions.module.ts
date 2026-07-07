import { Module } from '@nestjs/common'
import { BrowserSessionsController } from './controllers/browser-sessions.controller'
import { BrowserSessionsRepository } from './repositories/browser-sessions.repository'
import { BrowserSessionsService } from './services/browser-sessions.service'

@Module({
  controllers: [BrowserSessionsController],
  providers: [BrowserSessionsRepository, BrowserSessionsService],
  exports: [BrowserSessionsService],
})
export class BrowserSessionsModule {}
