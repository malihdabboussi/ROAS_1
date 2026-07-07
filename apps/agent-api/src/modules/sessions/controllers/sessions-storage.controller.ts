import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
  Param,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common'
import type { Request } from 'express'
import { InternalAuthGuard } from '../../artifacts/guards/internal-auth.guard'
import { SessionsStorageService } from '../services/sessions-storage.service'

@Controller('sessions')
@UseGuards(InternalAuthGuard)
export class SessionsStorageController {
  private readonly logger = new Logger(SessionsStorageController.name)

  constructor(private readonly sessionsStorage: SessionsStorageService) {}

  @Put('transcript/:agentId/:sessionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async uploadTranscript(
    @Param('agentId') agentId: string,
    @Param('sessionId') sessionId: string,
    @Req() req: Request,
  ) {
    const chunks: Buffer[] = []
    for await (const chunk of req) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
    }
    const content = Buffer.concat(chunks).toString('utf-8')
    if (!content.trim()) return
    await this.sessionsStorage.uploadTranscript(agentId, sessionId, content)
  }

  @Get('transcript/:agentId/:sessionId')
  async downloadTranscript(
    @Param('agentId') agentId: string,
    @Param('sessionId') sessionId: string,
  ) {
    const content = await this.sessionsStorage.downloadTranscript(agentId, sessionId)
    if (content === null) throw new NotFoundException()
    return content
  }

  @Put('store/:agentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async uploadStore(@Param('agentId') agentId: string, @Req() req: Request) {
    const chunks: Buffer[] = []
    for await (const chunk of req) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
    }
    const content = Buffer.concat(chunks).toString('utf-8')
    if (!content.trim()) return
    await this.sessionsStorage.uploadStore(agentId, content)
  }

  @Get('store/:agentId')
  async downloadStore(@Param('agentId') agentId: string) {
    const content = await this.sessionsStorage.downloadStore(agentId)
    if (content === null) throw new NotFoundException()
    return content
  }
}
