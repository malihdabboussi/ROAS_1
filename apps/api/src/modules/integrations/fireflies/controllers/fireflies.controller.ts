import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Logger,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  AuthGuard,
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  Supabase,
  type RequestScope,
} from '@vibey/api-shared'
import { CreditsGuard } from '../../../billing/guards/credits.guard'
import { MeetingImportService } from '../../../meetings/intake/services/meeting-import.service'
import { MeetingsSpaceBootstrapService } from '../../../meetings/intake/services/meetings-space-bootstrap.service'
import {
  ConnectFirefliesSchema,
  ListFirefliesTranscriptsSchema,
  UpdateFirefliesWebhookSecretSchema,
} from '../dto/fireflies.dto'
import { FirefliesApiService } from '../services/fireflies-api.service'

@Controller('integrations/fireflies')
@UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
export class FirefliesController {
  private readonly logger = new Logger(FirefliesController.name)

  constructor(
    private readonly api: FirefliesApiService,
    private readonly meetingImport: MeetingImportService,
    private readonly meetingsSpace: MeetingsSpaceBootstrapService,
  ) {}

  @Get('status')
  async status(@CurrentUser() user: { id: string }) {
    const result = await this.api.getStatus(user.id)
    return { success: true, ...result }
  }

  @Post('connect')
  async connect(
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Supabase() supabase: SupabaseClient,
    @Body() body: unknown,
  ) {
    const validation = ConnectFirefliesSchema.safeParse(body)
    if (!validation.success) throw invalidRequest(validation.error.flatten())
    const result = await this.api.connect(
      user.id,
      validation.data.apiKey,
      validation.data.webhookSecret,
    )
    // Meetings from Fireflies land in the same Meetings space Fathom uses.
    await this.meetingsSpace.ensureMeetingsSpaceQuietly(supabase, scope)
    return { success: true, ...result }
  }

  @Post('webhook-secret')
  async updateWebhookSecret(@CurrentUser() user: { id: string }, @Body() body: unknown) {
    const validation = UpdateFirefliesWebhookSecretSchema.safeParse(body)
    if (!validation.success) throw invalidRequest(validation.error.flatten())
    const result = await this.api.updateWebhookSecret(user.id, validation.data.webhookSecret)
    return { success: true, ...result }
  }

  @Post('disconnect')
  async disconnect(@CurrentUser() user: { id: string }) {
    await this.api.disconnect(user.id)
    return { success: true }
  }

  @Get('transcripts')
  async listTranscripts(
    @CurrentUser() user: { id: string },
    @Query() query: Record<string, string | undefined>,
  ) {
    const validation = ListFirefliesTranscriptsSchema.safeParse(query)
    if (!validation.success) throw invalidRequest(validation.error.flatten())
    const transcripts = await this.api.listTranscripts(user.id, validation.data)
    return { success: true, transcripts }
  }

  @Get('transcripts/:id')
  async getTranscript(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    const transcript = await this.api.getTranscript(user.id, id)
    return { success: true, transcript }
  }

  @Get('user')
  async getUser(@CurrentUser() user: { id: string }) {
    const ffUser = await this.api.getUser(user.id)
    return { success: true, user: ffUser }
  }

  /** Brain-only import of one transcript through the shared meeting import path. */
  @Post('transcripts/:id/import')
  @UseGuards(CreditsGuard)
  @HttpCode(HttpStatus.ACCEPTED)
  async importTranscript(
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Supabase() supabase: SupabaseClient,
    @Param('id') id: string,
  ) {
    return this.meetingImport.importToBrain({
      provider: 'fireflies',
      userId: user.id,
      scope,
      supabase,
      externalId: id,
    })
  }

  @Post('sync')
  @UseGuards(CreditsGuard)
  async syncTranscripts(
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Supabase() supabase: SupabaseClient,
  ) {
    const transcripts = await this.api.listTranscripts(user.id, { limit: 20 })
    let synced = 0
    let skipped = 0

    for (const t of transcripts) {
      if (await this.api.hasSyncedTranscript(`fireflies:${t.id}`)) {
        skipped++
        continue
      }
      try {
        await this.meetingImport.importToBrain({
          provider: 'fireflies',
          userId: user.id,
          scope,
          supabase,
          externalId: String(t.id),
        })
        synced++
      } catch (e) {
        this.logger.error(`Failed to sync transcript ${t.id}: ${e}`)
      }
    }

    return { success: true, synced, skipped, total: transcripts.length }
  }
}

function invalidRequest(details: unknown): HttpException {
  return new HttpException(
    { success: false, error: 'Invalid request', details },
    HttpStatus.BAD_REQUEST,
  )
}
