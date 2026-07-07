import { Module } from '@nestjs/common'
import { ClientErrorsController } from './controllers/client-errors.controller'

@Module({
  controllers: [ClientErrorsController],
})
export class ClientErrorsModule {}
