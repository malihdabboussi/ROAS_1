import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ErrorReporter } from '@vibey/api-shared'
import { MetaIntegrationFetchWebhookBase } from './meta-integration-fetch-webhook.base'

@Injectable()
export class MetaIntegration extends MetaIntegrationFetchWebhookBase {
  constructor(config: ConfigService, errorReporter: ErrorReporter) {
    super(config, errorReporter)
  }
}
