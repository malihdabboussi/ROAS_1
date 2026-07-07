import { Module } from '@nestjs/common'
import { CustomFieldsController } from './controllers/custom-fields.controller'
import { CustomFieldsRepository } from './repositories/custom-fields.repository'
import { CustomFieldsService } from './services/custom-fields.service'

@Module({
  controllers: [CustomFieldsController],
  providers: [CustomFieldsService, CustomFieldsRepository],
  exports: [CustomFieldsService, CustomFieldsRepository],
})
export class CustomFieldsModule {}
