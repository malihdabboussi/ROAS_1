import { Module } from '@nestjs/common'
import { DmController } from './controllers/dm.controller'
import { HumanDmRepository } from './repositories/human-dm.repository'
import { DmService } from './services/dm.service'

@Module({
  controllers: [DmController],
  providers: [DmService, HumanDmRepository],
  exports: [DmService],
})
export class DmModule {}
