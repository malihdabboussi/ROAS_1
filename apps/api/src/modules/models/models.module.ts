import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ModelsController } from './controllers/models.controller'
import { ModelsRepository } from './repositories/models.repository'
import { ModelsService } from './services/models.service'

@Module({
  imports: [ConfigModule],
  controllers: [ModelsController],
  providers: [ModelsService, ModelsRepository],
  exports: [ModelsService],
})
export class ModelsModule {}
