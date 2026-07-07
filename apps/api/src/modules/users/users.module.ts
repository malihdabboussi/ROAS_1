import { Module } from '@nestjs/common'
import { ProfileController } from './controllers/profile.controller'
import { SettingsController } from './controllers/settings.controller'
import { UsersController } from './controllers/users.controller'
import { UsersRepository } from './repositories/users.repository'
import { ProfileService } from './services/profile.service'
import { SettingsService } from './services/settings.service'
import { UsersService } from './services/users.service'

@Module({
  controllers: [UsersController, ProfileController, SettingsController],
  providers: [UsersService, ProfileService, SettingsService, UsersRepository],
  exports: [UsersService],
})
export class UsersModule {}
