import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { RegisterWithInviteController, WaitlistController } from './controllers/waitlist.controller'
import { WaitlistRepository } from './repositories/waitlist.repository'
import { WaitlistService } from './services/waitlist.service'

@Module({
  imports: [ConfigModule],
  controllers: [WaitlistController, RegisterWithInviteController],
  providers: [WaitlistService, WaitlistRepository],
  exports: [WaitlistService],
})
export class WaitlistModule {}
