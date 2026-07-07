import { Global, Module } from '@nestjs/common'
import { ErrorReporter } from './services/error-reporter.service'
import { SupabaseServiceClient } from './services/supabase-service-client.provider'

@Global()
@Module({
  providers: [SupabaseServiceClient, ErrorReporter],
  exports: [SupabaseServiceClient, ErrorReporter],
})
export class AppErrorsModule {}
