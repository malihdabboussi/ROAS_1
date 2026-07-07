import { Global, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { VaultController } from './controllers/vault.controller'
import { VaultRepository } from './repositories/vault.repository'
import { VaultService } from './services/vault.service'

@Global()
@Module({
  imports: [ConfigModule],
  controllers: [VaultController],
  providers: [VaultService, VaultRepository],
  exports: [VaultService],
})
export class VaultModule {}
