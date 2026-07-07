import { Global, Module } from '@nestjs/common'
import { DatabaseModule } from '../../lib/database.module'
import { QueueLoggerModule } from '../logger'
import { EmailProviderHelper } from './helpers/email-provider.helper'
import { GhlEmailHelper } from './helpers/ghl-email.helper'

@Global()
@Module({
  imports: [DatabaseModule, QueueLoggerModule],
  providers: [GhlEmailHelper, EmailProviderHelper],
  exports: [GhlEmailHelper, EmailProviderHelper],
})
export class SharedModule {}
