import { Injectable } from '@nestjs/common'
import { SlackApiIntegrationHistorySearchBase } from './slack-api-integration-history-search.base'

export { isSlackAuthError, SlackAuthError } from './slack-api-integration.shared'

@Injectable()
export class SlackApiIntegration extends SlackApiIntegrationHistorySearchBase {}
