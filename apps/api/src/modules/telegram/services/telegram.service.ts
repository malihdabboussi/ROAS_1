import { TelegramServiceBase04 } from './telegram-service-04.base'
import { randomUUID } from 'crypto'
import { Injectable, Logger } from '@nestjs/common'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createResilientFetch, UserSessionMintService, withRetry } from '@vibey/api-shared'
import { DocumentExtractionService } from '../../brain/services/document-extraction.service'
import { ContactIdentifierService } from '../../leads/services/contact-identifier.service'
import { MachinesService } from '../../machines/services/machines.service'
import { UserAgentApiService } from '../../user-agent-api/services/user-agent-api.service'
import {
  isTelegramMessageNotModifiedError,
  TelegramApiIntegration,
} from '../integrations/telegram-api.integration'
import { TelegramRepository } from '../repositories/telegram.repository'
import { TelegramRuntimeRepository } from '../repositories/telegram-runtime.repository'
import type { TelegramBotInfo, TelegramMessage, TelegramUpdate } from '../types/telegram.types'

type TelegramAgentErrorCode =
  | 'temporary_unavailable'
  | 'busy'
  | 'no_answer'
  | 'workspace_blocked'
  | 'waking_up'

type TelegramAgentErrorMapping = {
  code: TelegramAgentErrorCode
  userMessage: string
  diagnostic: string
}

@Injectable()
export class TelegramService extends TelegramServiceBase04 {
  constructor(
    telegramApi: TelegramApiIntegration,
    telegramRepo: TelegramRepository,
    machinesService: MachinesService,
    userSessionMint: UserSessionMintService,
    documentExtraction: DocumentExtractionService,
    userAgentApi: UserAgentApiService,
    contactIdentifier: ContactIdentifierService,
    telegramRuntime: TelegramRuntimeRepository = new TelegramRuntimeRepository(),
  ) {
    super(
      telegramApi,
      telegramRepo,
      machinesService,
      userSessionMint,
      documentExtraction,
      userAgentApi,
      contactIdentifier,
      telegramRuntime,
    )
  }
}
