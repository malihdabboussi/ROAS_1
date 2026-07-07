import { Module } from '@nestjs/common'
import { SharedModule } from '@vibey/api-shared'
import { SessionsStorageController } from './controllers/sessions-storage.controller'
import { SessionsStorageRepository } from './repositories/sessions-storage.repository'
import { SessionsStorageService } from './services/sessions-storage.service'

@Module({
  imports: [SharedModule],
  controllers: [SessionsStorageController],
  providers: [SessionsStorageRepository, SessionsStorageService],
})
export class SessionsModule {}
