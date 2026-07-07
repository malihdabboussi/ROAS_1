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
import { AuthGuard, CurrentUser, OrgContextGuard, OrgRoleGuard } from '@vibey/api-shared'
import { BrainImportJobsService } from '../../../brain/services/brain-import-jobs.service'
import { ConnectFirefliesSchema, ListFirefliesTranscriptsSchema } from '../dto/fireflies.dto'
import { FirefliesApiService } from '../services/fireflies-api.service'

@Controller('integrations/fireflies')
export class FirefliesController {
  private readonly logger = new Logger(FirefliesController.name)

  constructor(
    private readonly api: FirefliesApiService,
    private readonly importJobs: BrainImportJobsService,
  ) {}

  @Get('status')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async status(@CurrentUser() user: { id: string }) {
    const result = await this.api.getStatus(user.id)
    return { success: true, ...result }
  }

  @Post('connect')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async connect(@CurrentUser() user: { id: string }, @Body() body: unknown) {
    const validation = ConnectFirefliesSchema.safeParse(body)
    if (!validation.success) {
      throw new HttpException(
        { success: false, error: 'Invalid request', details: validation.error.flatten() },
        HttpStatus.BAD_REQUEST,
      )
    }
    const result = await this.api.connect(user.id, validation.data.apiKey)
    return { success: true, ...result }
  }

  @Post('disconnect')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async disconnect(@CurrentUser() user: { id: string }) {
    await this.api.disconnect(user.id)
    return { success: true }
  }

  @Get('transcripts')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async listTranscripts(
    @CurrentUser() user: { id: string },
    @Query() query: Record<string, string | undefined>,
  ) {
    const validation = ListFirefliesTranscriptsSchema.safeParse(query)
    if (!validation.success) {
      throw new HttpException(
        { success: false, error: 'Invalid request', details: validation.error.flatten() },
        HttpStatus.BAD_REQUEST,
      )
    }
    const transcripts = await this.api.listTranscripts(user.id, validation.data)
    return { success: true, transcripts }
  }

  @Get('transcripts/:id')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async getTranscript(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    const transcript = await this.api.getTranscript(user.id, id)
    return { success: true, transcript }
  }

  @Get('user')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async getUser(@CurrentUser() user: { id: string }) {
    const ffUser = await this.api.getUser(user.id)
    return { success: true, user: ffUser }
  }

  @Post('transcripts/:id/import')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  @HttpCode(HttpStatus.ACCEPTED)
  async importTranscript(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    const queued = await this.importJobs.enqueueFirefliesTranscriptImport(user.id, id)
    return { success: true, ...queued }
  }

  @Post('sync')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async syncTranscripts(@CurrentUser() user: { id: string }) {
    const transcripts = await this.api.listTranscripts(user.id, { limit: 20 })
    let synced = 0
    let skipped = 0

    for (const t of transcripts) {
      const sessionKey = `fireflies:${t.id}`
      if (await this.api.hasSyncedTranscript(sessionKey)) {
        skipped++
        continue
      }

      try {
        await this.importJobs.enqueueFirefliesTranscriptImport(user.id, t.id)

        synced++
      } catch (e) {
        this.logger.error(`Failed to sync transcript ${t.id}: ${e}`)
      }
    }

    return { success: true, synced, skipped, total: transcripts.length }
  }
}
