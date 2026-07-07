import { Module } from '@nestjs/common'
import { YourTurnController } from './controllers/your-turn.controller'
import { YourTurnRepository } from './repositories/your-turn.repository'
import { YourTurnService } from './services/your-turn.service'

@Module({
  controllers: [YourTurnController],
  providers: [YourTurnService, YourTurnRepository],
  exports: [YourTurnService],
})
export class YourTurnModule {}
