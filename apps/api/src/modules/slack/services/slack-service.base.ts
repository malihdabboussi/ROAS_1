import { Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { SupabaseClient } from '@supabase/supabase-js'
import { UserSessionMintService } from '@vibey/api-shared'
import { DocumentExtractionService } from '../../brain/services/document-extraction.service'
import { UserAgentApiService } from '../../user-agent-api/services/user-agent-api.service'
import { SlackApiIntegration } from '../integrations/slack-api.integration'
import { SlackRuntimeRepository } from '../repositories/slack-runtime.repository'
import { SlackRepository } from '../repositories/slack.repository'
import type { PendingInstallTokens } from './slack-service.shared'

export abstract class SlackServiceBase {
  protected readonly logger = new Logger('SlackService')
  protected readonly eventDedupe = new Map<string, number>()
  protected readonly eventDedupeTtlMs = 10 * 60 * 1000
  protected readonly pendingInstalls = new Map<string, PendingInstallTokens>()
  protected readonly tokenRefreshInFlight = new Map<
    string,
    Promise<{ accessToken: string; refreshToken: string | null }>
  >()

  constructor(
    protected readonly slackApi: SlackApiIntegration,
    protected readonly slackRepo: SlackRepository,
    protected readonly slackRuntimeRepo: SlackRuntimeRepository,
    protected readonly config: ConfigService,
    protected readonly userSessionMint: UserSessionMintService,
    protected readonly documentExtraction: DocumentExtractionService,
    protected readonly userAgentApi: UserAgentApiService,
  ) {}

  protected getServiceRoleClient(): SupabaseClient {
    return this.slackRuntimeRepo.getServiceRoleClient()
  }
}
