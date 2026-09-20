import { Controller, Param, Post, Req, Res, type RawBodyRequest } from '@nestjs/common'
import type { Request, Response } from 'express'
import { MeetingIntakeService } from '../services/meeting-intake.service'

/**
 * The one front door for every note taker. The URL names the provider and the
 * connection; the provider adapter verifies the signature; no auth guard here
 * because the caller is the provider, not a user.
 */
@Controller('integrations/meetings')
export class MeetingWebhooksController {
  constructor(private readonly intake: MeetingIntakeService) {}

  @Post('webhooks/:provider/:connectionKey')
  async receive(
    @Param('provider') provider: string,
    @Param('connectionKey') connectionKey: string,
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
  ) {
    const rawBody =
      req.rawBody ??
      Buffer.from(typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {}), 'utf8')
    const headers: Record<string, string | undefined> = {}
    for (const [key, value] of Object.entries(req.headers)) {
      headers[key.toLowerCase()] = Array.isArray(value) ? value[0] : value
    }
    const result = await this.intake.handleWebhook({ provider, connectionKey, rawBody, headers })
    return res.status(result.status).json(result.body)
  }
}
